import React from 'react';
import { ShieldCheck, Sparkles, PackageCheck, Truck } from 'lucide-react';
import { useCategory } from '../context/CategoryContext';

const promises = [
  {
    icon: ShieldCheck,
    title: 'Authentic Products',
    description: 'Only genuine beauty, fragrance, and care essentials — no compromises.'
  },
  {
    icon: Sparkles,
    title: 'Carefully Curated',
    description: 'Every product is selected for quality, performance, and everyday use.'
  },
  {
    icon: PackageCheck,
    title: 'Fresh & Well Stored',
    description: 'Proper storage and regular restocking to preserve quality and longevity.'
  },
  {
    icon: Truck,
    title: 'Reliable Fulfillment',
    description: 'Fast, dependable processing and delivery you can count on.'
  }
];

export const StorePromise: React.FC = () => {
  const { category } = useCategory();
  
  const iconColor = category === 'her' ? 'text-theme-pink' : 'text-theme-teal';
  const hoverShadow = category === 'her' ? 'hover:shadow-theme-pink/10' : 'hover:shadow-theme-teal/10';

  return (
    <section className="py-20 bg-gray-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-accent mb-4">Our Store Promise</h2>
          <p className="text-gray-500 max-w-2xl mx-auto font-light">
            Thoughtfully curated products you can trust — every time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {promises.map((promise, index) => (
            <div 
              key={index}
              className={`bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${hoverShadow} animate-fade-in-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`mb-6 p-3 rounded-full bg-gray-50 w-16 h-16 flex items-center justify-center mx-auto lg:mx-0 ${iconColor}`}>
                <promise.icon className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 text-center lg:text-left">{promise.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed text-center lg:text-left">
                {promise.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
