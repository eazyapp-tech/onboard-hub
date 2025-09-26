'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';

export function ClerkAuthDemo() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useAuth();

  if (!isLoaded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 text-center"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </motion.div>
    );
  }

  if (!isSignedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 text-center"
      >
        <h3 className="text-lg font-semibold mb-2">Clerk Authentication</h3>
        <p className="text-muted-foreground mb-4">
          You are not signed in. Use the header buttons to sign in or sign up.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Clerk User Info</h3>
        <button
          onClick={() => signOut()}
          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
        >
          Sign Out
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Name:</span>
          <span className="font-medium">{user.fullName || 'Not set'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email:</span>
          <span className="font-medium">{user.primaryEmailAddress?.emailAddress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email Verified:</span>
          <span className={`font-medium ${user.primaryEmailAddress?.verification?.status === 'verified' ? 'text-green-600' : 'text-red-600'}`}>
            {user.primaryEmailAddress?.verification?.status === 'verified' ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">User ID:</span>
          <span className="font-medium font-mono text-xs">{user.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created:</span>
          <span className="font-medium">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Sign In:</span>
          <span className="font-medium">
            {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Unknown'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
