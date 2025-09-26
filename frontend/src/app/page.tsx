'use client';

// import { useUser } from '@clerk/nextjs';
import { MainApp } from '@/components/main-app';
import { WelcomeScreen } from '@/components/welcome-screen';
import { useEffect } from 'react';

export default function HomePage() {
  // Temporarily commenting out Clerk authentication
  /*
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    console.log('HomePage Debug:', { isLoaded, isSignedIn, user });
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
          <p className="text-xs text-gray-400 mt-2">Debug: isLoaded={String(isLoaded)}, isSignedIn={String(isSignedIn)}</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <WelcomeScreen />;
  }

  // User is signed in, show the main app with role selector
  return <MainApp />;
  */

  // Temporarily skip authentication and show main app directly
  return <MainApp />;
}