import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Product } from '../data/products';
import { useCategory } from '../context/CategoryContext';
import { supabase } from '../lib/supabaseClient';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';

type ProductImageRow = {
  storage_path: string;
  is_primary: boolean | null;
  sort_order: number | null;
};

type ProductRowWithImages = {
  id: string;
  name: string;
  category: 'his' | 'hers' | 'accessories';
  subcategory?: string | null;
  price: number;
  discount_price: number | null;
  product_images?: ProductImageRow[] | null;
  description?: string | null;
  is_bundle?: boolean;
};

const PRODUCT_IMAGES_BUCKET = 'product-images';

const accessoriesFallbacks: Record<string, string> = { 
  'Chains & Necklaces': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=900&auto=format&fit=crop', 
  'Earrings': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=900&auto=format&fit=crop', 
  'Makeup Bags': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900&auto=format&fit=crop', 
  'Pouches': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=900&auto=format&fit=crop', 
  'Bonnets': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=900&auto=format&fit=crop', 
  'Nail Care': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=900&auto=format&fit=crop', 
  'Other': 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=900&auto=format&fit=crop', 
}; 

const getFallbackImageForProduct = (name: string, subcategory?: string) => {
  if (subcategory && accessoriesFallbacks[subcategory]) {
    return accessoriesFallbacks[subcategory];
  }
  const lower = name.toLowerCase();
  if (lower.includes('set') || lower.includes('kit') || lower.includes('bundle'))
    return 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('body') || lower.includes('polish') || lower.includes('scrub') || lower.includes('bath'))
    return 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa5?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('mist') || lower.includes('spray'))
    return 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('lipstick') || lower.includes('velvet'))
    return 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('serum') || lower.includes('radiance'))
    return 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa5?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('perfume') || lower.includes('essence') || lower.includes('cologne'))
    return 'https://images.unsplash.com/photo-1612815154859-04f58d9a1fb4?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('cream') || lower.includes('moisturizer') || lower.includes('moisturiser'))
    return 'https://images.unsplash.com/photo-1601049313729-4726f814104b?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('beard') || lower.includes('shaving'))
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('chain') || lower.includes('necklace') || lower.includes('earring'))
    return 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=900&auto=format&fit=crop';
  if (lower.includes('bag') || lower.includes('pouch'))
    return 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900&auto=format&fit=crop';
  return 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=900&auto=format&fit=crop';
};

const mapDbProductToStoreProduct = (row: ProductRowWithImages): Product => {
  const images = row.product_images ?? [];
  const sortedImages = [...images].sort((a, b) => {
    const aPrimary = a.is_primary ? 1 : 0;
    const bPrimary = b.is_primary ? 1 : 0;
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const primaryImage = sortedImages[0];
  const imageUrl = primaryImage
    ? supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(primaryImage.storage_path).data.publicUrl
    : getFallbackImageForProduct(row.name, row.subcategory ?? undefined);

  const base = Number(row.price);
  const discount = row.discount_price != null ? Number(row.discount_price) : null;
  const hasDiscount = discount != null && discount > 0 && discount < base;

  return {
    id: row.id,
    name: row.name,
    price: hasDiscount ? discount! : base,
    originalPrice: hasDiscount ? base : undefined,
    discountPercent: hasDiscount ? Math.round((1 - discount! / base) * 100) : undefined,
    description: row.description ?? '',
    category: row.category === 'hers' ? 'Her' : row.category === 'accessories' ? 'Accessories' : 'Him',
    image: imageUrl,
    rating: 4.8,
    subcategory: row.subcategory ?? undefined,
    is_bundle: row.is_bundle ?? false,
  };
};

// ─── Page config per gender param ───────────────────────────────────────────
type GenderParam = 'her' | 'him' | 'accessories';

const pageConfig: Record<GenderParam, {
  displayCategory: string;
  title: string;
  subtitle: string;
  accentBar: string;
  pillActive: string;
  pillActiveBorder: string;
  subcategories: string[];
  seoTitle: string;
  seoDescription: string;
}> = {
  her: {
    displayCategory: 'Her',
    title: 'For Her Collection',
    subtitle: 'Browse the full range of curated beauty essentials reserved for her.',
    accentBar: 'bg-theme-pink',
    pillActive: 'bg-theme-pink text-white',
    pillActiveBorder: 'border-theme-pink',
    subcategories: ['All', 'Perfumes & Mists', 'Body Creams', 'Face Care', 'Shower Care', 'Hair Care'],
    seoTitle: 'For Her Collection | Opulent Cosmetics',
    seoDescription: 'Shop curated luxury beauty essentials for women. Authentic premium cosmetics and skincare delivered across Kenya.',
  },
  him: {
    displayCategory: 'Him',
    title: 'For Him Collection',
    subtitle: 'Browse the full range of sophisticated grooming products for the modern gentleman.',
    accentBar: 'bg-theme-teal',
    pillActive: 'bg-theme-teal text-white',
    pillActiveBorder: 'border-theme-teal',
    subcategories: ['All', 'Colognes', 'Face Care', 'Shower Care', 'Grooming', 'Body Care'],
    seoTitle: 'For Him Collection | Opulent Cosmetics',
    seoDescription: 'Shop curated luxury grooming products for men. Authentic premium brands delivered across Kenya.',
  },
  accessories: {
    displayCategory: 'Accessories',
    title: 'Accessories',
    subtitle: 'Chains, earrings, makeup bags, pouches and more — curated for the discerning few.',
    accentBar: 'bg-theme-orange',
    pillActive: 'bg-theme-orange text-white',
    pillActiveBorder: 'border-theme-orange',
    subcategories: ['All', 'Chains & Necklaces', 'Earrings', 'Makeup Bags', 'Pouches', 'Bonnets', 'Nail Care', 'Other'],
    seoTitle: 'Accessories | Opulent Cosmetics',
    seoDescription: 'Shop luxury accessories — chains, earrings, makeup bags and pouches. Delivered across Kenya.',
  },
};

export const ProductsCollection: React.FC = () => {
  const params = useParams<{ gender: string }>();
  const genderParam: GenderParam =
    params.gender === 'him' ? 'him' : params.gender === 'accessories' ? 'accessories' : 'her';

  const config = pageConfig[genderParam];
  const { setCategory } = useCategory();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState('All');

  // Sync header toggle to match the page we're on
  useEffect(() => {
    setCategory(genderParam);
  }, [genderParam, setCategory]);

  // Reset subcategory filter when switching collections
  useEffect(() => {
    setActiveSubcategory('All');
  }, [genderParam]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('products')
        .select('id, name, category, subcategory, price, discount_price, active, description, is_bundle, product_images(storage_path, is_primary, sort_order)')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (queryError) {
        setError(queryError.message);
        setProducts([]);
      } else {
        const rows = (data ?? []) as ProductRowWithImages[];
        const mapped = rows
          .map(mapDbProductToStoreProduct)
          .filter(p => p.category === config.displayCategory);
        setProducts(mapped);
      }

      setLoading(false);
    };

    void fetchProducts();

    return () => { isMounted = false; };
  }, [config.displayCategory]);

  // Apply subcategory filter on top of the fetched products
  const displayedProducts =
    activeSubcategory === 'All'
      ? products
      : products.filter(p => p.subcategory === activeSubcategory);

  return (
    <div className="min-h-screen bg-white pt-8 pb-16">
      <SEO
        title={config.seoTitle}
        description={config.seoDescription}
        canonicalPath={`/products/${genderParam}`}
      />
      <div className="container mx-auto px-4">

        {/* Back link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300">
              ←
            </span>
            <span>Back to Main Site</span>
          </Link>
        </div>

        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-accent mb-2">
          {config.title}
        </h1>
        <div className={`w-16 h-1 rounded-full mb-3 transition-colors duration-300 ${config.accentBar}`} />
        <p className="text-gray-500 mb-6">{config.subtitle}</p>

        {/* Subcategory pills — horizontally scrollable */}
        <div className="flex gap-2 mb-12 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 flex-nowrap">
          {config.subcategories.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSubcategory(sub)}
              className={`px-6 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 border ${
                activeSubcategory === sub
                  ? `${config.pillActive} ${config.pillActiveBorder} shadow-md scale-105`
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {error && <div className="mb-6 text-sm text-red-500">{error}</div>}

        {loading ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-xl text-gray-500">Loading products...</p>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-xl text-gray-500">
              {activeSubcategory === 'All'
                ? 'No products found in this collection.'
                : `No products found in "${activeSubcategory}".`}
            </p>
            {activeSubcategory !== 'All' && (
              <button
                onClick={() => setActiveSubcategory('All')}
                className="mt-4 text-sm text-gray-400 underline hover:text-accent"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Product count */}
            <p className="text-xs text-gray-400 mb-4">
              {displayedProducts.length} {displayedProducts.length === 1 ? 'product' : 'products'}
              {activeSubcategory !== 'All' && ` in "${activeSubcategory}"`}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {displayedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};