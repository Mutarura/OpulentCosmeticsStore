import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategory } from '../context/CategoryContext';
import { supabase } from '../lib/supabaseClient';

interface Banner {
  id: string;
  image_path: string;
  headline: string | null;
  subtext: string | null;
  cta_text: string | null;
  cta_link: string | null;
}

const BANNER_IMAGES_BUCKET = 'banner-images';

// Maps category to the Supabase section value
const sectionMap: Record<string, string> = {
  her: 'hers',
  him: 'his',
  accessories: 'accessories',
};

// Active dot / CTA hover color per category
const activeColorMap: Record<string, string> = {
  her: 'bg-theme-pink',
  him: 'bg-theme-teal',
  accessories: 'bg-theme-orange',
};

const ctaHoverMap: Record<string, string> = {
  her: 'hover:text-theme-pink',
  him: 'hover:text-theme-teal',
  accessories: 'hover:text-theme-orange',
};

// Fallback banner shown when no banners exist in Supabase yet
const fallbackBanners: Record<string, Banner> = {
  her: {
    id: 'fallback-her',
    image_path: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1920&auto=format&fit=crop',
    headline: 'Exclusive Collection for Her',
    subtext: 'Discover our curated selection of luxury beauty essentials.',
    cta_text: 'Shop Now',
    cta_link: '/products/her',
  },
  him: {
    id: 'fallback-him',
    image_path: 'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?q=80&w=1920&auto=format&fit=crop',
    headline: 'Premium Selection for Him',
    subtext: 'Sophisticated grooming products for the modern gentleman.',
    cta_text: 'Shop Now',
    cta_link: '/products/him',
  },
  accessories: {
    id: 'fallback-accessories',
    image_path: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1920&auto=format&fit=crop',
    headline: 'Curated Accessories',
    subtext: 'Chains, earrings, makeup bags and more — reserved for the discerning few.',
    cta_text: 'Shop Now',
    cta_link: '/products/accessories',
  },
};

export const HeroCarousel: React.FC = () => {
  const { category } = useCategory();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Banner[]>([]);

  const activeColor = activeColorMap[category] ?? 'bg-theme-pink';
  const ctaHover = ctaHoverMap[category] ?? 'hover:text-theme-pink';
  const section = sectionMap[category] ?? 'hers';

  useEffect(() => {
    let isMounted = true;

    const fetchBanners = async () => {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('section', section)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (!isMounted) return;

      if (data && data.length > 0) {
        setSlides(data as Banner[]);
      } else {
        // Fall back to a static default slide so the carousel is never empty
        setSlides([fallbackBanners[category] ?? fallbackBanners.her]);
      }
      setCurrentSlide(0);
    };

    void fetchBanners();

    const channel = supabase
      .channel('public:banners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        void fetchBanners();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [category, section]);

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

  const getImageUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    return supabase.storage.from(BANNER_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  // Loading state — only shown briefly before fallback kicks in
  if (slides.length === 0) {
    return (
      <div className="h-[500px] w-full bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative h-[420px] md:h-[500px] w-full overflow-hidden bg-gray-100">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/25 z-10" />

          {/* Image */}
          <img
            src={getImageUrl(slide.image_path)}
            alt={slide.headline || 'Banner'}
            className="w-full h-full object-cover"
          />

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center z-20 text-center px-4">
            <div className="max-w-2xl animate-fade-in-up">
              {slide.headline && (
                <h2 className="text-3xl md:text-6xl font-serif font-bold text-white mb-4 drop-shadow-md leading-tight">
                  {slide.headline}
                </h2>
              )}
              {slide.subtext && (
                <p className="text-base md:text-xl text-white/90 mb-8 font-light drop-shadow-sm">
                  {slide.subtext}
                </p>
              )}
              {slide.cta_text && (
                slide.cta_link ? (
                  <Link
                    to={slide.cta_link}
                    className={`inline-block px-8 py-3 rounded-full bg-white text-accent font-medium hover:scale-105 transition-transform shadow-lg ${ctaHover}`}
                  >
                    {slide.cta_text}
                  </Link>
                ) : (
                  <button
                    className={`px-8 py-3 rounded-full bg-white text-accent font-medium hover:scale-105 transition-transform shadow-lg ${ctaHover}`}
                  >
                    {slide.cta_text}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Arrows — only show if more than 1 slide */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/30 backdrop-blur-sm text-white hover:bg-white hover:text-accent transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/30 backdrop-blur-sm text-white hover:bg-white hover:text-accent transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots — only show if more than 1 slide */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? `${activeColor} w-6`
                  : 'w-3 bg-white/50 hover:bg-white'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};