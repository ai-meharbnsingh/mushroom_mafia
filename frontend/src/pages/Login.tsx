import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Leaf, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loginError, isLocked, lockoutTime } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  useEffect(() => {
    // Entrance animation
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
    
    if (formRef.current) {
      const elements = formRef.current.querySelectorAll('.form-element');
      gsap.fromTo(
        elements,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, delay: 0.3, ease: 'power3.out' }
      );
    }
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLocked) return;
    
    setIsSubmitting(true);
    const success = await login({ username, password });
    setIsSubmitting(false);
    
    if (success) {
      navigate('/dashboard');
    }
  };
  
  return (
    <div className="min-h-screen bg-iot-primary flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(46, 239, 255, 0.06) 0%, transparent 50%)',
        }}
      />
      
      {/* Noise overlay */}
      <div className="noise-overlay" />
      
      <div
        ref={cardRef}
        className="w-full max-w-md mx-4 relative z-10"
      >
        <div className="bg-iot-secondary rounded-2xl p-8 border border-iot-subtle shadow-iot-card">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-iot-cyan to-iot-purple flex items-center justify-center mb-4">
              <Leaf className="w-8 h-8 text-iot-bg-primary" />
            </div>
            <h1 className="text-2xl font-bold text-iot-primary">MushroomIoT</h1>
            <p className="text-sm text-iot-secondary mt-1">Smart Mushroom Farming</p>
          </div>
          
          {/* Lockout Banner */}
          {isLocked && (
            <div className="mb-6 p-4 rounded-xl bg-iot-red/10 border border-iot-red/30 flex items-center gap-3">
              <Lock className="w-5 h-5 text-iot-red flex-shrink-0" />
              <p className="text-sm text-iot-red">
                Account locked. Try again in {lockoutTime} minutes.
              </p>
            </div>
          )}
          
          {/* Error Banner */}
          {loginError && !isLocked && (
            <div className="mb-6 p-4 rounded-xl bg-iot-red/10 border border-iot-red/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-iot-red flex-shrink-0" />
              <p className="text-sm text-iot-red">{loginError}</p>
            </div>
          )}
          
          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="form-element">
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className={`
                  input-dark w-full
                  ${loginError && !isLocked ? 'border-iot-red focus:border-iot-red' : ''}
                `}
                disabled={isLocked}
              />
            </div>
            
            <div className="form-element">
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`
                    input-dark w-full pr-10
                    ${loginError && !isLocked ? 'border-iot-red focus:border-iot-red' : ''}
                  `}
                  disabled={isLocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-iot-muted hover:text-iot-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="form-element">
              <Button
                type="submit"
                disabled={isSubmitting || isLocked || !username || !password}
                className="w-full gradient-primary text-iot-bg-primary font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
            
            <div className="form-element text-center">
              <button
                type="button"
                className="text-sm text-iot-cyan hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </form>
          
          {/* Demo credentials hint */}
          <div className="mt-8 pt-6 border-t border-iot-subtle">
            <p className="text-xs text-iot-muted text-center">
              Demo: Use <span className="text-iot-cyan">admin</span> / <span className="text-iot-cyan">password</span>
            </p>
          </div>
        </div>
        
        <p className="text-center text-xs text-iot-muted mt-6">
          © 2026 MushroomIoT Inc.
        </p>
      </div>
    </div>
  );
};

export default Login;
