'use client';

import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function SSOCallback() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { loaded } = useClerk();
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();

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
        console.log('🚀 Redirecting to post-auth - User authenticated!');
        setHasRedirected(true);
        router.push('/post-auth');
      } else if (isSignedIn === false) {
        console.log('❌ No user authenticated, redirecting to sign-in');
        setHasRedirected(true);
        router.push('/sign-in');
      }
      // If isSignedIn is still undefined after loading, wait for next render
    }
  }, [loaded, isLoaded, isSignedIn, user, hasRedirected, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  );
}