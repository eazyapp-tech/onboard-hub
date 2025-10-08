'use client';

import { useState } from 'react';
import { EmailOTPSignIn } from '@/components/email-otp-signin';
import { Toaster } from 'sonner';

export default function SignInPage() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to RentOk</h1>
            <p className="text-gray-600">Sign in with your email address</p>
          </div>

          <EmailOTPSignIn />
        </div>
      </div>
    </>
  );
}
