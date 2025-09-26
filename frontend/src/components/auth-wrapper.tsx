'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { setCurrentUser } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isLoaded) return;
    
    console.log('🔍 AuthWrapper - Loaded:', isLoaded, 'SignedIn:', isSignedIn, 'User:', user?.emailAddresses?.[0]?.emailAddress);
    
    if (!isSignedIn) {
      console.log('❌ No user signed in, redirecting to signin');
      window.location.href = '/sign-in';
      return;
    }
    
    if (user) {
      const email = user.emailAddresses?.[0]?.emailAddress || '';
      console.log('✅ User authenticated:', email);
      setCurrentUser({
        id: email.split('@')[0] || 'unknown',
        name: user.fullName || 'Unknown User',
        email: email,
        role: 'sales',
        active: true
      });
    }
  }, [user, isLoaded, isSignedIn, setCurrentUser, mounted]);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  console.log('✅ Rendering main app for user:', user?.emailAddresses?.[0]?.emailAddress);
  return <>{children}</>;
}