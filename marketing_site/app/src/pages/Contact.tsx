import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PAGE_CONFIG: Record<string, { title: string; highlight: string; subtitle: string; defaultMessage: string; inquiryType: string }> = {
  demo: {
    title: 'Request a',
    highlight: 'Demo',
    subtitle: 'See how Mushroom Ki Mandi can transform your farm. Fill out the form and our team will schedule a personalized demo.',
    defaultMessage: 'I would like to schedule a demo of the Mushroom Ki Mandi platform.',
    inquiryType: 'DEMO',
  },
  enterprise: {
    title: 'Request',
    highlight: 'Enterprise Demo',
    subtitle: 'Get a tailored walkthrough for large-scale commercial operations with custom API, on-premise options, and dedicated support.',
    defaultMessage: 'I am interested in the Enterprise / Commercial Farm plan and would like a detailed demo.',
    inquiryType: 'ENTERPRISE',
  },
  sales: {
    title: 'Contact',
    highlight: 'Sales',
    subtitle: 'Talk to our sales team about custom pricing, volume discounts, and partnership opportunities.',
    defaultMessage: 'I would like to discuss pricing and plans for my mushroom farm.',
    inquiryType: 'SALES',
  },
  trial: {
    title: 'Start Your',
    highlight: 'Free Trial',
    subtitle: 'Get started with a 14-day free trial. No credit card required. Our team will help you set up.',
    defaultMessage: 'I would like to start a free 14-day trial of the platform.',
    inquiryType: 'TRIAL',
  },
};

const DEFAULT_CONFIG = {
  title: 'Get in',
  highlight: 'Touch',
  subtitle: "Whether you're ready to modernize your farm or just want to learn more, we're here to help.",
  defaultMessage: '',
  inquiryType: 'GENERAL',
};

export default function Contact() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || '';
  const config = PAGE_CONFIG[type] || DEFAULT_CONFIG;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    farmSize: '',
    message: config.defaultMessage,
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(prev => ({ ...prev, message: config.defaultMessage }));
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const payload = {
      ...formData,
      inquiry_type: config.inquiryType,
      farm_size: formData.farmSize,
    };

    try {
      // Send email via Vercel serverless function
      const emailPromise = fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, inquiryType: config.inquiryType }),
      });

      // Save to backend DB (fire-and-forget, don't block on failure)
      const dbPromise = fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_type: config.inquiryType,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          farm_size: formData.farmSize || null,
          message: formData.message,
        }),
      }).catch(() => {});

      const [emailRes] = await Promise.all([emailPromise, dbPromise]);

      if (!emailRes.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {config.title} <span className="text-gradient">{config.highlight}</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {config.subtitle}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-10">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Email Us</h3>
                    <a href="mailto:hello@mushroomkimandi.in" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">
                      hello@mushroomkimandi.in
                    </a>
                  </div>
                </div>
                <p className="text-slate-500 text-sm">We respond within 24 hours on business days.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Call Us</h3>
                    <a href="tel:+919876543210" className="text-slate-400 hover:text-green-400 text-sm transition-colors">
                      +91 98765 43210
                    </a>
                  </div>
                </div>
                <p className="text-slate-500 text-sm">Mon-Sat, 9:00 AM - 6:00 PM IST</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Visit Us</h3>
                    <p className="text-slate-400 text-sm">Punjab, India</p>
                  </div>
                </div>
                <p className="text-slate-500 text-sm">Farm visits available by appointment.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">WhatsApp</h3>
                    <a href="https://wa.me/919876543210" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                      Chat with us on WhatsApp
                    </a>
                  </div>
                </div>
                <p className="text-slate-500 text-sm">Quick queries and demo scheduling.</p>
              </motion.div>
            </div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="glass-card rounded-2xl p-8">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                      <Send className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {type === 'demo' || type === 'enterprise' ? 'Demo Request Sent!' : type === 'trial' ? 'Trial Request Sent!' : 'Message Sent!'}
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Thanks for reaching out. Our team will get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: '', email: '', phone: '', farmSize: '', message: config.defaultMessage });
                      }}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      Send Another Message
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-6">
                      {type === 'demo' ? 'Schedule Your Demo' : type === 'enterprise' ? 'Enterprise Demo Request' : type === 'sales' ? 'Talk to Sales' : type === 'trial' ? 'Start Free Trial' : 'Send Us a Message'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Email *</label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            placeholder="+91 XXXXX XXXXX"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Farm Size</label>
                          <select
                            value={formData.farmSize}
                            onChange={(e) => setFormData({ ...formData, farmSize: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="">Select size</option>
                            <option value="hobby">Home / Hobby (1-2 rooms)</option>
                            <option value="small">Small Farm (3-5 rooms)</option>
                            <option value="medium">Medium Farm (6-15 rooms)</option>
                            <option value="large">Large Commercial (16-50 rooms)</option>
                            <option value="enterprise">Enterprise (50+ rooms)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Message *</label>
                        <textarea
                          required
                          rows={5}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                          placeholder="Tell us about your farm and how we can help..."
                        />
                      </div>

                      {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white py-6 text-lg disabled:opacity-50"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        {isSubmitting ? 'Sending...' : type === 'demo' || type === 'enterprise' ? 'Request Demo' : type === 'trial' ? 'Start Trial' : 'Send Message'}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
