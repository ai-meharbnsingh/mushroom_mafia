import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Thermometer, Droplets, Wind, Shield,
  TrendingUp, Cpu, RefreshCw, Users, Building2,
  FlaskConical, Check, ArrowRight, Sparkles, Wifi, Bell,
  BarChart3, Globe, Database, Server, Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import About from '@/pages/About';
import Blog from '@/pages/Blog';
import Contact from '@/pages/Contact';

// Navigation Component
function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass py-3' : 'bg-transparent py-5'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/">
            <motion.div
              className="flex items-center gap-4"
              whileHover={{ scale: 1.02 }}
            >
              <img src="/logo.png" alt="Mushroom Ki Mandi Logo" className="w-12 h-12" />
              <span className="text-white text-2xl font-semibold">Mushroom Ki Mandi</span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm text-slate-300 hover:text-cyan-400 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              Login
            </Button>
            <Button className="bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white">
              Request Demo
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass mt-3"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-slate-300 hover:text-cyan-400 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-green-500 text-white mt-4">
                Request Demo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-circuit opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-green-500/5" />

      {/* Animated Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-500/20 rounded-full blur-3xl"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Trojan Horse Teaser */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-300">
                The foundational operating system for the Global Mushroom Mandi Network
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
            >
              Precision Climate Control for{' '}
              <span className="text-gradient">Commercial Mushroom Farming</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Stop guessing and start growing. Our hardware-agnostic IoT platform monitors
              temperatures, humidity, and CO2 in real-time, sending smart alerts based on
              your crop's exact growth phase.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white px-8 py-6 text-lg glow-cyan"
              >
                Request a Demo
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg"
              >
                See Pricing
              </Button>
            </motion.div>


          </motion.div>

          {/* Right Content - Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden glow-cyan">
              <img
                src="/hero-mushroom-tech.jpg"
                alt="Smart Mushroom Farming IoT Platform"
                className="w-full h-auto rounded-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

              {/* Floating Stats Card */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute bottom-6 left-6 right-6 glass-card rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Thermometer className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Room Temperature</div>
                      <div className="text-lg font-bold text-white">22.5°C</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Droplets className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Humidity</div>
                      <div className="text-lg font-bold text-white">85%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Wind className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">CO2</div>
                      <div className="text-lg font-bold text-white">800ppm</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Demo Video Section
function DemoVideoSection() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            See It In Action
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            From Sensor to <span className="text-gradient">Harvest</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Watch how our platform monitors every stage of the mushroom growth cycle — from installation to yield tracking.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Video Container */}
          <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-cyan-500/10">
            <video
              ref={videoRef}
              className="w-full h-auto"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/demo-video.mp4" type="video/mp4" />
            </video>

            {/* Gradient overlay at bottom for controls */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Video Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              <button
                onClick={toggleMute}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Decorative glow behind video */}
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-transparent to-green-500/20 rounded-3xl blur-2xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}

// Problem/Solution Section
function ProblemSolutionSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Problem Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-4 bg-red-500/20 text-red-400 border-red-500/30">
              The Problem
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Mushroom Yields Are <span className="text-red-400">Fragile</span>
            </h2>
            <div className="space-y-4 text-slate-400">
              <p className="flex items-start gap-3">
                <span className="text-red-400 mt-1">⚠️</span>
                <span>A 2°C temperature spike during Spawn Run can ruin an entire flush</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-red-400 mt-1">⚠️</span>
                <span>A sudden drop in humidity during Fruiting destroys Grade-A yields</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-red-400 mt-1">⚠️</span>
                <span>Manual monitoring is slow, prone to human error, and doesn't happen at 2:00 AM</span>
              </p>
            </div>

            <div className="mt-8 rounded-2xl overflow-hidden">
              <img
                src="/problem-visual.jpg"
                alt="Mushroom farming challenges"
                className="w-full h-64 object-cover"
              />
            </div>
          </motion.div>

          {/* Solution Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
              Our Solution
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              24/7 <span className="text-gradient">Autonomous Monitoring</span>
            </h2>
            <div className="space-y-4 text-slate-400">
              <p className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Real-time data collection from your growing rooms every second</span>
              </p>
              <p className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Smart alerts warn you <strong className="text-white">before</strong> critical limits are breached</span>
              </p>
              <p className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Save your crop and maximize your Grade-A yields automatically</span>
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Bell, label: 'Instant Alerts', color: 'cyan' },
                { icon: Wifi, label: 'Always Connected', color: 'green' },
                { icon: Database, label: 'Data Logging', color: 'blue' },
                { icon: BarChart3, label: 'Analytics', color: 'purple' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className="glass-card rounded-xl p-4 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg bg-${item.color}-500/20 flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                  </div>
                  <span className="text-white font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Core Features Section
function FeaturesSection() {
  const features = [
    {
      icon: Bell,
      title: 'Intelligent Phase-Based Alerts',
      description: 'Unlike basic thermometers, our system understands the biological lifecycle of your mushrooms (Spawn Run, Casing, Pinning, Cropping). We enforce strict parameter matrices specific to each phase.',
      image: '/feature-phases.jpg',
      color: 'cyan',
    },
    {
      icon: BarChart3,
      title: 'Multi-Room Analytics & Yield Tracking',
      description: 'Monitor unlimited growing rooms from a single pane of glass. Track total kg yields by Grade (A, B, C) and analyze historical overlay charts to discover which climate patterns produced your best harvests.',
      image: '/feature-sensors.jpg',
      color: 'green',
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security & Isolation',
      description: 'Your farm\'s data is yours alone. Built on military-grade encryption (AES-256 for devices, MQTTS TLS for telemetry) and strict role-based access controls.',
      image: '/feature-security.jpg',
      color: 'blue',
    },
    {
      icon: RefreshCw,
      title: 'Over-The-Air (OTA) Hardware Control',
      description: 'Zero-touch device management. ESP32 sensor nodes update themselves wirelessly. Trigger kill-switches or actuate specific relays (AC, Humidifiers, Exhaust) from the web dashboard.',
      image: '/hero-mushroom-tech.jpg',
      color: 'purple',
    },
    {
      icon: TrendingUp,
      title: 'Yield-Backed Financing & Marketplace',
      description: 'Coming Soon: Your verified yield history will act as your credit score—unlocking instant crop insurance, working capital loans, and auto-matching with bulk buyers across the Global Mushroom Mandi.',
      image: '/feature-fintech.jpg',
      color: 'gold',
      isVisionary: true,
    },
  ];

  return (
    <section id="features" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            Core Offerings
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything You Need to <span className="text-gradient">Scale Your Farm</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Break down the technical features into plain-English benefits that transform your mushroom farming operation.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className={`group relative rounded-2xl overflow-hidden ${feature.isVisionary
                ? 'md:col-span-2 lg:col-span-1 border-2 border-amber-500/30'
                : ''
                }`}
            >
              {feature.isVisionary && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Coming Soon
                  </Badge>
                </div>
              )}

              <div className="glass-card h-full">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                </div>

                <div className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                  </div>

                  <h3 className={`text-xl font-bold mb-3 ${feature.isVisionary ? 'text-gradient-gold' : 'text-white'}`}>
                    {feature.title}
                  </h3>

                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Install the Sensors',
      description: 'Mount our pre-configured, encrypted IoT nodes in your growing rooms. They connect instantly to your local WiFi.',
      icon: Cpu,
      color: 'cyan',
    },
    {
      number: '02',
      title: 'Define Your Crop Phases',
      description: 'Log into the dashboard and tell the system what stage your substrate is in (e.g., "Day 4 of Spawn Run").',
      icon: Database,
      color: 'green',
    },
    {
      number: '03',
      title: 'Monitor & Act',
      description: 'Watch your telemetry stream live. Receive instant SMS/Email alerts if temperatures drift or equipment fails.',
      icon: Bell,
      color: 'blue',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
            Simple Setup
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Get started in minutes, not months. Our plug-and-play system gets you monitoring immediately.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-cyan-500/50 to-green-500/50" />
              )}

              <div className="glass-card rounded-2xl p-8 text-center h-full">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className={`w-20 h-20 rounded-2xl bg-${step.color}-500/20 flex items-center justify-center`}>
                    <step.icon className={`w-10 h-10 text-${step.color}-400`} />
                  </div>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-${step.color}-500 flex items-center justify-center text-sm font-bold text-white`}>
                    {step.number}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Target Audience Section
function TargetAudienceSection() {
  const audiences = [
    {
      icon: Building2,
      title: 'Commercial Button Mushroom Farms',
      description: 'Scaling operations that need tight control over massive flushes. Perfect for farms producing 10+ tons monthly.',
      color: 'cyan',
    },
    {
      icon: Sparkles,
      title: 'Exotic Fungi Growers',
      description: 'Oyster, Shiitake, and Lion\'s Mane cultivators requiring highly specific humidity curves and temperature profiles.',
      color: 'green',
    },
    {
      icon: FlaskConical,
      title: 'Agricultural Researchers',
      description: 'Universities and labs requiring dense, historical CSV telemetry exports for mycology studies and publications.',
      color: 'purple',
    },
  ];

  return (
    <section className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
            Who We Serve
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Built For <span className="text-gradient">Serious Growers</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8"
            >
              <div className={`w-14 h-14 rounded-xl bg-${audience.color}-500/20 flex items-center justify-center mb-6`}>
                <audience.icon className={`w-7 h-7 text-${audience.color}-400`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{audience.title}</h3>
              <p className="text-slate-400">{audience.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: 'Hobbyist B2C Kit',
      price: '₹999',
      period: '/month + hardware',
      description: 'Perfect for home growers and small tents starting with IoT monitoring.',
      features: [
        'Real-time climate monitoring',
        'Mobile Dashboard Access',
        'Basic alerts (Email / Push)',
        '7-day data history',
        'Single grow tent control',
        'Access to community forum',
      ],
      note: 'Hobbyist grade sensors',
      cta: 'Buy Starter Kit',
      highlighted: false,
    },
    {
      name: 'Commercial Farm',
      price: 'Contact Sales',
      period: 'Custom Volume Pricing',
      description: 'For large-scale commercial operations requiring absolute control and privacy.',
      features: [
        'Absolute data privacy & on-premise option',
        'Dedicated custom API & Dashboard',
        'Priority OTA device updates',
        'Full role-based access controls',
        'Unlimited history & AI Yield Prediction',
        'Multi-room analytics & climate phase matrices',
        'SMS + Automated Relay controls',
        '24/7 dedicated support team',
      ],
      cta: 'Request Enterprise Demo',
      highlighted: true,
    },
  ];

  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Simple, <span className="text-gradient">Data-Driven</span> Pricing
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A strategic pricing model to feed the network's predictive AI while giving you full control.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className={`relative rounded-2xl overflow-hidden ${plan.highlighted ? 'ring-2 ring-cyan-500' : ''
                }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-green-500 text-white text-center py-2 text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className={`glass-card h-full ${plan.highlighted ? 'pt-12' : ''} p-8`}>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-gradient' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <p className="text-slate-400 mb-6">{plan.description}</p>

                {plan.note && (
                  <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-400">{plan.note}</p>
                  </div>
                )}

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-slate-300">
                      <Check className={`w-5 h-5 ${plan.highlighted ? 'text-cyan-400' : 'text-green-400'} flex-shrink-0`} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.highlighted
                    ? 'bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                >
                  {plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Final CTA Section
function FinalCTASection() {
  return (
    <section id="contact" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-green-500/10" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to <span className="text-gradient">Modernize Your Farm?</span>
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Join hundreds of mushroom farmers who have transformed their operations with Mushroom Ki Mandi.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white px-10 py-7 text-lg glow-cyan"
            >
              Start Your Free 14-Day Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-10 py-7 text-lg"
            >
              <Users className="mr-2 w-5 h-5" />
              Contact Sales
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              <span>Free hardware setup</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  const footerLinks = {
    Product: [
      { name: 'Features', href: '/#features' },
      { name: 'Pricing', href: '/#pricing' },
      { name: 'How It Works', href: '/#how-it-works' },
    ],
    Company: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Contact', href: '/contact' },
    ],
    Legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  };

  return (
    <footer className="relative py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden">
                <img src="/logo.png" alt="Mushroom Ki Mandi Logo" className="h-[180%] w-[180%] object-contain -mt-[10%] -ml-[15%]" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Mushroom Ki Mandi</span>
            </Link>
            <p className="text-slate-400 mb-6 max-w-sm">
              The foundational operating system for the Global Mushroom Mandi Network.
              Precision climate control for commercial mushroom farming.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'LinkedIn', 'GitHub', 'YouTube'].map((social) => (
                <motion.a
                  key={social}
                  href="#"
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('/#') ? (
                      <a href={link.href} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                        {link.name}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-slate-500 text-sm">
              © 2026 Mushroom Ki Mandi. All rights reserved. Silicon Valley meets Advanced Agriculture.
            </p>
            <p className="text-slate-600 text-xs text-center md:text-left">
              Visit us at: <a href="https://mushroomkimandi.com" className="hover:text-cyan-400">mushroomkimandi.com</a> | <a href="https://mushroomkimandi.in" className="hover:text-cyan-400">.in</a> | <a href="https://mushroomkimandi.online" className="hover:text-cyan-400">.online</a>
            </p>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Server className="w-4 h-4" />
            <span>Status: All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Home page (landing)
function HomePage() {
  return (
    <>
      <HeroSection />
      <DemoVideoSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TargetAudienceSection />
      <PricingSection />
      <FinalCTASection />
    </>
  );
}

// Main App
function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollToTop />
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
