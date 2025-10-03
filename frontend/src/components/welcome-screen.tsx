'use client';

import { useState } from 'react';
import { useUser, useSignIn } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Chrome, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export function WelcomeScreen() {
  const { isLoaded } = useUser();
  const { signIn } = useSignIn();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!signIn || loading) return;
    
    setLoading(true);
    setError('');

    try {
      console.log('Starting Google OAuth sign-in...');
      
      // Use Clerk's OAuth with Google - let Clerk handle the redirects
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/'
      });
    } catch (error: any) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
      toast.error('Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show welcome screen for unauthenticated users
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full bg-gradient-to-br from-blue-100/20 to-purple-100/20"></div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative glass rounded-3xl p-8 lg:p-12 text-center max-w-lg w-full shadow-2xl backdrop-blur-xl border border-white/20"
      >
        {/* Logo/Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg"
        >
          <Calendar className="w-10 h-10 text-white" />
        </motion.div>
        
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent"
        >
          Welcome to
        </motion.h1>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-3xl lg:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
        >
          RentOk Onboarding Hub
        </motion.h2>
        
        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-gray-600 mb-8 text-lg leading-relaxed"
        >
          Streamline your client onboarding process with ease. Manage bookings, track progress, and collaborate seamlessly.
        </motion.p>
        
        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
        >
          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Team Collaboration</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Smart Scheduling</span>
          </div>
        </motion.div>
        
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}
        
        {/* Sign In Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full gradient-primary text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
        >
          <Chrome className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </motion.button>
        
        {/* Additional Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-6 text-sm text-gray-500"
        >
          Secure authentication powered by Google
        </motion.p>
      </motion.div>
    </div>
  );
}
