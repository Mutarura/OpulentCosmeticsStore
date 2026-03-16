import React from 'react';
import { useCategory } from '../context/CategoryContext';

const brands = {
  her: [
    'NIVEA', 'The Body Shop', 'Garnier', 'CeraVe', 'Bath & Body Works', "Victoria's Secret", 'Dove',
    'NIVEA', 'The Body Shop', 'Garnier', 'CeraVe', 'Bath & Body Works', "Victoria's Secret", 'Dove',
  ],
  him: [
    'Hugo Boss', 'Dove Men+Care', 'NIVEA Men', "L'Oréal Men Expert", 'Old Spice', 'Axe', 'Gillette',
    'Hugo Boss', 'Dove Men+Care', 'NIVEA Men', "L'Oréal Men Expert", 'Old Spice', 'Axe', 'Gillette',
  ],
  accessories: [
    'Pandora', 'Swarovski', 'Zara', 'H&M', 'ALDO', 'Charles & Keith', 'Lovisa',
    'Pandora', 'Swarovski', 'Zara', 'H&M', 'ALDO', 'Charles & Keith', 'Lovisa',
  ],
};

export const BrandsCarousel: React.FC = () => {
  const { category } = useCategory();
  const currentBrands = brands[category];

  const hoverColor =
    category === 'her'
      ? 'group-hover:text-theme-pink'
      : category === 'accessories'
      ? 'group-hover:text-theme-orange'
      : 'group-hover:text-theme-teal';

  return (
    <section className="py-12 border-t border-gray-100 bg-white overflow-hidden">
      <div className="relative w-full">
        <div className="flex animate-scroll whitespace-nowrap">
          {currentBrands.map((brand, index) => (
            <div
              key={`${brand}-${index}`}
              className="mx-8 md:mx-12 inline-flex items-center justify-center group cursor-default"
            >
              <span
                className={`text-xl md:text-2xl font-serif font-bold text-gray-300 transition-colors duration-300 ${hoverColor}`}
              >
                {brand}
              </span>
            </div>
          ))}
        </div>

        {/* Edge fade gradients */}
        <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white to-transparent z-10" />
      </div>
    </section>
  );
};