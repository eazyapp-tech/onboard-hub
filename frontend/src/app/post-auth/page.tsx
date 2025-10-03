"use client";

// import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

const TARGET = "https://start.rentok.com/";

export default function PostAuth() {
  // Temporarily commenting out Clerk authentication
  /*
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      // If somehow we landed here without a session, bounce back to sign-in
      window.location.replace("/sign-in");
      return;
    }
    // Session is ready → do the external hop
    window.location.replace(TARGET);
  }, [isLoaded, isSignedIn]);
  */

  // Temporarily redirect directly to target
  useEffect(() => {
    window.location.replace(TARGET);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Finishing sign-in…</h2>
        <p className="text-gray-600">Redirecting you to the onboarding hub</p>
      </div>
    </div>
  );
}