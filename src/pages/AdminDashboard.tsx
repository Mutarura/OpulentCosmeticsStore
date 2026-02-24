import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const PRODUCT_IMAGES_BUCKET = 'product-images';
const BANNER_IMAGES_BUCKET = 'banner-images';

interface Kpis {
  totalOrders: number;
  pendingDeliveries: number;
  totalRevenue: number;
  lowStockItems: number;
}

type AdminTab =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'banners'
  | 'delivery_zones'
  | 'customers'
  | 'settings';

interface ProductRow {
  id: string;
  name: string;
  category: 'his' | 'hers';
  subcategory: string | null;
  price: number;
  discount_price: number | null;
  sizes: string[] | null;
  active: boolean;
  description?: string | null;
  is_bundle?: boolean;
}

interface BannerRow {
  id: string;
  section: 'his' | 'hers';
  image_path: string;
  headline: string | null;
  subtext: string | null;
  cta_text: string | null;
  cta_link: string | null;
  active: boolean;
  sort_order: number;
}

interface DeliveryZoneRow {
  id: string;
  name: string;
  fee: number;
  active: boolean;
}

interface InventoryRow {
  id: string;
  product_id: string;
  size: string | null;
  quantity: number;
  low_stock_threshold: number;
  products?: {
    name: string;
  } | null;
}

type OrderStatus = 'Pending' | 'Paid' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Failed';

interface OrderRow {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address?: string;
  pesapal_order_tracking_id?: string;
  pesapal_merchant_reference?: string;
}

interface CustomerSummary {
  email: string;
  name: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [kpis, setKpis] = useState<Kpis>({
    totalOrders: 0,
    pendingDeliveries: 0,
    totalRevenue: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/admin/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        await supabase.auth.signOut();
        navigate('/admin/login');
        return;
      }

      const { count: totalOrdersCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      const { count: pendingDeliveriesCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['Paid', 'Preparing', 'Out for Delivery']);

      const { data: revenueRows } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'Paid');

      const { data: inventoryRows } = await supabase
        .from('inventory')
        .select('id, quantity, low_stock_threshold');

      const revenueData = (revenueRows ?? []) as { total_amount: number | null }[];
      const totalRevenue = revenueData.reduce(
        (sum, row) => sum + Number(row.total_amount ?? 0),
        0
      );

      const inventoryData = (inventoryRows ?? []) as {
        quantity: number;
        low_stock_threshold: number;
      }[];
      const lowStockItems = inventoryData.filter(
        row => Number(row.quantity) <= Number(row.low_stock_threshold)
      ).length;

      setKpis({
        totalOrders: totalOrdersCount ?? 0,
        pendingDeliveries: pendingDeliveriesCount ?? 0,
        totalRevenue,
        lowStockItems,
      });

      setLoading(false);
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center">
        <h1 className="text-lg md:text-xl font-serif font-bold text-accent">Admin Dashboard</h1>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/admin/login');
          }}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Logout
        </button>
      </header>

      <main className="px-4 py-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <div className="flex gap-2 flex-nowrap md:flex-wrap overflow-x-auto pb-2 -mx-1 px-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Products' },
              { id: 'inventory', label: 'Inventory' },
              { id: 'orders', label: 'Orders' },
              { id: 'banners', label: 'Banners' },
              { id: 'delivery_zones', label: 'Delivery Zones' },
              { id: 'customers', label: 'Customers' },
              { id: 'settings', label: 'Settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-accent hover:text-accent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-4">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500">Total Orders</p>
              <p className="mt-2 text-2xl font-semibold text-accent">{kpis.totalOrders}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500">Pending Deliveries</p>
              <p className="mt-2 text-2xl font-semibold text-accent">{kpis.pendingDeliveries}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-accent">
                KSh {kpis.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500">Low-stock Items</p>
              <p className="mt-2 text-2xl font-semibold text-accent">{kpis.lowStockItems}</p>
            </div>
          </div>
        )}

        {activeTab === 'products' && <ProductsSection />}
        {activeTab === 'inventory' && <InventorySection />}
        {activeTab === 'orders' && <OrdersSection />}
        {activeTab === 'banners' && <BannersSection />}
        {activeTab === 'delivery_zones' && <DeliveryZonesSection />}
        {activeTab === 'customers' && <CustomersSection />}
        {activeTab === 'settings' && <SettingsSection />}
      </main>
    </div>
  );
};

const ProductsSection: React.FC = () => {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'hers' as 'his' | 'hers',
    subcategory: 'Skincare',
    price: '',
    discount_price: '',
    discount_percent: '',
    discount_mode: 'amount' as 'amount' | 'percent',
    sizesInput: '',
    active: true,
    description: '',
    is_bundle: false,
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    
    // Try to fetch with new fields first (excluding description for list performance)
    const { data, error: queryError } = await supabase
      .from('products')
      .select(
        'id, name, category, subcategory, price, discount_price, sizes, active, is_bundle'
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      // If it fails (likely due to missing columns), fall back to basic fields
      console.warn('Failed to load product list, falling back to basic fields:', queryError);
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('products')
        .select(
          'id, name, category, subcategory, price, discount_price, sizes, active'
        )
        .order('created_at', { ascending: false });

      if (fallbackError) {
        setError(fallbackError.message);
        setItems([]);
      } else {
        setItems((fallbackData ?? []) as ProductRow[]);
      }
    } else {
      setItems((data ?? []) as ProductRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      category: 'hers',
      subcategory: 'Skincare',
      price: '',
      discount_price: '',
      discount_percent: '',
      discount_mode: 'amount',
      sizesInput: '',
      active: true,
      description: '',
      is_bundle: false,
    });
    setImageFile(null);
  };

  const handleEdit = async (row: ProductRow) => {
    setEditingId(row.id);
    const hasDiscount =
      row.discount_price != null && row.discount_price !== 0 && row.discount_price < row.price;
    const percent =
      hasDiscount && row.price
        ? Math.round((1 - Number(row.discount_price) / Number(row.price)) * 100)
        : undefined;

    setForm({
      name: row.name,
      category: row.category,
      subcategory: row.subcategory ?? 'Skincare',
      price: row.price.toString(),
      discount_price: hasDiscount && row.discount_price != null ? row.discount_price.toString() : '',
      discount_percent: percent != null && Number.isFinite(percent) ? String(percent) : '',
      discount_mode: 'amount',
      sizesInput: row.sizes ? row.sizes.join(', ') : '',
      active: row.active,
      description: row.description ?? '',
      is_bundle: row.is_bundle ?? false,
    });
    setImageFile(null);

    // Fetch full description if not present (optimization)
    if (row.description === undefined) {
      const { data } = await supabase
        .from('products')
        .select('description')
        .eq('id', row.id)
        .maybeSingle();
        
      if (data) {
        setForm(prev => ({ ...prev, description: data.description || '' }));
      }
    }
  };

  const handleImageUpload = async (productId: string) => {
    if (!imageFile) {
      return;
    }

    const extension = imageFile.name.split('.').pop() ?? 'jpg';
    const fileName = `${productId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);

    const { error: insertError } = await supabase.from('product_images').insert({
      product_id: productId,
      storage_path: fileName,
      is_primary: true,
    });

    if (insertError) {
      setError(insertError.message);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const priceValue = Number(form.price || 0);
    let discountValue: number | null = null;

    if (form.discount_mode === 'amount') {
      if (form.discount_price) {
        const amount = Number(form.discount_price);
        if (!Number.isNaN(amount) && amount > 0 && amount < priceValue) {
          discountValue = amount;
        }
      }
    } else if (form.discount_mode === 'percent') {
      if (form.discount_percent) {
        const percent = Number(form.discount_percent);
        if (!Number.isNaN(percent) && percent > 0 && percent < 100 && priceValue > 0) {
          const discounted = priceValue * (1 - percent / 100);
          discountValue = Number(discounted.toFixed(2));
        }
      }
    }

    const sizesArray = form.sizesInput
      ? form.sizesInput.split(',').map(value => value.trim()).filter(Boolean)
      : [];

    const payload = {
      name: form.name,
      category: form.category,
      subcategory: form.subcategory || null,
      price: priceValue,
      discount_price: discountValue,
      sizes: sizesArray,
      active: form.active,
      description: form.description,
      is_bundle: form.is_bundle,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        // Fallback: try updating without new fields if column error
        if (updateError.message?.includes('column')) {
           const { description, is_bundle, ...basicPayload } = payload; // eslint-disable-line @typescript-eslint/no-unused-vars
           const { error: retryError } = await supabase
            .from('products')
            .update(basicPayload)
            .eq('id', editingId);
            
           if (retryError) {
             setError(retryError.message);
             setSaving(false);
             return;
           } else {
             setError('Note: Description and Bundle status were not saved (Database columns missing).');
           }
        } else {
          setError(updateError.message);
          setSaving(false);
          return;
        }
      }

      if (imageFile) {
        await handleImageUpload(editingId);
      }
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single();

      if (insertError) {
         // Fallback: try inserting without new fields if column error
         if (insertError.message?.includes('column')) {
            const { description, is_bundle, ...basicPayload } = payload; // eslint-disable-line @typescript-eslint/no-unused-vars
            const { data: retryData, error: retryError } = await supabase
              .from('products')
              .insert(basicPayload)
              .select('id')
              .single();
              
            if (retryError || !retryData) {
              setError(retryError?.message ?? 'Failed to create product');
              setSaving(false);
              return;
            }
            
            const newProductId = retryData.id as string;
            if (imageFile) {
              await handleImageUpload(newProductId);
            }
            setError('Note: Description and Bundle status were not saved (Database columns missing).');
         } else {
            setError(insertError.message);
            setSaving(false);
            return;
         }
      } else if (insertData) {
        const newProductId = insertData.id as string;
        if (imageFile) {
          await handleImageUpload(newProductId);
        }
      }
    }

    await loadProducts();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }
    await loadProducts();
    setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="text-sm font-semibold text-accent mb-4">
          {editingId ? 'Edit Product' : 'Add Product'}
        </h2>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={event => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (Visible on Product Page)</label>
            <textarea
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              rows={3}
              placeholder="Enter product description here..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={event =>
                  setForm({ ...form, category: event.target.value as 'his' | 'hers' })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="hers">For Her</option>
                <option value="his">For Him</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Subcategory
              </label>
              <select
                value={form.subcategory}
                onChange={event =>
                  setForm({
                    ...form,
                    subcategory: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="Skincare">Skincare</option>
                <option value="Perfumes">Perfumes</option>
                <option value="Body Essentials">Body Essentials</option>
                <option value="Grooming">Grooming</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Price (KSh)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={event => setForm({ ...form, price: event.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-gray-600">
                  Discount
                </label>
                <select
                  value={form.discount_mode}
                  onChange={event =>
                    setForm({
                      ...form,
                      discount_mode: event.target.value as 'amount' | 'percent',
                    })
                  }
                  className="rounded-full border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                >
                  <option value="amount">KSh</option>
                  <option value="percent">% off</option>
                </select>
              </div>
              {form.discount_mode === 'amount' ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_price}
                  onChange={event =>
                    setForm({
                      ...form,
                      discount_price: event.target.value,
                    })
                  }
                  placeholder="Discounted price"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              ) : (
                <div className="space-y-1">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    step="1"
                    value={form.discount_percent}
                    onChange={event =>
                      setForm({
                        ...form,
                        discount_percent: event.target.value,
                      })
                    }
                    placeholder="Discount %"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <p className="text-[10px] text-gray-500">
                    {(() => {
                      const base = Number(form.price || 0);
                      const percent = Number(form.discount_percent || 0);
                      if (base > 0 && percent > 0 && percent < 100) {
                        const discounted = base * (1 - percent / 100);
                        return `Will charge KSh ${Math.round(discounted).toLocaleString()}`;
                      }
                      return 'Set a percentage to auto-calc discount price';
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sizes (e.g. 50ml, 100g)
            </label>
            <input
              type="text"
              value={form.sizesInput}
              onChange={event =>
                setForm({
                  ...form,
                  sizesInput: event.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="50ml, 100g"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Product Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={event => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
              }}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-accent file:text-white hover:file:bg-gray-900"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.active}
                onChange={event =>
                  setForm({
                    ...form,
                    active: event.target.checked,
                  })
                }
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              Active on storefront
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.is_bundle}
                onChange={event =>
                  setForm({
                    ...form,
                    is_bundle: event.target.checked,
                  })
                }
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              Is a Bundle
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.is_bundle}
                onChange={event =>
                  setForm({
                    ...form,
                    is_bundle: event.target.checked,
                  })
                }
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              Is Bundle
            </label>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-accent">Products</h2>
          <button
            type="button"
            onClick={loadProducts}
            className="text-xs text-gray-500 hover:text-accent"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-xs text-gray-500">Loading products...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-500">No products found.</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Discount</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-800">{row.name}</td>
                  <td className="py-2 pr-4 capitalize text-gray-600">
                    {row.category === 'hers' ? 'For Her' : 'For Him'}
                  </td>
                  <td className="py-2 pr-4 text-gray-800">
                    KSh {Number(row.price).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {row.discount_price != null && row.discount_price !== 0
                      ? `KSh ${Number(row.discount_price).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        row.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-2 pr-0 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="text-[11px] text-accent hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const InventorySection: React.FC = () => {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_id: '',
    size: '',
    quantity: '',
    low_stock_threshold: '5',
  });

  const loadInventory = async () => {
    setLoading(true);
    setError(null);

    // 1. Fetch Products (Robust)
    let fetchedProducts: ProductRow[] = [];
    const { data: productRows, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, subcategory, price, discount_price, sizes, active')
      .order('name');

    if (productsError) {
      console.warn('Inventory: Failed to load products with subcategory/sizes', productsError);
      // Fallback fetch
      const { data: fallbackProducts, error: fallbackError } = await supabase
        .from('products')
        .select('id, name, category, price, active')
        .order('name');
        
      if (fallbackError) {
        setError(`Failed to load products: ${fallbackError.message}`);
      } else {
        fetchedProducts = (fallbackProducts ?? []) as ProductRow[];
      }
    } else {
      fetchedProducts = (productRows ?? []) as ProductRow[];
    }
    setProducts(fetchedProducts);

    // 2. Fetch Inventory (Robust)
    const { data: inventoryRows, error: inventoryError } = await supabase
      .from('inventory')
      .select(
        'id, product_id, size, quantity, low_stock_threshold, products(name)'
      )
      .order('updated_at', { ascending: false });

    if (inventoryError) {
      console.warn('Inventory: Failed to load inventory with join', inventoryError);
      // Fallback: try without join or extra fields
      const { data: fallbackInventory, error: fallbackInvError } = await supabase
        .from('inventory')
        .select('id, product_id, quantity, low_stock_threshold')
        .order('updated_at', { ascending: false });

      if (fallbackInvError) {
         setError(prev => prev ? `${prev} | Inventory error: ${fallbackInvError.message}` : `Inventory error: ${fallbackInvError.message}`);
         setItems([]);
      } else {
         setItems((fallbackInventory ?? []) as InventoryRow[]);
      }
    } else {
      setItems((inventoryRows ?? []) as unknown as InventoryRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadInventory();
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      product_id: '',
      size: '',
      quantity: '',
      low_stock_threshold: '5',
    });
  };

  const handleEdit = (row: InventoryRow) => {
    setEditingId(row.id);
    setForm({
      product_id: row.product_id,
      size: row.size ?? '',
      quantity: row.quantity.toString(),
      low_stock_threshold: row.low_stock_threshold.toString(),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const quantityValue = Number(form.quantity || 0);
    const thresholdValue = Number(form.low_stock_threshold || 0);

    const payload = {
      product_id: form.product_id,
      size: form.size || null,
      quantity: quantityValue,
      low_stock_threshold: thresholdValue,
    };

    if (!form.product_id) {
      setError('Select a product for this inventory entry');
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update(payload)
        .eq('id', editingId);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('inventory').insert(payload);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    await loadInventory();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase.from('inventory').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }
    await loadInventory();
    setSaving(false);
  };

  const productNameFor = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown product';
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="text-sm font-semibold text-accent mb-4">
          {editingId ? 'Edit Inventory' : 'Add Inventory'}
        </h2>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
            <select
              value={form.product_id}
              onChange={event =>
                setForm({
                  ...form,
                  product_id: event.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              required
            >
              <option value="">Select product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.category === 'hers' ? '(Her)' : '(Him)'}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
              {(() => {
                const selectedProduct = products.find(p => p.id === form.product_id);
                if (selectedProduct?.sizes && selectedProduct.sizes.length > 0) {
                  return (
                    <select
                      value={form.size}
                      onChange={event =>
                        setForm({
                          ...form,
                          size: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">Select size</option>
                      {selectedProduct.sizes.map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  );
                }
                return (
                  <input
                    type="text"
                    value={form.size}
                    onChange={event =>
                      setForm({
                        ...form,
                        size: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="e.g. 50ml, 100g"
                  />
                );
              })()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={event =>
                  setForm({
                    ...form,
                    quantity: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Low-stock threshold
              </label>
              <input
                type="number"
                min="0"
                value={form.low_stock_threshold}
                onChange={event =>
                  setForm({
                    ...form,
                    low_stock_threshold: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div />
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Update Inventory' : 'Add Inventory'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-accent">Inventory</h2>
          <button
            type="button"
            onClick={loadInventory}
            className="text-xs text-gray-500 hover:text-accent"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-xs text-gray-500">Loading inventory...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-500">No inventory records found.</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Variant</th>
                <th className="py-2 pr-4">Quantity</th>
                <th className="py-2 pr-4">Threshold</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-800">
                    {row.products?.name ?? productNameFor(row.product_id)}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {[row.size].filter(Boolean).join(' / ') || 'Default'}
                  </td>
                  <td className="py-2 pr-4 text-gray-800">{row.quantity}</td>
                  <td className="py-2 pr-4 text-gray-800">{row.low_stock_threshold}</td>
                  <td className="py-2 pr-0 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="text-[11px] text-accent hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const OrdersSection: React.FC = () => {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('orders')
      .select(
        'id, customer_name, email, phone, status, total_amount, created_at, delivery_type, delivery_address, pesapal_order_tracking_id, pesapal_merchant_reference'
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setItems([]);
    } else {
      setItems((data ?? []) as OrderRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, []);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    // If the new status is a final state, ask for confirmation
    if (status === 'Delivered' || status === 'Cancelled') {
      if (!window.confirm(`Are you sure you want to mark this order as ${status}? This action cannot be undone.`)) {
        return;
      }
    }

    setSavingId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      setSavingId(null);
      return;
    }
    await loadOrders();
    setSavingId(null);
  };

  const filteredItems =
    statusFilter === 'all'
      ? items
      : items.filter(order => order.status === statusFilter);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-accent">Orders</h2>
        <div className="flex items-center gap-3 text-xs">
          <select
            value={statusFilter}
            onChange={event =>
              setStatusFilter(event.target.value as 'all' | OrderStatus)
            }
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent bg-white"
          >
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Preparing">Preparing</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
          <button
            type="button"
            onClick={loadOrders}
            className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-accent hover:text-accent"
          >
            Refresh
          </button>
        </div>
      </div>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      {loading ? (
        <p className="text-xs text-gray-500">Loading orders...</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-xs text-gray-500">No orders found.</p>
      ) : (
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Delivery</th>
              <th className="py-2 pr-4">Payment</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(order => (
              <tr key={order.id} className="border-b border-gray-50">
                <td className="py-2 pr-4 text-gray-600 align-top">
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td className="py-2 pr-4 align-top">
                  <div className="font-medium text-gray-800">{order.customer_name}</div>
                  <div className="text-gray-500">{order.email}</div>
                  <div className="text-gray-500">{order.phone}</div>
                </td>
                <td className="py-2 pr-4 text-gray-600 align-top">
                  <div className="capitalize font-medium">{order.delivery_type}</div>
                  {order.delivery_address && (
                    <div className="text-[10px] text-gray-400 max-w-[150px] truncate" title={order.delivery_address}>
                      {order.delivery_address}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-4 text-gray-600 align-top text-[10px] font-mono">
                  {order.pesapal_merchant_reference && (
                     <div className="text-gray-800 font-bold mb-1" title="Paystack Reference">
                       {order.pesapal_merchant_reference}
                     </div>
                  )}
                  {order.pesapal_order_tracking_id ? (
                    <div className="text-green-600">ID: {order.pesapal_order_tracking_id}</div>
                  ) : (
                     order.status === 'Paid' ? <div className="text-red-500">No Trans ID</div> : <div className="text-amber-500">Pending Payment</div>
                  )}
                </td>
                <td className="py-2 pr-4 align-top">
                  <select
                    value={order.status}
                    onChange={event =>
                      handleStatusChange(order.id, event.target.value as OrderStatus)
                    }
                    disabled={savingId === order.id || order.status === 'Delivered' || order.status === 'Cancelled'}
                    className={`rounded-full border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent bg-white ${
                      order.status === 'Delivered' || order.status === 'Cancelled' ? 'opacity-75 cursor-not-allowed bg-gray-50' : ''
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Failed">Failed</option>
                  </select>
                </td>
                <td className="py-2 pr-4 text-right text-gray-800 align-top">
                  KSh {Number(order.total_amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const CustomersSection: React.FC = () => {
  const [items, setItems] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('orders')
      .select('customer_name, email, phone, total_amount, created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const byEmail = new Map<string, CustomerSummary>();

    rows.forEach(row => {
      const email = row.email as string;
      const name = row.customer_name as string;
      const phone = row.phone as string;
      const amount = Number((row.total_amount as number | null) ?? 0);
      const createdAt = row.created_at as string;

      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, {
          email,
          name,
          phone,
          total_orders: 1,
          total_spent: amount,
          last_order_at: createdAt,
        });
      } else {
        existing.total_orders += 1;
        existing.total_spent += amount;
        if (new Date(createdAt).getTime() > new Date(existing.last_order_at).getTime()) {
          existing.last_order_at = createdAt;
        }
      }
    });

    setItems(Array.from(byEmail.values()));
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-accent">Customers</h2>
        <button
          type="button"
          onClick={loadCustomers}
          className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-accent hover:text-accent"
        >
          Refresh
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      {loading ? (
        <p className="text-xs text-gray-500">Loading customers...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-500">No customers found yet.</p>
      ) : (
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Total Spent</th>
              <th className="py-2 pr-4">Last Order</th>
            </tr>
          </thead>
          <tbody>
            {items.map(customer => (
              <tr key={customer.email} className="border-b border-gray-50">
                <td className="py-2 pr-4 text-gray-800">{customer.name}</td>
                <td className="py-2 pr-4 text-gray-600">{customer.email}</td>
                <td className="py-2 pr-4 text-gray-600">{customer.phone}</td>
                <td className="py-2 pr-4 text-gray-800">{customer.total_orders}</td>
                <td className="py-2 pr-4 text-gray-800">
                  KSh {customer.total_spent.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  {new Date(customer.last_order_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const SettingsSection: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setSaving(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    navigate('/admin/login');
  };

  return (
    <div className="max-w-xl bg-white rounded-2xl p-6 border border-gray-100">
      <h2 className="text-sm font-semibold text-accent mb-4">Admin Settings</h2>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-500 mb-6">
        Manage basic account actions for the admin panel.
      </p>
      <button
        type="button"
        onClick={handleLogout}
        disabled={saving}
        className="px-4 py-2 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60"
      >
        {saving ? 'Signing out...' : 'Sign out of admin'}
      </button>
    </div>
  );
};



const BannersSection: React.FC = () => {
  const [items, setItems] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    section: 'hers' as 'his' | 'hers',
    image_path: '',
    headline: '',
    subtext: '',
    cta_text: '',
    cta_link: '',
    active: true,
    sort_order: 0,
  });

  const loadBanners = async () => {
    setLoading(true);
    setError(null);
    
    // Try to fetch with all fields first
    const { data, error: queryError } = await supabase
      .from('banners')
      .select(
        'id, section, image_path, headline, subtext, cta_text, cta_link, active, sort_order'
      )
      .order('section')
      .order('sort_order');

    if (queryError) {
      console.warn('Failed to load full banner details, falling back to basic fields:', queryError);
      
      // Fallback to basic fields that are guaranteed to exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('banners')
        .select(
          'id, section, image_path, active, sort_order'
        )
        .order('section')
        .order('sort_order');

      if (fallbackError) {
        setError(fallbackError.message);
        setItems([]);
      } else {
        setItems((fallbackData ?? []) as BannerRow[]);
      }
    } else {
      setItems((data ?? []) as BannerRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBanners();
  }, []);

  const seedBanners = async () => {
    setLoading(true);
    const defaultBanners = [
      {
        section: 'hers',
        image_path: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1920&auto=format&fit=crop',
        headline: 'Radiant Beauty',
        subtext: 'Discover our new collection',
        cta_text: 'Shop Now',
        cta_link: '/category/hers',
        active: true,
        sort_order: 1
      },
      {
        section: 'his',
        image_path: 'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?q=80&w=1920&auto=format&fit=crop',
        headline: 'Bold Elegance',
        subtext: 'Essentials for the modern man',
        cta_text: 'Shop Now',
        cta_link: '/category/his',
        active: true,
        sort_order: 1
      }
    ];

    for (const banner of defaultBanners) {
      await supabase.from('banners').insert(banner);
    }
    await loadBanners();
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      section: 'hers',
      image_path: '',
      headline: '',
      subtext: '',
      cta_text: '',
      cta_link: '',
      active: true,
      sort_order: 0,
    });
    setImageFile(null);
  };

  const handleEdit = (row: BannerRow) => {
    setEditingId(row.id);
    setForm({
      section: row.section,
      image_path: row.image_path,
      headline: row.headline ?? '',
      subtext: row.subtext ?? '',
      cta_text: row.cta_text ?? '',
      cta_link: row.cta_link ?? '',
      active: row.active,
      sort_order: row.sort_order,
    });
    setImageFile(null);
  };

  const uploadBannerImage = async () => {
    if (!imageFile) {
      return form.image_path;
    }

    const extension = imageFile.name.split('.').pop() ?? 'jpg';
    const fileName = `${form.section}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BANNER_IMAGES_BUCKET)
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      setError(uploadError.message);
      return null;
    }

    return fileName;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const storagePath = await uploadBannerImage();

    if (imageFile && !storagePath) {
      setSaving(false);
      return;
    }

    const payload = {
      section: form.section,
      image_path: storagePath ?? form.image_path,
      headline: form.headline || null,
      subtext: form.subtext || null,
      cta_text: form.cta_text || null,
      cta_link: form.cta_link || null,
      active: form.active,
      sort_order: form.sort_order,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('banners')
        .update(payload)
        .eq('id', editingId);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('banners').insert(payload);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    await loadBanners();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase.from('banners').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }
    await loadBanners();
    setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="text-sm font-semibold text-accent mb-4">
          {editingId ? 'Edit Banner' : 'Add Banner'}
        </h2>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Section
              </label>
              <select
                value={form.section}
                onChange={event =>
                  setForm({
                    ...form,
                    section: event.target.value as 'his' | 'hers',
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="hers">For Her</option>
                <option value="his">For Him</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={event =>
                  setForm({
                    ...form,
                    sort_order: Number(event.target.value),
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Banner Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={event => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
              }}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-accent file:text-white hover:file:bg-gray-900"
              required={!editingId && !form.image_path}
            />
            {editingId && form.image_path && (
              <p className="mt-1 text-[11px] text-gray-500 break-all">
                Current image: {form.image_path}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Headline
            </label>
            <input
              type="text"
              value={form.headline}
              onChange={event =>
                setForm({
                  ...form,
                  headline: event.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subtext
            </label>
            <textarea
              value={form.subtext}
              onChange={event =>
                setForm({
                  ...form,
                  subtext: event.target.value,
                })
              }
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                CTA Text
              </label>
              <input
                type="text"
                value={form.cta_text}
                onChange={event =>
                  setForm({
                    ...form,
                    cta_text: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                CTA Link
              </label>
              <input
                type="text"
                value={form.cta_link}
                onChange={event =>
                  setForm({
                    ...form,
                    cta_link: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.active}
                onChange={event =>
                  setForm({
                    ...form,
                    active: event.target.checked,
                  })
                }
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              Active
            </label>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Update Banner' : 'Add Banner'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-accent">Banners</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={seedBanners}
              className="text-xs text-accent hover:underline"
            >
              Initialize Defaults
            </button>
            <button
              type="button"
              onClick={loadBanners}
              className="text-xs text-gray-500 hover:text-accent"
            >
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-xs text-gray-500">Loading banners...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
             <p className="text-xs text-gray-500 mb-2">No banners found.</p>
             <p className="text-[10px] text-gray-400 max-w-xs">
               If you just set up the database, you might need to initialize the default banners.
             </p>
             <button
              type="button"
              onClick={seedBanners}
              className="mt-3 px-3 py-1.5 rounded-full bg-gray-100 text-accent text-xs hover:bg-gray-200"
            >
              Initialize Defaults
            </button>
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4">Section</th>
                <th className="py-2 pr-4">Headline</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Sort</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 capitalize text-gray-600">
                    {row.section === 'hers' ? 'For Her' : 'For Him'}
                  </td>
                  <td className="py-2 pr-4 text-gray-800">
                    {row.headline || row.image_path.slice(0, 40)}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        row.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{row.sort_order}</td>
                  <td className="py-2 pr-0 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="text-[11px] text-accent hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const DeliveryZonesSection: React.FC = () => {
  const [items, setItems] = useState<DeliveryZoneRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    fee: '',
    active: true,
  });

  const loadZones = async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('delivery_zones')
      .select('id, name, fee, active')
      .order('name');

    if (queryError) {
      setError(queryError.message);
      setItems([]);
    } else {
      setItems((data ?? []) as DeliveryZoneRow[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      fee: '',
      active: true,
    });
  };

  const handleEdit = (row: DeliveryZoneRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      fee: row.fee.toString(),
      active: row.active,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      fee: Number(form.fee || 0),
      active: form.active,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('delivery_zones')
        .update(payload)
        .eq('id', editingId);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('delivery_zones').insert(payload);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    await loadZones();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from('delivery_zones')
      .delete()
      .eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }
    await loadZones();
    setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="text-sm font-semibold text-accent mb-4">
          {editingId ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
        </h2>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={event =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fee (KSh)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.fee}
              onChange={event =>
                setForm({
                  ...form,
                  fee: event.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.active}
                onChange={event =>
                  setForm({
                    ...form,
                    active: event.target.checked,
                  })
                }
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              Active
            </label>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Update Zone' : 'Add Zone'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-accent">Delivery Zones</h2>
          <button
            type="button"
            onClick={loadZones}
            className="text-xs text-gray-500 hover:text-accent"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-xs text-gray-500">Loading delivery zones...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-500">No delivery zones found.</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Fee</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-800">{row.name}</td>
                  <td className="py-2 pr-4 text-gray-800">
                    KSh {Number(row.fee).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        row.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2 pr-0 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="text-[11px] text-accent hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
