'use client';

import { useUser } from '@clerk/nextjs';
import { MainApp } from '@/components/main-app';
import { WelcomeScreen } from '@/components/welcome-screen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    console.log('HomePage Debug:', { isLoaded, isSignedIn, user });
  }, [isLoaded, isSignedIn, user]);

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not signed in, show welcome screen with sign-in option
  if (!isSignedIn) {
    return <WelcomeScreen />;
  }

  // User is signed in, show the main app
  return <MainApp />;
}