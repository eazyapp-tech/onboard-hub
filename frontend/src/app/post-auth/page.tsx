"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RoleSelector } from "@/components/role-selector";
import { useAppStore } from "@/lib/store";

export default function PostAuth() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      // If somehow we landed here without a session, bounce back to sign-in
      router.push("/sign-in");
      return;
    }
    
    // Session is ready → show role selector
    setShowRoleSelector(true);
  }, [isLoaded, isSignedIn, router]);

  const handleRoleSelect = (role: 'sales' | 'cis') => {
    // Set the user role in the store
    setCurrentUser({
      id: 'clerk-user',
      name: 'User',
      email: '',
      role: role
    });
    
    // Redirect to main app
    router.push("/");
  };

  if (!isLoaded || !showRoleSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Finishing sign-in…</h2>
          <p className="text-gray-600">Setting up your workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <RoleSelector onRoleSelect={handleRoleSelect} />
    </div>
  );
}