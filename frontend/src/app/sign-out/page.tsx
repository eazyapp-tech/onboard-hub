'use client';

import { useEffect } from 'react';
// import { useClerk } from '@clerk/nextjs';

export default function SignOutPage() {
  // Temporarily commenting out Clerk authentication
  /*
  const { signOut } = useClerk();

  useEffect(() => {
    signOut().then(() => {
      window.location.href = '/';
    });
  }, [signOut]);
  */

  // Temporarily redirect directly to home
  useEffect(() => {
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Signing out...</p>
      </div>
    </div>
  );
}