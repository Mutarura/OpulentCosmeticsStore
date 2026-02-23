import React from 'react';
import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategory } from '../context/CategoryContext';

export const Footer: React.FC = () => {
  const { category } = useCategory();
  
  const hoverColor = category === 'her' ? 'hover:text-theme-pink' : 'hover:text-theme-teal';

  return (
    <footer className="bg-gray-50 border-t border-gray-100 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-serif font-bold text-accent">
                Opulent<span className={category === 'her' ? 'text-theme-pink' : 'text-theme-teal'}>.</span>
              </h3>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mt-1">
                Reserved for Loyalty
              </p>
            </div>
            <p className="font-serif font-semibold text-accent mt-4">Follow Us</p>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={`inline-block text-gray-400 transition-colors ${hoverColor}`}>
              <Instagram className="w-6 h-6" />
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-semibold text-accent mb-6">Quick Links</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><Link to="/about" className={`transition-colors ${hoverColor}`}>About Us</Link></li>
              <li><Link to="/" className={`transition-colors ${hoverColor}`}>For Her Collection</Link></li>
              <li><Link to="/" className={`transition-colors ${hoverColor}`}>For Him Collection</Link></li>
              <li><Link to="/contact" className={`transition-colors ${hoverColor}`}>Enquiry</Link></li>
            </ul>
          </div>

          {/* Get In Touch */}
          <div>
            <h4 className="font-serif font-semibold text-accent mb-6">Get In Touch</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li className="flex items-center gap-3">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Two Rivers Mall, Nairobi</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 shrink-0" />
                <span>0773 198 364</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0" />
                <span>hello@opulentcosmetics.ke</span>
              </li>
              <li className="pt-2">
                <a 
                  href="https://wa.me/254773198364" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 font-medium transition-colors ${category === 'her' ? 'text-theme-pink hover:text-pink-700' : 'text-theme-teal hover:text-teal-700'}`}
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Opulent Cosmetics KE. All rights reserved.</p>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            Made with <span className="text-red-500">♥</span> in Kenya
          </div>
        </div>
      </div>
    </footer>
  );
};
