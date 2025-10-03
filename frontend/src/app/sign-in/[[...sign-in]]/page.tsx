'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to RentOk</h1>
          <p className="text-gray-600">Sign in to access your onboarding hub</p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-2xl border-0 rounded-2xl',
            }
          }}
          afterSignInUrl="/post-auth"
          afterSignUpUrl="/post-auth"
        />
      </div>
    </div>
  );
}
