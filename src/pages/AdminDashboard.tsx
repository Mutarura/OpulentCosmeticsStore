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
  category: 'his' | 'hers' | 'accessories'; // ← added accessories
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
  section: 'his' | 'hers' | 'accessories'; // ← added accessories
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
  subtotal_amount: number;
  delivery_fee: number;
  delivery_area: string | null;
  created_at: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address: string | null;
  pesapal_order_tracking_id: string | null;
  pesapal_merchant_reference: string | null;
  order_items?: {
    product_name: string;
    quantity: number;
    unit_price: number;
    size: string | null;
    color: string | null;
  }[];
}

interface CustomerSummary {
  email: string;
  name: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
}

// ─── Subcategory options per category ────────────────────────────────────────
const subcategoryOptions: Record<'his' | 'hers' | 'accessories', string[]> = {
  hers: ['Perfumes & Mists', 'Body Creams', 'Face Care', 'Shower Care', 'Hair Care'],
  his: ['Colognes', 'Face Care', 'Shower Care', 'Grooming', 'Body Care'],
  accessories: ['Chains & Necklaces', 'Earrings', 'Makeup Bags', 'Pouches', 'Bonnets', 'Nail Care', 'Other'],
};

// Human-readable label for category value
const categoryLabel: Record<'his' | 'hers' | 'accessories', string> = {
  hers: 'For Her',
  his: 'For Him',
  accessories: 'Accessories',
};

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
    let orderChannel: any;

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/admin/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();

      if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        await supabase.auth.signOut();
        navigate('/admin/login');
        return;
      }

      // Request browser notification permission 
      if ('Notification' in window && Notification.permission === 'default') { 
        void Notification.requestPermission(); 
      } 

      // Real-time new order browser notification 
      orderChannel = supabase 
        .channel('admin:new-orders') 
        .on( 
          'postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'orders' }, 
          (payload) => { 
            if (Notification.permission === 'granted') { 
              new Notification('New Order — Opulent!', { 
                body: `${String(payload.new.customer_name)} — KSh ${Number(payload.new.total_amount).toLocaleString()}`, 
                icon: '/favicon.ico', 
              }); 
            } 
            // Auto-switch to orders tab 
            setActiveTab('orders'); 
          } 
        ) 
        .subscribe();

      const { count: totalOrdersCount } = await supabase
        .from('orders').select('id', { count: 'exact', head: true });

      const { count: pendingDeliveriesCount } = await supabase
        .from('orders').select('id', { count: 'exact', head: true })
        .in('status', ['Paid', 'Preparing', 'Out for Delivery']);

      const { data: revenueRows } = await supabase
        .from('orders').select('total_amount').eq('status', 'Paid');

      const { data: inventoryRows } = await supabase
        .from('inventory').select('id, quantity, low_stock_threshold');

      const totalRevenue = ((revenueRows ?? []) as { total_amount: number | null }[])
        .reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

      const lowStockItems = ((inventoryRows ?? []) as { quantity: number; low_stock_threshold: number }[])
        .filter(row => Number(row.quantity) <= Number(row.low_stock_threshold)).length;

      setKpis({ totalOrders: totalOrdersCount ?? 0, pendingDeliveries: pendingDeliveriesCount ?? 0, totalRevenue, lowStockItems });
      setLoading(false);
    };

    loadData();

    return () => {
      if (orderChannel) {
        supabase.removeChannel(orderChannel);
      }
    };
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
          onClick={async () => { await supabase.auth.signOut(); navigate('/admin/login'); }}
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
              <p className="mt-2 text-2xl font-semibold text-accent">KSh {kpis.totalRevenue.toLocaleString()}</p>
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
    category: 'hers' as 'his' | 'hers' | 'accessories',
    subcategory: 'Perfumes & Mists',
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
    const { data, error: queryError } = await supabase
      .from('products')
      .select('id, name, category, subcategory, price, discount_price, sizes, active, is_bundle')
      .order('created_at', { ascending: false });

    if (queryError) {
      console.warn('Failed to load product list, falling back:', queryError);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('products')
        .select('id, name, category, subcategory, price, discount_price, sizes, active')
        .order('created_at', { ascending: false });
      if (fallbackError) { setError(fallbackError.message); setItems([]); }
      else { setItems((fallbackData ?? []) as ProductRow[]); }
    } else {
      setItems((data ?? []) as ProductRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      category: 'hers',
      subcategory: 'Perfumes & Mists',
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
    const hasDiscount = row.discount_price != null && row.discount_price !== 0 && row.discount_price < row.price;
    const percent = hasDiscount && row.price
      ? Math.round((1 - Number(row.discount_price) / Number(row.price)) * 100)
      : undefined;

    setForm({
      name: row.name,
      category: row.category,
      subcategory: row.subcategory ?? subcategoryOptions[row.category][0],
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

    if (row.description === undefined) {
      const { data } = await supabase.from('products').select('description').eq('id', row.id).maybeSingle();
      if (data) setForm(prev => ({ ...prev, description: data.description || '' }));
    }
  };

  const handleImageUpload = async (productId: string) => {
    if (!imageFile) return;
    const extension = imageFile.name.split('.').pop() ?? 'jpg';
    const fileName = `${productId}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET).upload(fileName, imageFile, { cacheControl: '3600', upsert: true });
    if (uploadError) { setError(uploadError.message); return; }
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
    const { error: insertError } = await supabase.from('product_images').insert({ product_id: productId, storage_path: fileName, is_primary: true });
    if (insertError) setError(insertError.message);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const priceValue = Number(form.price || 0);
    let discountValue: number | null = null;

    if (form.discount_mode === 'amount' && form.discount_price) {
      const amount = Number(form.discount_price);
      if (!Number.isNaN(amount) && amount > 0 && amount < priceValue) discountValue = amount;
    } else if (form.discount_mode === 'percent' && form.discount_percent) {
      const percent = Number(form.discount_percent);
      if (!Number.isNaN(percent) && percent > 0 && percent < 100 && priceValue > 0) {
        discountValue = Number((priceValue * (1 - percent / 100)).toFixed(2));
      }
    }

    const sizesArray = form.sizesInput
      ? form.sizesInput.split(',').map(v => v.trim()).filter(Boolean)
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
      const { error: updateError } = await supabase.from('products').update(payload).eq('id', editingId);
      if (updateError) {
        if (updateError.message?.includes('column')) {
          const { description, is_bundle, ...basicPayload } = payload; // eslint-disable-line @typescript-eslint/no-unused-vars
          const { error: retryError } = await supabase.from('products').update(basicPayload).eq('id', editingId);
          if (retryError) { setError(retryError.message); setSaving(false); return; }
          else setError('Note: Description and Bundle status were not saved (columns missing).');
        } else { setError(updateError.message); setSaving(false); return; }
      }
      if (imageFile) await handleImageUpload(editingId);
    } else {
      const { data: insertData, error: insertError } = await supabase.from('products').insert(payload).select('id').single();
      if (insertError) {
        if (insertError.message?.includes('column')) {
          const { description, is_bundle, ...basicPayload } = payload; // eslint-disable-line @typescript-eslint/no-unused-vars
          const { data: retryData, error: retryError } = await supabase.from('products').insert(basicPayload).select('id').single();
          if (retryError || !retryData) { setError(retryError?.message ?? 'Failed to create product'); setSaving(false); return; }
          if (imageFile) await handleImageUpload(retryData.id as string);
          setError('Note: Description and Bundle status were not saved (columns missing).');
        } else { setError(insertError.message); setSaving(false); return; }
      } else if (insertData) {
        if (imageFile) await handleImageUpload(insertData.id as string);
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
    if (deleteError) { setError(deleteError.message); setSaving(false); return; }
    await loadProducts();
    setSaving(false);
  };

  // When category changes, reset subcategory to first option for that category
  const handleCategoryChange = (newCategory: 'his' | 'hers' | 'accessories') => {
    setForm(prev => ({
      ...prev,
      category: newCategory,
      subcategory: subcategoryOptions[newCategory][0],
    }));
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
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              rows={3}
              placeholder="Enter product description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category — now has 3 options */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => handleCategoryChange(e.target.value as 'his' | 'hers' | 'accessories')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="hers">For Her</option>
                <option value="his">For Him</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            {/* Subcategory — options change dynamically based on category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
              <select
                value={form.subcategory}
                onChange={e => setForm({ ...form, subcategory: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {subcategoryOptions[form.category].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Price (KSh)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-gray-600">Discount</label>
                <select
                  value={form.discount_mode}
                  onChange={e => setForm({ ...form, discount_mode: e.target.value as 'amount' | 'percent' })}
                  className="rounded-full border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                >
                  <option value="amount">KSh</option>
                  <option value="percent">% off</option>
                </select>
              </div>
              {form.discount_mode === 'amount' ? (
                <input
                  type="number" min="0" step="0.01"
                  value={form.discount_price}
                  onChange={e => setForm({ ...form, discount_price: e.target.value })}
                  placeholder="Discounted price"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              ) : (
                <div className="space-y-1">
                  <input
                    type="number" min="0" max="99" step="1"
                    value={form.discount_percent}
                    onChange={e => setForm({ ...form, discount_percent: e.target.value })}
                    placeholder="Discount %"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <p className="text-[10px] text-gray-500">
                    {(() => {
                      const base = Number(form.price || 0);
                      const pct = Number(form.discount_percent || 0);
                      if (base > 0 && pct > 0 && pct < 100)
                        return `Will charge KSh ${Math.round(base * (1 - pct / 100)).toLocaleString()}`;
                      return 'Set a percentage to auto-calc discount price';
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sizes (e.g. 50ml, 100g)</label>
            <input
              type="text"
              value={form.sizesInput}
              onChange={e => setForm({ ...form, sizesInput: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="50ml, 100g"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product Image</label>
            <input
              type="file" accept="image/*"
              onChange={e => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-accent file:text-white hover:file:bg-gray-900"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox" checked={form.active}
                onChange={e => setForm({ ...form, active: e.target.checked })}
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              Active on storefront
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox" checked={form.is_bundle}
                onChange={e => setForm({ ...form, is_bundle: e.target.checked })}
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              Is a Bundle
            </label>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={resetForm}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={saving}
                className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60">
                {saving ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-accent">Products</h2>
          <button type="button" onClick={loadProducts} className="text-xs text-gray-500 hover:text-accent">
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
                <th className="py-2 pr-4">Subcategory</th>
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
                  <td className="py-2 pr-4 text-gray-600">
                    {/* Color-coded category badge */}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.category === 'hers'
                        ? 'bg-pink-50 text-pink-600'
                        : row.category === 'accessories'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-teal-50 text-teal-600'
                    }`}>
                      {categoryLabel[row.category]}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{row.subcategory ?? '—'}</td>
                  <td className="py-2 pr-4 text-gray-800">KSh {Number(row.price).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {row.discount_price != null && row.discount_price !== 0
                      ? `KSh ${Number(row.discount_price).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {row.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-2 pr-0 text-right">
                    <button type="button" onClick={() => handleEdit(row)} className="text-[11px] text-accent hover:underline mr-3">Edit</button>
                    <button type="button" onClick={() => handleDelete(row.id)} className="text-[11px] text-red-500 hover:underline">Delete</button>
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

// ─── All sections below are UNCHANGED from original ──────────────────────────

const InventorySection: React.FC = () => {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ product_id: '', size: '', quantity: '', low_stock_threshold: '5' });

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    let fetchedProducts: ProductRow[] = [];
    const { data: productRows, error: productsError } = await supabase
      .from('products').select('id, name, category, subcategory, price, discount_price, sizes, active').order('name');
    if (productsError) {
      const { data: fallbackProducts, error: fallbackError } = await supabase
        .from('products').select('id, name, category, price, active').order('name');
      if (fallbackError) setError(`Failed to load products: ${fallbackError.message}`);
      else fetchedProducts = (fallbackProducts ?? []) as ProductRow[];
    } else { fetchedProducts = (productRows ?? []) as ProductRow[]; }
    setProducts(fetchedProducts);

    const { data: inventoryRows, error: inventoryError } = await supabase
      .from('inventory').select('id, product_id, size, quantity, low_stock_threshold, products(name)').order('updated_at', { ascending: false });
    if (inventoryError) {
      const { data: fallbackInventory, error: fallbackInvError } = await supabase
        .from('inventory').select('id, product_id, quantity, low_stock_threshold').order('updated_at', { ascending: false });
      if (fallbackInvError) setError(`Inventory error: ${fallbackInvError.message}`);
      else setItems((fallbackInventory ?? []) as InventoryRow[]);
    } else { setItems((inventoryRows ?? []) as unknown as InventoryRow[]); }
    setLoading(false);
  };

  useEffect(() => { loadInventory(); }, []);

  const resetForm = () => { setEditingId(null); setForm({ product_id: '', size: '', quantity: '', low_stock_threshold: '5' }); };
  const handleEdit = (row: InventoryRow) => { setEditingId(row.id); setForm({ product_id: row.product_id, size: row.size ?? '', quantity: row.quantity.toString(), low_stock_threshold: row.low_stock_threshold.toString() }); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    if (!form.product_id) { setError('Select a product'); setSaving(false); return; }
    const payload = { product_id: form.product_id, size: form.size || null, quantity: Number(form.quantity || 0), low_stock_threshold: Number(form.low_stock_threshold || 0) };
    if (editingId) {
      const { error: e } = await supabase.from('inventory').update(payload).eq('id', editingId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from('inventory').insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    await loadInventory(); resetForm(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('inventory').delete().eq('id', id);
    if (e) { setError(e.message); setSaving(false); return; }
    await loadInventory(); setSaving(false);
  };

  const productNameFor = (productId: string) => products.find(p => p.id === productId)?.name ?? 'Unknown';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="text-sm font-semibold text-accent mb-4">{editingId ? 'Edit Inventory' : 'Add Inventory'}</h2>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
            <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" required>
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({categoryLabel[p.category] ?? p.category})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
            {(() => {
              const sel = products.find(p => p.id === form.product_id);
              if (sel?.sizes && sel.sizes.length > 0) return (
                <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent">
                  <option value="">Select size</option>
                  {sel.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              );
              return <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" placeholder="e.g. 50ml" />;
            })()}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Low-stock threshold</label>
              <input type="number" min="0" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" required />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            {editingId && <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300">Cancel</button>}
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60">
              {saving ? 'Saving...' : editingId ? 'Update Inventory' : 'Add Inventory'}
            </button>
          </div>
        </form>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-accent">Inventory</h2>
          <button type="button" onClick={loadInventory} className="text-xs text-gray-500 hover:text-accent">Refresh</button>
        </div>
        {loading ? <p className="text-xs text-gray-500">Loading inventory...</p> : items.length === 0 ? <p className="text-xs text-gray-500">No inventory records found.</p> : (
          <table className="min-w-full text-xs">
            <thead><tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Product</th><th className="py-2 pr-4">Variant</th>
              <th className="py-2 pr-4">Quantity</th><th className="py-2 pr-4">Threshold</th>
              <th className="py-2 pr-4 text-right">Actions</th>
            </tr></thead>
            <tbody>{items.map(row => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="py-2 pr-4 text-gray-800">{row.products?.name ?? productNameFor(row.product_id)}</td>
                <td className="py-2 pr-4 text-gray-600">{row.size || 'Default'}</td>
                <td className="py-2 pr-4 text-gray-800">{row.quantity}</td>
                <td className="py-2 pr-4 text-gray-800">{row.low_stock_threshold}</td>
                <td className="py-2 pr-0 text-right">
                  <button type="button" onClick={() => handleEdit(row)} className="text-[11px] text-accent hover:underline mr-3">Edit</button>
                  <button type="button" onClick={() => handleDelete(row.id)} className="text-[11px] text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Order detail components ──────────────────────────────────────────

const AddressCell = ({ address, area }: { address: string | null; area: string | null }) => {
  const [open, setOpen] = useState(false);

  if (!address && !area) return <span className="text-gray-400 text-[10px]">Pickup</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-left text-[10px] text-blue-600 underline underline-offset-2 hover:text-blue-800 max-w-[120px] truncate block"
        title="Click to view full address"
      >
        {area || address}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-800 mb-3">Delivery Address</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Zone:</span> {area || '—'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">Address:</span> {address || '—'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${area ? area + ', ' : ''}${address || ''}`);
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
              >
                📋 Copy
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const OrderItemsModal = ({ order, onClose }: { order: OrderRow; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Order Details</h3>
          <p className="text-xs text-gray-500 mt-0.5">{order.pesapal_merchant_reference}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
          ✕
        </button>
      </div>

      {/* Customer Info */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
        <p>
          <span className="font-medium">Customer:</span> {order.customer_name}
        </p>
        <p>
          <span className="font-medium">Phone:</span>
          <a href={`tel:${order.phone}`} className="text-blue-600 ml-1 hover:underline">
            {order.phone}
          </a>
        </p>
        <p>
          <span className="font-medium">Email:</span> {order.email}
        </p>
        <p>
          <span className="font-medium">Delivery:</span>{' '}
          {order.delivery_type === 'pickup' ? '🏪 Pickup' : `🚚 ${order.delivery_area || ''}`}
        </p>
        {order.delivery_address && (
          <div className="flex items-start gap-2">
            <span className="font-medium shrink-0">Address:</span>
            <div className="flex flex-col gap-1.5">
              <p className="text-gray-600">{order.delivery_address}</p>
              <button
                onClick={() => navigator.clipboard.writeText(order.delivery_address!)}
                className="text-[10px] bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded w-fit"
              >
                Copy Address
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <h4 className="font-medium text-sm text-gray-700 mb-2">Items</h4>
      <div className="space-y-2 mb-4">
        {order.order_items?.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
            <div>
              <p className="font-medium text-gray-800">{item.product_name}</p>
              <p className="text-xs text-gray-500">
                {item.size ? `Size: ${item.size}` : ''} {item.color ? `| Color: ${item.color}` : ''} |
                Qty: {item.quantity}
              </p>
            </div>
            <p className="font-medium text-gray-800">
              KSh {(item.unit_price * item.quantity).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="text-sm space-y-1 border-t pt-3 border-gray-100">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>KSh {Number(order.subtotal_amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery Fee</span>
          <span>KSh {Number(order.delivery_fee).toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-800 text-base mt-2 pt-2 border-t border-gray-50">
          <span>Total</span>
          <span>KSh {Number(order.total_amount).toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
);

const OrdersSection: React.FC = () => {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

  const isNewOrder = (createdAt: string) => 
    Date.now() - new Date(createdAt).getTime() < 2 * 60 * 60 * 1000; 
  
  const isStuckOrder = (order: OrderRow) => 
    order.status === 'Paid' && 
    Date.now() - new Date(order.created_at).getTime() > 60 * 60 * 1000; 
  
  const getOrderAge = (createdAt: string) => { 
    const diffMs = Date.now() - new Date(createdAt).getTime(); 
    const diffMins = Math.floor(diffMs / 60000); 
    if (diffMins < 60) return `${diffMins}m ago`; 
    const diffHours = Math.floor(diffMins / 60); 
    if (diffHours < 24) return `${diffHours}h ago`; 
    return `${Math.floor(diffHours / 24)}d ago`; 
  };

  const loadOrders = async () => {
    setLoading(true); setError(null);
    const { data, error: e } = await supabase.from('orders')
      .select('*, order_items(product_name, quantity, unit_price, size, color)')
      .order('created_at', { ascending: false });
    if (e) { setError(e.message); setItems([]); } else setItems((data ?? []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    if ((status === 'Delivered' || status === 'Cancelled') && !window.confirm(`Mark as ${status}?`)) return;
    setSavingId(id); setError(null);
    const { error: e } = await supabase.from('orders').update({ status }).eq('id', id);
    if (e) { setError(e.message); setSavingId(null); return; }
    await loadOrders(); setSavingId(null);
  };

  const filteredItems = statusFilter === 'all' ? items : items.filter(o => o.status === statusFilter);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-accent">Orders</h2>
        <div className="flex items-center gap-3 text-xs">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | OrderStatus)}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent bg-white">
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option><option value="Paid">Paid</option>
            <option value="Preparing">Preparing</option><option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
          <button type="button" onClick={loadOrders} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-accent hover:text-accent">Refresh</button>
        </div>
      </div>

      {/* Live order stats */} 
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"> 
        {[ 
          { label: 'Pending Payment', value: items.filter(o => o.status === 'Pending').length, color: 'text-amber-500' }, 
          { label: 'Paid & Ready', value: items.filter(o => o.status === 'Paid').length, color: 'text-blue-500' }, 
          { label: 'Out for Delivery', value: items.filter(o => o.status === 'Out for Delivery').length, color: 'text-purple-500' }, 
          { label: 'Delivered Today', value: items.filter(o => o.status === 'Delivered' && isNewOrder(o.created_at)).length, color: 'text-green-500' }, 
        ].map(stat => ( 
          <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center"> 
            <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p> 
            <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p> 
          </div> 
        ))} 
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      {loading ? <p className="text-xs text-gray-500">Loading orders...</p> : filteredItems.length === 0 ? <p className="text-xs text-gray-500">No orders found.</p> : (
        <table className="min-w-full text-xs">
          <thead><tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Customer</th>
            <th className="py-2 pr-4">Delivery</th><th className="py-2 pr-4">Payment</th>
            <th className="py-2 pr-4">Status</th><th className="py-2 pr-4 text-right">Total</th>
          </tr></thead>
          <tbody>{filteredItems.map(order => (
            <tr key={order.id} className="border-b border-gray-50">
              <td className="py-2 pr-4 text-gray-600 align-top">{new Date(order.created_at).toLocaleString()}</td>
              <td className="py-2 pr-4 align-top">
                <div className="flex items-center gap-1 flex-wrap"> 
                  <span className="font-medium text-gray-800">{order.customer_name}</span> 
                  {isNewOrder(order.created_at) && order.status === 'Paid' && ( 
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-red-500 text-white animate-pulse">NEW</span> 
                  )} 
                  {isStuckOrder(order) && ( 
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-amber-400 text-white">ACTION NEEDED</span> 
                  )} 
                </div> 
                <div className="text-gray-500 text-[10px]">{order.email}</div> 
                <div className="text-gray-500 text-[10px]">{order.phone}</div> 
                <div className="text-gray-400 text-[10px] mt-1">{getOrderAge(order.created_at)}</div> 
                {/* Quick action buttons */} 
                <div className="flex gap-2 mt-1"> 
                  <a href={`tel:${order.phone}`} className="text-[10px] text-teal-600 hover:underline">Call</a> 
                  <a href={`https://wa.me/${order.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-600 hover:underline">WhatsApp</a> 
                </div>
              </td>
              <td className="py-2 pr-4 text-gray-600 align-top">
                <div className="capitalize font-medium mb-0.5">{order.delivery_type}</div>
                <AddressCell address={order.delivery_address} area={order.delivery_area} />
              </td>
              <td className="py-2 pr-4 text-gray-600 align-top text-[10px] font-mono">
                {order.pesapal_merchant_reference && <div className="text-gray-800 font-bold mb-1">{order.pesapal_merchant_reference}</div>}
                {order.pesapal_order_tracking_id ? <div className="text-green-600">ID: {order.pesapal_order_tracking_id}</div> : order.status === 'Paid' ? <div className="text-red-500">No Trans ID</div> : <div className="text-amber-500">Pending Payment</div>}
              </td>
              <td className="py-2 pr-4 align-top">
                <div className="flex flex-col gap-2">
                  <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    disabled={savingId === order.id || order.status === 'Delivered' || order.status === 'Cancelled'}
                    className={`rounded-full border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent bg-white ${order.status === 'Delivered' || order.status === 'Cancelled' ? 'opacity-75 cursor-not-allowed bg-gray-50' : ''}`}>
                    <option value="Pending">Pending</option><option value="Paid">Paid</option>
                    <option value="Preparing">Preparing</option><option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option><option value="Failed">Failed</option>
                  </select>
                  <button 
                    onClick={() => setSelectedOrder(order)} 
                    className="text-[10px] bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700 w-fit"
                  >
                    View Items
                  </button>
                </div>
              </td>
              <td className="py-2 pr-4 text-right text-gray-800 align-top">KSh {Number(order.total_amount).toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>
      )}

      {selectedOrder && (
        <OrderItemsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
};

const CustomersSection: React.FC = () => {
  const [items, setItems] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true); setError(null);
    const { data, error: e } = await supabase.from('orders')
      .select('customer_name, email, phone, total_amount, created_at').order('created_at', { ascending: false });
    if (e) { setError(e.message); setItems([]); setLoading(false); return; }
    const byEmail = new Map<string, CustomerSummary>();
    (data ?? []).forEach(row => {
      const email = row.email as string;
      const existing = byEmail.get(email);
      const amount = Number((row.total_amount as number | null) ?? 0);
      const createdAt = row.created_at as string;
      if (!existing) byEmail.set(email, { email, name: row.customer_name as string, phone: row.phone as string, total_orders: 1, total_spent: amount, last_order_at: createdAt });
      else { existing.total_orders += 1; existing.total_spent += amount; if (new Date(createdAt) > new Date(existing.last_order_at)) existing.last_order_at = createdAt; }
    });
    setItems(Array.from(byEmail.values())); setLoading(false);
  };

  useEffect(() => { loadCustomers(); }, []);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-accent">Customers</h2>
        <button type="button" onClick={loadCustomers} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-accent hover:text-accent">Refresh</button>
      </div>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      {loading ? <p className="text-xs text-gray-500">Loading customers...</p> : items.length === 0 ? <p className="text-xs text-gray-500">No customers found yet.</p> : (
        <table className="min-w-full text-xs">
          <thead><tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Phone</th>
            <th className="py-2 pr-4">Orders</th><th className="py-2 pr-4">Total Spent</th><th className="py-2 pr-4">Last Order</th>
          </tr></thead>
          <tbody>{items.map(c => (
            <tr key={c.email} className="border-b border-gray-50">
              <td className="py-2 pr-4 text-gray-800">{c.name}</td><td className="py-2 pr-4 text-gray-600">{c.email}</td>
              <td className="py-2 pr-4 text-gray-600">{c.phone}</td><td className="py-2 pr-4 text-gray-800">{c.total_orders}</td>
              <td className="py-2 pr-4 text-gray-800">KSh {c.total_spent.toLocaleString()}</td>
              <td className="py-2 pr-4 text-gray-600">{new Date(c.last_order_at).toLocaleString()}</td>
            </tr>
          ))}</tbody>
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
    setSaving(true); setError(null);
    const { error: e } = await supabase.auth.signOut();
    if (e) { setError(e.message); setSaving(false); return; }
    setSaving(false); navigate('/admin/login');
  };
  return (
    <div className="max-w-xl bg-white rounded-2xl p-6 border border-gray-100">
      <h2 className="text-sm font-semibold text-accent mb-4">Admin Settings</h2>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-500 mb-6">Manage basic account actions for the admin panel.</p>
      <button type="button" onClick={handleLogout} disabled={saving}
        className="px-4 py-2 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60">
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
    section: 'hers' as 'his' | 'hers' | 'accessories',
    image_path: '', headline: '', subtext: '', cta_text: '', cta_link: '', active: true, sort_order: 0,
  });

  const loadBanners = async () => {
    setLoading(true); setError(null);
    const { data, error: e } = await supabase.from('banners')
      .select('id, section, image_path, headline, subtext, cta_text, cta_link, active, sort_order')
      .order('section').order('sort_order');
    if (e) {
      const { data: fallback, error: fe } = await supabase.from('banners')
        .select('id, section, image_path, active, sort_order').order('section').order('sort_order');
      if (fe) { setError(fe.message); setItems([]); } else setItems((fallback ?? []) as BannerRow[]);
    } else setItems((data ?? []) as BannerRow[]);
    setLoading(false);
  };

  useEffect(() => { loadBanners(); }, []);

  const seedBanners = async () => {
    setLoading(true);
    const defaults = [
      { section: 'hers', image_path: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1920&auto=format&fit=crop', headline: 'Radiant Beauty', subtext: 'Discover our new collection', cta_text: 'Shop Now', cta_link: '/products/her', active: true, sort_order: 1 },
      { section: 'his', image_path: 'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?q=80&w=1920&auto=format&fit=crop', headline: 'Bold Elegance', subtext: 'Essentials for the modern man', cta_text: 'Shop Now', cta_link: '/products/him', active: true, sort_order: 1 },
      { section: 'accessories', image_path: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1920&auto=format&fit=crop', headline: 'Curated Accessories', subtext: 'Chains, earrings, bags & more', cta_text: 'Shop Now', cta_link: '/products/accessories', active: true, sort_order: 1 },
    ];
    for (const b of defaults) await supabase.from('banners').insert(b);
    await loadBanners(); setLoading(false);
  };

  const resetForm = () => { setEditingId(null); setForm({ section: 'hers', image_path: '', headline: '', subtext: '', cta_text: '', cta_link: '', active: true, sort_order: 0 }); setImageFile(null); };
  const handleEdit = (row: BannerRow) => { setEditingId(row.id); setForm({ section: row.section, image_path: row.image_path, headline: row.headline ?? '', subtext: row.subtext ?? '', cta_text: row.cta_text ?? '', cta_link: row.cta_link ?? '', active: row.active, sort_order: row.sort_order }); setImageFile(null); };

  const uploadBannerImage = async () => {
    if (!imageFile) return form.image_path;
    const ext = imageFile.name.split('.').pop() ?? 'jpg';
    const fileName = `${form.section}/${Date.now()}.${ext}`;
    const { error: e } = await supabase.storage.from(BANNER_IMAGES_BUCKET).upload(fileName, imageFile, { cacheControl: '3600', upsert: true });
    if (e) { setError(e.message); return null; }
    return fileName;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    const storagePath = await uploadBannerImage();
    if (imageFile && !storagePath) { setSaving(false); return; }
    const payload = { section: form.section, image_path: storagePath ?? form.image_path, headline: form.headline || null, subtext: form.subtext || null, cta_text: form.cta_text || null, cta_link: form.cta_link || null, active: form.active, sort_order: form.sort_order };
    if (editingId) {
      const { error: e } = await supabase.from('banners').update(payload).eq('id', editingId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from('banners').insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    await loadBanners(); resetForm(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('banners').delete().eq('id', id);
    if (e) { setError(e.message); setSaving(false); return; }
    await loadBanners(); setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="text-sm font-semibold text-accent mb-4">{editingId ? 'Edit Banner' : 'Add Banner'}</h2>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
              {/* ← Now has 3 options including accessories */}
              <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value as 'his' | 'hers' | 'accessories' })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="hers">For Her</option>
                <option value="his">For Him</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banner Image</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-accent file:text-white hover:file:bg-gray-900"
              required={!editingId && !form.image_path} />
            {editingId && form.image_path && <p className="mt-1 text-[11px] text-gray-500 break-all">Current: {form.image_path}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Headline</label>
            <input type="text" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subtext</label>
            <textarea value={form.subtext} onChange={e => setForm({ ...form, subtext: e.target.value })} rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CTA Text</label>
              <input type="text" value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CTA Link</label>
              <input type="text" value={form.cta_link} onChange={e => setForm({ ...form, cta_link: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}
                className="rounded border-gray-300 text-accent focus:ring-accent" />
              Active
            </label>
            <div className="flex gap-2">
              {editingId && <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300">Cancel</button>}
              <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60">
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
            <button type="button" onClick={seedBanners} className="text-xs text-accent hover:underline">Initialize Defaults</button>
            <button type="button" onClick={loadBanners} className="text-xs text-gray-500 hover:text-accent">Refresh</button>
          </div>
        </div>
        {loading ? <p className="text-xs text-gray-500">Loading banners...</p> : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-gray-500 mb-2">No banners found.</p>
            <button type="button" onClick={seedBanners} className="mt-3 px-3 py-1.5 rounded-full bg-gray-100 text-accent text-xs hover:bg-gray-200">Initialize Defaults</button>
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead><tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Section</th><th className="py-2 pr-4">Headline</th>
              <th className="py-2 pr-4">Active</th><th className="py-2 pr-4">Sort</th>
              <th className="py-2 pr-4 text-right">Actions</th>
            </tr></thead>
            <tbody>{items.map(row => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    row.section === 'hers' ? 'bg-pink-50 text-pink-600'
                    : row.section === 'accessories' ? 'bg-orange-50 text-orange-600'
                    : 'bg-teal-50 text-teal-600'
                  }`}>
                    {categoryLabel[row.section]}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-800">{row.headline || row.image_path.slice(0, 40)}</td>
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${row.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {row.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-600">{row.sort_order}</td>
                <td className="py-2 pr-0 text-right">
                  <button type="button" onClick={() => handleEdit(row)} className="text-[11px] text-accent hover:underline mr-3">Edit</button>
                  <button type="button" onClick={() => handleDelete(row.id)} className="text-[11px] text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}</tbody>
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
  const [form, setForm] = useState({ name: '', fee: '', active: true });

  const loadZones = async () => {
    setLoading(true); setError(null);
    const { data, error: e } = await supabase.from('delivery_zones').select('id, name, fee, active').order('name');
    if (e) { setError(e.message); setItems([]); } else setItems((data ?? []) as DeliveryZoneRow[]);
    setLoading(false);
  };

  useEffect(() => { loadZones(); }, []);

  const resetForm = () => { setEditingId(null); setForm({ name: '', fee: '', active: true }); };
  const handleEdit = (row: DeliveryZoneRow) => { setEditingId(row.id); setForm({ name: row.name, fee: row.fee.toString(), active: row.active }); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    const payload = { name: form.name, fee: Number(form.fee || 0), active: form.active };
    if (editingId) {
      const { error: e } = await supabase.from('delivery_zones').update(payload).eq('id', editingId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from('delivery_zones').insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    await loadZones(); resetForm(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true); setError(null);
    const { error: e } = await supabase.from('delivery_zones').delete().eq('id', id);
    if (e) { setError(e.message); setSaving(false); return; }
    await loadZones(); setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h2 className="text-sm font-semibold text-accent mb-4">{editingId ? 'Edit Delivery Zone' : 'Add Delivery Zone'}</h2>
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fee (KSh)</label>
            <input type="number" min="0" step="0.01" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" required />
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}
                className="rounded border-gray-300 text-accent focus:ring-accent" />
              Active
            </label>
            <div className="flex gap-2">
              {editingId && <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600">Cancel</button>}
              <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-60">
                {saving ? 'Saving...' : editingId ? 'Update Zone' : 'Add Zone'}
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-accent">Delivery Zones</h2>
          <button type="button" onClick={loadZones} className="text-xs text-gray-500 hover:text-accent">Refresh</button>
        </div>
        {loading ? <p className="text-xs text-gray-500">Loading delivery zones...</p> : items.length === 0 ? <p className="text-xs text-gray-500">No delivery zones found.</p> : (
          <table className="min-w-full text-xs">
            <thead><tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Fee</th>
              <th className="py-2 pr-4">Active</th><th className="py-2 pr-4 text-right">Actions</th>
            </tr></thead>
            <tbody>{items.map(row => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="py-2 pr-4 text-gray-800">{row.name}</td>
                <td className="py-2 pr-4 text-gray-800">KSh {Number(row.fee).toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${row.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-2 pr-0 text-right">
                  <button type="button" onClick={() => handleEdit(row)} className="text-[11px] text-accent hover:underline mr-3">Edit</button>
                  <button type="button" onClick={() => handleDelete(row.id)} className="text-[11px] text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};