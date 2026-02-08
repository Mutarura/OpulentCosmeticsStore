import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Product } from '../data/products';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Star } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
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

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('products')
        .select(
          'id, name, category, price, discount_price, active, product_images(storage_path, is_primary, sort_order)'
        )
        .eq('id', id)
        .eq('active', true)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (queryError || !data) {
        setError(queryError?.message ?? 'Product not found');
        setProduct(null);
        setRelatedProducts([]);
        setLoading(false);
        return;
      }

      const row = data as ProductRowWithImages;
      const mappedProduct = mapDbProductToStoreProduct(row);
      setProduct(mappedProduct);

      const { data: relatedData } = await supabase
        .from('products')
        .select(
          'id, name, category, price, discount_price, active, product_images(storage_path, is_primary, sort_order)'
        )
        .eq('category', row.category)
        .eq('active', true)
        .neq('id', row.id)
        .limit(4);

      if (!isMounted) {
        return;
      }

      const relatedRows = (relatedData ?? []) as ProductRowWithImages[];
      setRelatedProducts(relatedRows.map(mapDbProductToStoreProduct));
      setLoading(false);
    };

    void fetchProduct();

    const channel = supabase
      .channel(`product-detail:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `id=eq.${id}` },
        () => {
          void fetchProduct();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_images', filter: `product_id=eq.${id}` },
        () => {
          void fetchProduct();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Product not found
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading product...
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {error ?? 'Product not found'}
      </div>
    );
  }

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  const handleIncrement = () => {
    setQuantity(q => q + 1);
  };

  return (
    <div className="pt-8 pb-20">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-8">
          <Link to="/" className="hover:text-accent">Home</Link> / 
          <span className="mx-2">{product.category === 'Her' ? 'For Her' : 'For Him'}</span> / 
          <span className="text-accent ml-2 font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 mb-20">
          {/* Image */}
          <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-[4/5] md:aspect-auto md:h-[600px]">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-yellow-400 mb-4">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <span className="text-gray-400 text-xs ml-2">(128 reviews)</span>
            </div>

            <h1 className="text-4xl font-serif font-bold text-accent mb-4">{product.name}</h1>
            <p className="text-2xl text-secondary font-medium mb-6">
              KSh {product.price.toLocaleString()}
            </p>
            
            <p className="text-gray-500 leading-relaxed mb-8">
              {product.description}
              <br /><br />
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex items-center border border-gray-200 rounded-full w-max">
                <button 
                  onClick={handleDecrement}
                  className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-accent transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-medium text-accent">{quantity}</span>
                <button 
                  onClick={handleIncrement}
                  className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-accent transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button 
                onClick={() => addToCart(product, quantity)}
                className="flex-1 bg-accent text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
              >
                Add to Cart
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-3 text-sm text-gray-500">
              <p><span className="font-medium text-accent">Category:</span> {product.category === 'Her' ? 'Women' : 'Men'}</p>
              <p><span className="font-medium text-accent">Availability:</span> In Stock</p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div>
          <h3 className="text-2xl font-serif font-bold text-accent mb-8">Related Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
