import React, { useEffect, useReducer, useState } from 'react';
import { HeroCarousel } from '../components/HeroCarousel';
import { ProductCard } from '../components/ProductCard';
import { StorePromise } from '../components/StorePromise';
import { BrandsCarousel } from '../components/BrandsCarousel';
import type { Product } from '../data/products';
import { useSearch } from '../context/SearchContext';
import { useCategory } from '../context/CategoryContext';
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

const getFallbackImageForProduct = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('lipstick') || lower.includes('velvet')) {
    return 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=900&auto=format&fit=crop';
  }
  if (lower.includes('serum') || lower.includes('radiance')) {
    return 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa5?q=80&w=900&auto=format&fit=crop';
  }
  if (lower.includes('perfume') || lower.includes('essence') || lower.includes('cologne')) {
    return 'https://images.unsplash.com/photo-1612815154859-04f58d9a1fb4?q=80&w=900&auto=format&fit=crop';
  }
  if (lower.includes('cream') || lower.includes('moisturizer') || lower.includes('moisturiser')) {
    return 'https://images.unsplash.com/photo-1601049313729-4726f814104b?q=80&w=900&auto=format&fit=crop';
  }
  if (lower.includes('beard') || lower.includes('shaving')) {
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=900&auto=format&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=900&auto=format&fit=crop';
};

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

  const imageUrl = primaryImage
    ? supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(primaryImage.storage_path).data
        .publicUrl
    : getFallbackImageForProduct(row.name);

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

export const Home: React.FC = () => {
  const { searchQuery } = useSearch();
  const { category } = useCategory();
   const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleState, dispatchVisible] = useReducer(
    (
      state: { key: string; value: number },
      action:
        | { type: 'reset'; key: string }
        | { type: 'loadMore'; amount: number }
    ) => {
      if (action.type === 'reset') {
        if (state.key === action.key) {
          return state;
        }
        return { key: action.key, value: 8 };
      }
      if (action.type === 'loadMore') {
        return { ...state, value: state.value + action.amount };
      }
      return state;
    },
    { key: `${category}-${searchQuery}`, value: 8 }
  );

  const filterKey = `${category}-${searchQuery}`;

  useEffect(() => {
    dispatchVisible({ type: 'reset', key: filterKey });
  }, [filterKey]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('products')
        .select(
          'id, name, category, price, discount_price, active, product_images(storage_path, is_primary, sort_order)'
        )
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (queryError) {
        setError(queryError.message);
        setProducts([]);
      } else {
        const rows = (data ?? []) as ProductRowWithImages[];
        setProducts(rows.map(mapDbProductToStoreProduct));
      }

      setLoading(false);
    };

    void fetchProducts();

    const channel = supabase
      .channel('public:storefront-products')
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

  const normalizedCategory = category === 'her' ? 'Her' : 'Him';

  const filteredProducts = products.filter(product => {
    const matchesCategory = product.category === normalizedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const visibleCount = visibleState.value;
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMoreProducts = visibleCount < filteredProducts.length;

  const handleLoadMore = () => {
    dispatchVisible({ type: 'loadMore', amount: 8 });
  };

  return (
    <div className="min-h-screen pb-0 bg-white">
      <HeroCarousel key={category} />
      
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-accent mb-4">
            {category === 'her' ? 'Exclusive Collection for Her' : 'Premium Selection for Him'}
          </h2>
          <div className={`w-24 h-1 mx-auto rounded-full transition-colors duration-300 ${category === 'her' ? 'bg-theme-pink' : 'bg-theme-teal'}`} />
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            {category === 'her' 
              ? 'Discover our curated selection of beauty essentials designed to enhance your natural radiance.' 
              : 'Explore our range of sophisticated grooming products crafted for the modern gentleman.'}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-xl text-gray-500">Loading products...</p>
          </div>
        ) : visibleProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {visibleProducts.map((product, index) => (
                <div key={product.id} className="animate-fade-in-up" style={{ animationDelay: `${(index % 8) * 100}ms` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {hasMoreProducts && (
              <div className="mt-12 text-center animate-fade-in-up">
                <button 
                  onClick={handleLoadMore}
                  className={`px-8 py-3 rounded-full text-white font-medium shadow-md transition-all hover:scale-105 hover:shadow-lg ${
                    category === 'her' 
                      ? 'bg-theme-pink hover:bg-pink-600' 
                      : 'bg-theme-teal hover:bg-teal-600'
                  }`}
                >
                  Load More Products
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-xl text-gray-500">No products found in this category.</p>
          </div>
        )}
      </section>
      
      <StorePromise />
      <BrandsCarousel />
    </div>
  );
};
