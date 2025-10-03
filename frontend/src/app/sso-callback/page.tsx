'use client';

import { useEffect, useState } from 'react';
// import { useUser, useClerk } from '@clerk/nextjs';

export default function SSOCallback() {
  // Temporarily commenting out Clerk authentication
  /*
  const { isLoaded, isSignedIn, user } = useUser();
  const { loaded } = useClerk();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log('🔍 SSO Callback Debug:', { 
      loaded, 
      isLoaded, 
      isSignedIn, 
      userId: user?.id,
      userEmail: user?.emailAddresses?.[0]?.emailAddress,
      hasRedirected
    });

    // Wait for Clerk to fully load before making any decisions
    if (!loaded || !isLoaded) {
      console.log('⏳ Waiting for Clerk to load...');
      return;
    }

    // Now that Clerk is loaded, check authentication
    if (!hasRedirected) {
      if (isSignedIn === true && user?.id) {
        console.log('🚀 Redirecting to start.rentok.com - User authenticated!');
        setHasRedirected(true);
        window.location.href = 'https://start.rentok.com';
      } else if (isSignedIn === false) {
        console.log('❌ No user authenticated, redirecting to home');
        setHasRedirected(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
      // If isSignedIn is still undefined after loading, wait for next render
    }
  }, [loaded, isLoaded, isSignedIn, user, hasRedirected]);
  */

  const [hasRedirected, setHasRedirected] = useState(false);

  // Temporarily redirect directly to start.rentok.com
  useEffect(() => {
    if (!hasRedirected) {
      console.log('🚀 Redirecting to start.rentok.com');
      setHasRedirected(true);
      window.location.href = 'https://start.rentok.com';
    }
  }, [hasRedirected]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
        <p className="text-xs text-gray-400 mt-2">
          Redirecting to start.rentok.com...
        </p>
      </div>
    </div>
  );
}