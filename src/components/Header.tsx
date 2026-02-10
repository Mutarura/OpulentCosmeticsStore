import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import { useCategory } from '../context/CategoryContext';
import type { Product } from '../data/products';
import { supabase } from '../lib/supabaseClient';

type ProductImageRow = {
  storage_path: string;
  is_primary: boolean | null;
  sort_order: number | null;
};

type ProductRowWithImages = {
  id: string;
  name: string;
  category: 'his' | 'hers';
  price: number;
  discount_price: number | null;
  product_images?: ProductImageRow[] | null;
};

const PRODUCT_IMAGES_BUCKET = 'product-images';

const mapDbProductToStoreProduct = (row: ProductRowWithImages): Product => {
  const images = row.product_images ?? [];
  const sortedImages = [...images].sort((a, b) => {
    const aPrimary = a.is_primary ? 1 : 0;
    const bPrimary = b.is_primary ? 1 : 0;
    if (aPrimary !== bPrimary) {
      return bPrimary - aPrimary;
    }
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    return aOrder - bOrder;
  });

  const primaryImage = sortedImages[0];
  const fallbackImage =
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800&auto=format&fit=crop';

  const imageUrl = primaryImage
    ? supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(primaryImage.storage_path).data
        .publicUrl
    : fallbackImage;

  return {
    id: row.id,
    name: row.name,
    price: Number(row.discount_price ?? row.price),
    description: '',
    category: row.category === 'hers' ? 'Her' : 'Him',
    image: imageUrl,
    rating: 4.8,
  };
};

export const Header: React.FC = () => {
  const location = useLocation();
  const { totalItems } = useCart();
  const { searchQuery, setSearchQuery } = useSearch();
  const { category, setCategory } = useCategory();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isBumped, setIsBumped] = useState(false);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cart animation
  useEffect(() => {
    if (totalItems === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsBumped(true);
    const timer = setTimeout(() => setIsBumped(false), 300);
    return () => clearTimeout(timer);
  }, [totalItems]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setProductsError(null);

      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, category, price, discount_price, active, product_images(storage_path, is_primary, sort_order)'
        )
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setProductsError(error.message);
        setProducts([]);
      } else {
        const rows = (data ?? []) as ProductRowWithImages[];
        setProducts(rows.map(mapDbProductToStoreProduct));
      }
    };

    void fetchProducts();

    const channel = supabase
      .channel('public:header-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          void fetchProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_images' },
        () => {
          void fetchProducts();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchOpen(true);
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeColor = category === 'her' ? 'text-theme-pink' : 'text-theme-teal';
  const activeBg = category === 'her' ? 'bg-theme-pink' : 'bg-theme-teal';
  const hideCategoryToggle =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/product') ||
    location.pathname.startsWith('/contact') ||
    location.pathname.startsWith('/cart') ||
    location.pathname.startsWith('/checkout');

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-3 z-20">
            <div className="grid grid-cols-2 gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-900" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="w-3 h-3 rounded-full bg-rose-500" />
            </div>
            <div className="leading-tight">
              <div className="text-xl md:text-2xl font-serif font-bold tracking-[0.2em] text-accent">
                OPULENT
              </div>
              <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-gray-500">
                Reserved for Loyalty
              </div>
            </div>
          </Link>
        </div>

        {!hideCategoryToggle && (
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center bg-gray-100 rounded-full p-1 shadow-inner">
              <button
                onClick={() => setCategory('her')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  category === 'her'
                    ? 'bg-white text-theme-pink shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                For Her
              </button>
              <button
                onClick={() => setCategory('him')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  category === 'him'
                    ? 'bg-white text-theme-teal shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                For Him
              </button>
            </div>
          </div>
        )}

        {/* Right: Search + Icons */}
        <div className="flex-1 flex justify-end items-center gap-4">
          {/* Search Bar (Compact) */}
          <div className="hidden md:block relative w-64" ref={searchRef}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchOpen(true)}
              className={`w-full pl-9 pr-8 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-1 bg-gray-50 text-sm transition-all focus:border-gray-300`}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Search Dropdown Results */}
            {isSearchOpen && searchQuery && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-96 overflow-y-auto z-50">
                {productsError && (
                  <div className="p-3 text-xs text-red-500 border-b border-gray-100">
                    {productsError}
                  </div>
                )}
                {filteredProducts.length > 0 ? (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Products
                    </div>
                    {filteredProducts.map(product => (
                      <Link 
                        key={product.id} 
                        to={`/product/${product.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-md" />
                        <div>
                          <h4 className="text-sm font-medium text-accent">{product.name}</h4>
                          <p className="text-xs text-gray-500">KSh {product.price.toLocaleString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No products found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Icons */}
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden text-accent hover:text-gray-800 transition-colors"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="w-6 h-6" />
            </button>
            
            <Link to="/cart" className={`relative text-accent hover:${activeColor} transition-colors group`}>
              <ShoppingBag className={`w-6 h-6 transition-transform duration-300 ${isBumped ? 'scale-125 text-amber-500' : ''}`} />
              {totalItems > 0 && (
                <span className={`absolute -top-2 -right-2 ${activeBg} text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ${isBumped ? 'animate-bounce' : ''} group-hover:scale-110 transition-transform`}>
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {!hideCategoryToggle && (
        <div className="md:hidden flex justify-center pb-4 px-4">
          <div className="flex items-center bg-gray-100 rounded-full p-1 shadow-inner w-full max-w-xs">
              <button
                onClick={() => setCategory('her')}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  category === 'her'
                    ? 'bg-white text-theme-pink shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                For Her
              </button>
              <button
                onClick={() => setCategory('him')}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  category === 'him'
                    ? 'bg-white text-theme-teal shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                For Him
              </button>
            </div>
        </div>
      )}

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white p-4 border-b border-gray-100 shadow-lg z-40">
           <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-1 bg-gray-50 text-sm"
              autoFocus
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        </div>
      )}
    </header>
  );
};
