import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Product } from '../data/products';
import { useCategory } from '../context/CategoryContext';
import { supabase } from '../lib/supabaseClient';
import { ProductCard } from '../components/ProductCard';

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
  description?: string | null;
  is_bundle?: boolean;
};

const PRODUCT_IMAGES_BUCKET = 'product-images';

const getFallbackImageForProduct = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('set') || lower.includes('kit') || lower.includes('bundle')) {
    return 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=900&auto=format&fit=crop';
  }
  if (lower.includes('body') || lower.includes('polish') || lower.includes('scrub') || lower.includes('bath')) {
    return 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa5?q=80&w=900&auto=format&fit=crop';
  }
  if (lower.includes('mist') || lower.includes('spray')) {
    return 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=900&auto=format&fit=crop';
  }
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
    category: row.category === 'hers' ? 'Her' : 'Him',
    image: imageUrl,
    rating: 4.8,
    is_bundle: row.is_bundle ?? false,
  };
};

export const ProductsCollection: React.FC = () => {
  const params = useParams<{ gender: 'her' | 'him' }>();
  const genderParam = params.gender === 'him' ? 'him' : 'her';
  const displayCategory = genderParam === 'him' ? 'Him' : 'Her';
  const { setCategory } = useCategory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategory(genderParam);
  }, [genderParam, setCategory]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('products')
        .select(
          'id, name, category, price, discount_price, active, description, is_bundle, product_images(storage_path, is_primary, sort_order)'
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
        const mapped = rows.map(mapDbProductToStoreProduct).filter(
          product => product.category === displayCategory
        );
        setProducts(mapped);
      }

      setLoading(false);
    };

    void fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [displayCategory]);

  return (
    <div className="min-h-screen bg-white pt-8 pb-16">
      <div className="container mx-auto px-4">
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

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-accent mb-2">
          {displayCategory === 'Her' ? 'For Her Collection' : 'For Him Collection'}
        </h1>
        <p className="text-gray-500 mb-8">
          Browse the full range of curated products reserved for loyalty.
        </p>

        {error && (
          <div className="mb-6 text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-xl text-gray-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-xl text-gray-500">No products found in this collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

