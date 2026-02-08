import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export const HeroCarousel: React.FC = () => {
  const { category } = useCategory();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Banner[]>([]);
  
  const activeColor = category === 'her' ? 'bg-theme-pink' : 'bg-theme-teal';

  useEffect(() => {
    let isMounted = true;

    const fetchBanners = async () => {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('section', category === 'her' ? 'hers' : 'his')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (isMounted && data) {
        setSlides(data as Banner[]);
        setCurrentSlide(0);
      }
    };

    fetchBanners();

    const channel = supabase
      .channel('public:banners')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        () => {
          fetchBanners();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [category]);

  useEffect(() => {
    if (slides.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    return supabase.storage.from(BANNER_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  if (slides.length === 0) {
    return (
      <div className="h-[500px] w-full bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading banners...</div>
      </div>
    );
  }

  return (
    <div className="relative h-[500px] w-full overflow-hidden bg-gray-100">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute inset-0 bg-black/20 z-10" />
          <img
            src={getImageUrl(slide.image_path)}
            alt={slide.headline || 'Banner'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center z-20 text-center">
            <div className="max-w-2xl px-4 animate-fade-in-up">
              {slide.headline && (
                <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 drop-shadow-md">
                  {slide.headline}
                </h2>
              )}
              {slide.subtext && (
                <p className="text-xl text-white/90 mb-8 font-light drop-shadow-sm">
                  {slide.subtext}
                </p>
              )}
              {slide.cta_text && (
                <button className={`px-8 py-3 rounded-full bg-white text-accent font-medium hover:scale-105 transition-transform shadow-lg ${category === 'her' ? 'hover:text-theme-pink' : 'hover:text-theme-teal'}`}>
                  {slide.cta_text}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/30 backdrop-blur-sm text-white hover:bg-white hover:text-accent transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/30 backdrop-blur-sm text-white hover:bg-white hover:text-accent transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? `${activeColor} w-6` : 'bg-white/50 hover:bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
