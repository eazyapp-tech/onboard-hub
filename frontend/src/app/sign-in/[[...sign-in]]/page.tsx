'use client';

import { useState } from 'react';
import { SignIn } from '@clerk/nextjs';
import { EmailOTPSignIn } from '@/components/email-otp-signin';
import { Toaster } from 'sonner';

export default function SignInPage() {
  const [useOTP, setUseOTP] = useState(true);

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to RentOk</h1>
            <p className="text-gray-600">Sign in to access your onboarding hub</p>
          </div>

          {useOTP ? (
            <EmailOTPSignIn />
          ) : (
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
          )}

          <div className="text-center mt-6">
            <button
              onClick={() => setUseOTP(!useOTP)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              {useOTP ? 'Use password instead' : 'Use email OTP instead'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
