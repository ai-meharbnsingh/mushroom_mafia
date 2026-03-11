import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Leaf, Target, Eye, Zap, Users, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Hero */}
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
            >
              <Leaf className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">Our Story</span>
            </motion.div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Transforming Mushroom Farming with <span className="text-gradient">Technology</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
              We started as mushroom farmers ourselves. After losing entire flushes to undetected temperature spikes
              at 3 AM, we built the monitoring system we wished existed. Today, Mushroom Ki Mandi is the operating
              system for modern mushroom agriculture.
            </p>
          </div>

          {/* Mission, Vision, Values */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {[
              {
                icon: Target,
                title: 'Our Mission',
                description: 'To eliminate crop loss from environmental failures by giving every mushroom farmer — from a single-room grower to a 50-room commercial operation — access to enterprise-grade climate intelligence.',
                color: 'cyan',
              },
              {
                icon: Eye,
                title: 'Our Vision',
                description: 'To build the Global Mushroom Mandi Network — a connected ecosystem where verified yield data unlocks financing, insurance, and direct market access for growers worldwide.',
                color: 'green',
              },
              {
                icon: Zap,
                title: 'Our Approach',
                description: 'Hardware-agnostic, farmer-first. We build tools that work with your existing setup, speak your language, and pay for themselves within the first prevented crop loss.',
                color: 'purple',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="glass-card rounded-2xl p-8"
              >
                <div className={`w-14 h-14 rounded-xl bg-${item.color}-500/20 flex items-center justify-center mb-6`}>
                  <item.icon className={`w-7 h-7 text-${item.color}-400`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Numbers */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-10 mb-20"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-10">By the Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '24/7', label: 'Monitoring Uptime' },
                { value: '30s', label: 'Alert Response Time' },
                { value: '6+', label: 'Growth Stages Tracked' },
                { value: '100%', label: 'Data Ownership' },
              ].map((stat, index) => (
                <div key={index}>
                  <div className="text-3xl font-bold text-gradient mb-2">{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Team */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl font-bold text-white mb-4">Built by Farmers, for Farmers</h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-10">
              Our team combines deep mycology knowledge with IoT engineering expertise.
              We've spent years in growing rooms, and we understand the challenges firsthand.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Leaf, role: 'Agriculture & Mycology', desc: 'Growth phase expertise, climate optimization, yield analysis' },
                { icon: Zap, role: 'IoT & Hardware', desc: 'ESP32 firmware, sensor calibration, relay automation' },
                { icon: Globe, role: 'Platform & Cloud', desc: 'Real-time dashboards, data pipelines, secure infrastructure' },
              ].map((team, index) => (
                <div key={index} className="glass-card rounded-xl p-6">
                  <team.icon className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
                  <h4 className="text-white font-semibold mb-2">{team.role}</h4>
                  <p className="text-slate-400 text-sm">{team.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center glass-card rounded-2xl p-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">Want to Join Our Journey?</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Whether you're a farmer looking to modernize, an engineer who loves IoT,
              or an investor passionate about agri-tech — we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button className="bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white px-8">
                  Get in Touch
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/blog">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8">
                  <Users className="mr-2 w-4 h-4" />
                  Read Our Blog
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
