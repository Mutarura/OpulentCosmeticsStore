import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';

export const Cart: React.FC = () => {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Check for payment success
    const status = searchParams.get('status');
    if (status === 'completed') {
      clearCart();
    }
  }, [searchParams, clearCart]);

  if (searchParams.get('status') === 'completed') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-serif font-bold text-accent mb-4">Thank You!</h2>
        <p className="text-gray-500 mb-8">Your order has been placed successfully. You will receive an email confirmation shortly.</p>
        <Link to="/" className="px-8 py-3 bg-accent text-white rounded-full hover:bg-gray-800 transition-colors">
          Continue Shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-serif font-bold text-accent mb-4">Your Cart is Empty</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
        <Link to="/" className="px-8 py-3 bg-accent text-white rounded-full hover:bg-gray-800 transition-colors">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-12 pb-20">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-accent mb-12 text-center">Your Shopping Bag</h1>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cart Items */}
          <div className="flex-1 space-y-8">
            {items.map(item => (
              <div key={item.id} className="flex gap-6 py-6 border-b border-gray-100 last:border-0">
                <Link to={`/product/${item.id}`} className="w-24 h-32 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </Link>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/product/${item.id}`} className={`font-serif font-medium text-lg ${item.category === 'Her' ? 'text-theme-pink' : 'text-theme-teal'} hover:text-secondary transition-colors`}>
                        {item.name}
                      </Link>
                      <p className="text-sm text-gray-400 mt-1">{item.category === 'Her' ? 'For Her' : 'For Him'}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex items-center border border-gray-200 rounded-full h-10">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className={`w-10 h-full flex items-center justify-center text-gray-500 ${item.category === 'Her' ? 'hover:text-theme-pink' : 'hover:text-theme-teal'}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`w-8 text-center text-sm font-medium ${item.category === 'Her' ? 'text-theme-pink' : 'text-theme-teal'}`}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className={`w-10 h-full flex items-center justify-center text-gray-500 ${item.category === 'Her' ? 'hover:text-theme-pink' : 'hover:text-theme-teal'}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className={`font-medium text-lg ${item.category === 'Her' ? 'text-theme-pink' : 'text-theme-teal'}`}>KSh {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}

            <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-accent mt-4">
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:w-96">
            <div className="bg-gray-50 p-8 rounded-2xl sticky top-24">
              <h3 className="font-serif font-bold text-xl text-accent mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>KSh {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between font-bold text-lg text-accent">
                  <span>Total</span>
                  <span>KSh {totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <Link 
                to="/checkout"
                className="block w-full py-4 bg-accent text-white font-medium text-center rounded-full hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all mb-4"
              >
                Proceed to Checkout
              </Link>
              
              <p className="text-xs text-center text-gray-400">
                Secure checkout powered by Pesapal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
