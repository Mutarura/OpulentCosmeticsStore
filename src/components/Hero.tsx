import React from 'react';
import { Link } from 'react-router-dom';

export const Hero: React.FC = () => {
  return (
    <section className="relative h-[70vh] w-full bg-primary overflow-hidden">
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1596462502278-27bfdd403348?q=80&w=1920&auto=format&fit=crop" 
          alt="Hero Background" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/60 to-transparent" />
      </div>
      
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-xl space-y-6">
          <span className="inline-block px-3 py-1 bg-white/80 backdrop-blur-sm text-accent text-xs font-bold uppercase tracking-widest rounded-full">New Collection</span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-accent leading-tight">
            Redefine Your <br/> <span className="text-secondary">Beauty</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-md">
            Discover our new seasonal collection crafted for elegance and designed to express your unique style.
          </p>
          <div className="flex gap-4 pt-4">
            <Link to="#her" className="px-8 py-3 bg-accent text-white font-medium rounded-full hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
              Shop For Her
            </Link>
            <Link to="#him" className="px-8 py-3 bg-white text-accent font-medium rounded-full hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
              Shop For Him
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
