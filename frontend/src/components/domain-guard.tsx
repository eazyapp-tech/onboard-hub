'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle } from 'lucide-react';
import { useDomainValidation } from '@/hooks/use-domain-validation';

interface DomainGuardProps {
  children: React.ReactNode;
}

export function DomainGuard({ children }: DomainGuardProps) {
  const { isValidDomain, userDomain, allowedDomains, isLoaded, isSignedIn } = useDomainValidation();
  const { signOut } = useClerk();
  const { user } = useUser();

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is signed in but has invalid domain, show restriction message
  if (isSignedIn && !isValidDomain) {
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-pink-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl border border-red-200"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Access Restricted</h1>
          
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Unauthorized Email Domain</span>
            </div>
            <p className="text-sm text-red-700">
              <strong>{userEmail}</strong> is not from an authorized domain.
            </p>
          </div>
          
          <p className="text-gray-600 mb-6">
            Only emails from <strong>@{allowedDomains.join('</strong> and <strong>@')}</strong> domains are allowed to access this system.
          </p>
          
          <button
            onClick={() => signOut()}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Sign Out and Try Again
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            Contact your system administrator if you believe this is an error.
          </p>
        </motion.div>
      </div>
    );
  }

  // If domain is valid or user is not signed in, render children
  return <>{children}</>;
}