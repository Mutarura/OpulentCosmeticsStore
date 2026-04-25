import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { SEO } from '../components/SEO';

export const Contact: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch('https://formspree.io/f/mqewnvvw', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-rose-50 to-slate-50 py-16">
      <SEO
        title="Contact Opulent Cosmetics | Customer Care Kenya"
        description="Get in touch with Opulent Cosmetics for orders, support, and store information. We're here to help."
        canonicalPath="/contact"
      />
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.28em] uppercase text-gray-600 mb-3">
              ENQUIRIES & SUPPORT
            </p>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-4">
              Contact Opulent
            </h1>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Have a question about an order, a product, or stocking Opulent? Share a few details below and we will get back to you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Left — Contact Info */}
            <div className="bg-white rounded-2xl p-6 shadow-md h-fit">
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-6">Get in touch</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-rose-50 text-rose-500 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Visit Us</h4>
                    <p className="text-gray-600 text-sm">Two Rivers Mall, Nairobi</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-rose-50 text-rose-500 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Call Us</h4>
                    <p className="text-gray-600 text-sm">0773 198 364</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-rose-50 text-rose-500 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Email Us</h4>
                    
                      href="mailto:opulentcosmetics2016@gmail.com"
                      className="text-gray-600 text-sm hover:text-slate-900 transition-colors"
                    
                      opulentcosmetics2016@gmail.com
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Enquiry Form */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Send an enquiry</h3>
              <p className="text-sm text-slate-600 mb-6">
                Share as much context as you can — it helps us respond quickly and accurately.
              </p>

              {status === 'success' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <Send className="w-7 h-7 text-green-500" />
                  </div>
                  <h4 className="text-lg font-serif font-bold text-slate-900 mb-2">Message Sent!</h4>
                  <p className="text-sm text-gray-500 mb-6">
                    Thank you for reaching out. We will get back to you shortly.
                  </p>
                  <button
                    onClick={() => setStatus('idle')}
                    className="text-sm text-slate-600 underline hover:text-slate-900"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-900/40 bg-white text-sm"
                      placeholder="Your name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-900/40 bg-white text-sm"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-800">
                          Phone
                        </label>
                        <span className="text-[10px] text-gray-400">WhatsApp preferred</span>
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-900/40 bg-white text-sm"
                        placeholder="07..."
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-800 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-900/40 bg-white text-sm"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-800 mb-1">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-900/40 bg-white resize-none text-sm"
                      placeholder="Write your message here..."
                    />
                  </div>

                  {status === 'error' && (
                    <p className="text-sm text-red-500 text-center">
                      Something went wrong. Please WhatsApp us at 0773 198 364.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full py-3 px-6 text-white font-medium rounded-full shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span>{status === 'sending' ? 'Sending...' : 'Send Message'}</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </div>
  );
};