import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import { Loader, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

const CHECKOUT_FORM_KEY = 'opulent_checkout_form';

// Paystack Public Key from Environment Variables
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [formData, setFormData] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        zoneId: '',
        deliveryType: 'delivery' as 'delivery' | 'pickup',
      };
    }
    try {
      const stored = window.sessionStorage.getItem(CHECKOUT_FORM_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          firstName: string;
          lastName: string;
          email: string;
          phone: string;
          address: string;
          zoneId: string;
          deliveryType?: 'delivery' | 'pickup';
        };
        return {
          firstName: parsed.firstName ?? '',
          lastName: parsed.lastName ?? '',
          email: parsed.email ?? '',
          phone: parsed.phone ?? '',
          address: parsed.address ?? '',
          zoneId: parsed.zoneId ?? '',
          deliveryType: parsed.deliveryType ?? 'delivery',
        };
      }
    } catch {
      // ignore storage errors
    }
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      zoneId: '',
      deliveryType: 'delivery',
    };
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const fetchZones = async () => {
      const { data } = await supabase
        .from('delivery_zones')
        .select('id, name, fee')
        .eq('active', true);
      if (data) setZones(data);
    };
    fetchZones();
  }, [items, navigate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify(formData));
    } catch {
      // ignore storage errors
    }
  }, [formData]);

  const isDelivery = formData.deliveryType === 'delivery';
  const selectedZone = zones.find(z => z.id === formData.zoneId);
  const shippingFee = isDelivery && selectedZone ? selectedZone.fee : 0;
  const grandTotal = totalPrice + shippingFee;

  const handlePaystackSuccess = async (reference: string) => {
    try {
      const verifyRes = await fetch('/api/payments/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      
      const verifyData = await verifyRes.json();
      
      if (verifyRes.ok && verifyData.status === 'success') {
        clearCart();
        window.sessionStorage.removeItem(CHECKOUT_FORM_KEY);
        navigate('/success');
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('An error occurred while verifying payment. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackClose = () => {
    alert('Payment cancelled.');
    setLoading(false);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!PAYSTACK_PUBLIC_KEY) {
      alert('Paystack Public Key is missing. Please configure it in your environment variables.');
      setLoading(false);
      return;
    }

    try {
      if (isDelivery && (!formData.zoneId || !formData.address.trim())) {
        alert('Please select a delivery zone and enter your delivery address.');
        setLoading(false);
        return;
      }

      // 1. Create Order on Backend
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: items,
          customerInfo: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
          },
          deliveryType: formData.deliveryType,
          deliveryZoneId: isDelivery ? formData.zoneId : null,
          deliveryAddress: isDelivery ? formData.address : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Order creation failed');
      }

      const { reference, amount, email } = data;

      // 2. Initialize Paystack Popup
      const handler = (window as any).PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: amount, // in kobo
        currency: 'KES',
        ref: reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: `${formData.firstName} ${formData.lastName}`
            }
          ]
        },
        callback: function(response: any) {
          handlePaystackSuccess(response.reference);
        },
        onClose: function() {
          handlePaystackClose();
        }
      });

      handler.openIframe();

    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-20">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-accent mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
          {/* Left Column: Details & Payment */}
          <div className="space-y-6">
            
            {/* 1. Contact & Delivery */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs">1</span>
                Contact & Delivery
              </h2>
              
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      required
                      type="text"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      required
                      type="text"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label
                    className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 text-xs transition-all ${
                      isDelivery ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      value="delivery"
                      checked={isDelivery}
                      onChange={() => setFormData({ ...formData, deliveryType: 'delivery' })}
                      className="w-4 h-4 text-accent focus:ring-accent"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Delivery</div>
                      <div className="text-[11px] text-gray-500">Have your order brought to your address.</div>
                    </div>
                  </label>

                  <label
                    className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 text-xs transition-all ${
                      !isDelivery ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      value="pickup"
                      checked={!isDelivery}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          deliveryType: 'pickup',
                        })
                      }
                      className="w-4 h-4 text-accent focus:ring-accent"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Pick up</div>
                      <div className="text-[11px] text-gray-500">
                        Collect from Two Rivers Mall, Nairobi (10am – 7pm daily).
                      </div>
                    </div>
                  </label>
                </div>

                {isDelivery && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Zone</label>
                      <select
                        required={isDelivery}
                        value={formData.zoneId}
                        onChange={e => setFormData({ ...formData, zoneId: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm bg-white"
                      >
                        <option value="">Select a delivery zone</option>
                        {zones.map(zone => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name} - KSh {zone.fee}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Address</label>
                      <textarea
                        required={isDelivery}
                        rows={3}
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street, House/Apt Number, Landmarks..."
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                      />
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Security Note */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                Secure checkout powered by Paystack. Your payment information is encrypted and processed securely.
              </p>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h3 className="font-serif font-bold text-xl text-accent mb-6">Order Summary</h3>
              
              {/* Product Breakdown */}
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-md overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500 mb-1">{item.quantity} x KSh {item.price.toLocaleString()}</p>
                      <p className="text-sm font-semibold text-accent">KSh {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3 mb-6">
                <div className="flex justify-between text-sm text-gray-800">
                  <span>Subtotal</span>
                  <span>KSh {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-800">
                  <span>Shipping</span>
                  <span>{isDelivery && selectedZone ? `KSh ${selectedZone.fee}` : '--'}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-accent pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>KSh {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={loading}
                className="w-full py-4 bg-accent text-white font-medium rounded-full hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Place Order & Pay
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-center text-gray-500 mt-4">
                By placing this order, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
