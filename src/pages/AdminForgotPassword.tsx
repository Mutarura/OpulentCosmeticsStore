import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export const AdminForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.opulentcosmetics.shop/admin/reset-password',
    });
    if (error) { setStatus('error'); }
    else { setStatus('sent'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-serif font-bold text-accent mb-1">Reset Password</h1>
        <p className="text-xs text-gray-500 mb-6">Enter your admin email and we will send you a reset link.</p>
        {status === 'sent' ? (
          <div className="text-center py-4">
            <p className="text-sm text-green-600 font-medium mb-2">Reset link sent!</p>
            <p className="text-xs text-gray-500">Check your email and click the link to set a new password.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@email.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {status === 'error' && (
              <p className="text-xs text-red-500">Something went wrong. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-2 rounded-full bg-accent text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <div className="mt-4 text-center">
          <a href="/admin/login" className="text-xs text-gray-400 hover:text-accent">Back to login</a>
        </div>
      </div>
    </div>
  );
};