import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export const Success: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. We have received your order and will begin processing it shortly.
        </p>
        
        <div className="space-y-3">
          <Link 
            to="/" 
            className="block w-full py-3 px-6 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            Continue Shopping
          </Link>
          
          <Link 
            to="/contact" 
            className="block w-full py-3 px-6 bg-white text-slate-900 border border-gray-200 font-medium rounded-full hover:bg-gray-50 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};
