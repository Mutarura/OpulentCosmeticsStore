import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Bell, Check } from 'lucide-react';
import type { Product } from '../data/products';
import { useCart } from '../context/CartContext';
import { useCategory } from '../context/CategoryContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { category } = useCategory();
  const [isAdded, setIsAdded] = React.useState(false);
  
  const isOutOfStock = product.tag === 'Out of Stock';
  
  const activeBtnColor = category === 'her' 
    ? 'bg-theme-pink hover:bg-pink-600' 
    : 'bg-theme-teal hover:bg-teal-700';

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    
    addToCart(product);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Visual feedback
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden aspect-[4/5]">
        <img 
          src={product.image} 
          alt={product.name} 
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? 'opacity-70 grayscale' : ''}`}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        
        {product.tag && (
          <span className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold text-white rounded-full shadow-sm ${
            product.tag === 'New' ? 'bg-blue-500' : 
            product.tag === 'Bestseller' ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            {product.tag}
          </span>
        )}
      </Link>
      
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-serif font-medium text-lg text-accent group-hover:text-gray-900 transition-colors line-clamp-1 mb-1">{product.name}</h3>
        </Link>
        
        {/* Rating */}
        <div className="flex items-center mb-2">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-3.5 h-3.5 ${i < Math.round(product.rating || 0) ? 'fill-current' : 'text-gray-200 fill-gray-200'}`} 
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-1">({product.rating})</span>
        </div>
        
        <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">{product.description}</p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
          {product.originalPrice && product.originalPrice > product.price ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-400 line-through">
                KSh {product.originalPrice.toLocaleString()}
              </span>
              <span className="font-bold text-lg text-accent">
                KSh {product.price.toLocaleString()}
              </span>
              {product.discountPercent && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  -{product.discountPercent}%
                </span>
              )}
            </div>
          ) : (
            <span className="font-bold text-lg text-accent">
              KSh {product.price.toLocaleString()}
            </span>
          )}
        </div>

        <button 
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdded}
          className={`w-full mt-4 py-2.5 text-white font-medium text-sm rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 ${
            isOutOfStock 
              ? 'bg-gray-400 cursor-not-allowed' 
              : isAdded 
                ? 'bg-green-500 hover:bg-green-600'
                : `${activeBtnColor} shadow-${category === 'her' ? 'pink' : 'teal'}/20`
          }`}
        >
          {isOutOfStock ? (
            <>
              <Bell className="w-4 h-4" />
              <span>Notify Me</span>
            </>
          ) : isAdded ? (
            <>
              <Check className="w-4 h-4" />
              <span>Added</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              <span>Buy Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
