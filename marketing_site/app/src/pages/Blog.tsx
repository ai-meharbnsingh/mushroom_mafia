import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const blogPosts = [
  {
    title: 'Why Temperature Control Is the #1 Factor in Mushroom Yield',
    excerpt: 'A 2°C deviation during Spawn Run can reduce yields by up to 40%. Learn how precision monitoring prevents crop loss and maximizes your Grade-A output.',
    date: 'March 8, 2026',
    readTime: '5 min read',
    tag: 'Climate Science',
    color: 'cyan',
    image: '/feature-phases.jpg',
  },
  {
    title: 'From Manual Checks to IoT: A Commercial Farm\'s Journey',
    excerpt: 'How a 20-room button mushroom operation in Punjab eliminated overnight crop losses by switching from manual thermometers to automated IoT monitoring.',
    date: 'February 22, 2026',
    readTime: '7 min read',
    tag: 'Case Study',
    color: 'green',
    image: '/hero-mushroom-tech.jpg',
  },
  {
    title: 'Understanding Growth Phases: The Complete Mushroom Lifecycle',
    excerpt: 'From Inoculation to Harvest — a detailed breakdown of each growth stage, optimal climate parameters, and when to transition between phases.',
    date: 'February 10, 2026',
    readTime: '10 min read',
    tag: 'Education',
    color: 'purple',
    image: '/feature-sensors.jpg',
  },
  {
    title: 'OTA Updates: How We Keep Your Sensors Secure Without Farm Visits',
    excerpt: 'Our Over-the-Air update system pushes firmware patches to ESP32 nodes automatically. Here\'s how it works and why it matters for food safety compliance.',
    date: 'January 28, 2026',
    readTime: '4 min read',
    tag: 'Technology',
    color: 'blue',
    image: '/feature-security.jpg',
  },
  {
    title: 'Humidity Curves for Oyster Mushrooms: Getting It Right',
    excerpt: 'Oyster mushrooms demand precise humidity shifts between Spawn Run (80-85%) and Fruiting (85-95%). We break down the science and the settings.',
    date: 'January 15, 2026',
    readTime: '6 min read',
    tag: 'Growing Tips',
    color: 'green',
    image: '/problem-visual.jpg',
  },
  {
    title: 'The Future of AgriTech: Yield-Backed Financing for Small Farmers',
    excerpt: 'What if your verified harvest data could unlock crop insurance and working capital? We explore how IoT data is becoming the new credit score for agriculture.',
    date: 'January 5, 2026',
    readTime: '8 min read',
    tag: 'Vision',
    color: 'amber',
    image: '/feature-fintech.jpg',
  },
];

export default function Blog() {
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
              The <span className="text-gradient">Mandi</span> Blog
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Insights on mushroom farming, IoT technology, and the future of agriculture.
            </p>
          </div>

          {/* Featured Post */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl overflow-hidden mb-12"
          >
            <div className="grid md:grid-cols-2">
              <div className="relative h-64 md:h-auto overflow-hidden">
                <img
                  src={blogPosts[0].image}
                  alt={blogPosts[0].title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/50 md:block hidden" />
              </div>
              <div className="p-8 flex flex-col justify-center">
                <Badge className="w-fit mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  Featured
                </Badge>
                <h2 className="text-2xl font-bold text-white mb-3">{blogPosts[0].title}</h2>
                <p className="text-slate-400 mb-4 leading-relaxed">{blogPosts[0].excerpt}</p>
                <div className="flex items-center gap-4 text-slate-500 text-sm mb-6">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {blogPosts[0].date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {blogPosts[0].readTime}
                  </span>
                </div>
                <button className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Read Full Article
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Blog Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.slice(1).map((post, index) => (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <Badge className={`bg-${post.color}-500/20 text-${post.color}-400 border-${post.color}-500/30`}>
                      <Tag className="w-3 h-3 mr-1" />
                      {post.tag}
                    </Badge>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-slate-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center glass-card rounded-2xl p-10"
          >
            <h3 className="text-2xl font-bold text-white mb-3">Stay Updated</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Get the latest farming tips, product updates, and industry insights delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white font-medium transition-colors">
                Subscribe
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
