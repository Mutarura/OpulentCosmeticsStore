import React, { useState } from 'react';
import { useCategory } from '../context/CategoryContext';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export const Contact: React.FC = () => {
  const { category } = useCategory();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    alert('Thank you for your enquiry. We will get back to you shortly!');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const accentColor = category === 'her' ? 'text-theme-pink' : 'text-theme-teal';
  const btnColor = category === 'her' ? 'bg-theme-pink hover:bg-pink-600' : 'bg-theme-teal hover:bg-teal-600';
  const ringColor = category === 'her' ? 'focus:ring-theme-pink' : 'focus:ring-theme-teal';

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-accent mb-4">Contact Us</h1>
            <p className="text-gray-500">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-serif font-bold text-accent mb-6">Get In Touch</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full bg-gray-50 ${accentColor}`}>
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Visit Us</h4>
                      <p className="text-gray-500">Nairobi, Kenya</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full bg-gray-50 ${accentColor}`}>
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Call Us</h4>
                      <p className="text-gray-500">+254 700 000 000</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full bg-gray-50 ${accentColor}`}>
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Email Us</h4>
                      <p className="text-gray-500">hello@opulentcosmetics.ke</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enquiry Form */}
            <div className="bg-gray-50 p-8 rounded-2xl">
              <h3 className="text-xl font-serif font-bold text-accent mb-6">Send an Enquiry</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 ${ringColor} bg-white`}
                    placeholder="Your name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 ${ringColor} bg-white`}
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 ${ringColor} bg-white`}
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 ${ringColor} bg-white resize-none`}
                    placeholder="Write your message here..."
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 px-6 text-white font-medium rounded-full shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 ${btnColor}`}
                >
                  <span>Send Message</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};