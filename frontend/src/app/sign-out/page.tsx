'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export default function SignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();
  const { setCurrentUser } = useAppStore();

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        // Clear Zustand store first
        setCurrentUser(null);
        
        // Clear any local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Sign out from Clerk
        await signOut();
        
        // Redirect to sign-in page
        router.push('/sign-in');
      } catch (error) {
        console.error('Error signing out:', error);
        // Still redirect even if there's an error
        router.push('/sign-in');
      }
    };

    handleSignOut();
  }, [signOut, router, setCurrentUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing out...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  );
}