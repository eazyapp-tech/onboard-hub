'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function EmailOTPSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if user is already signed in
  if (isLoaded && signIn?.status === 'complete') {
    window.location.href = '/post-auth';
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Send OTP to email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    // Check if email is from allowed domain
    if (!email.endsWith('@eazyapp.tech')) {
      toast.error('Only @eazyapp.tech email addresses are allowed');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting sign-in process for:', email);
      
      // Create sign-in attempt
      const signInResult = await signIn.create({
        identifier: email,
      });

      console.log('Sign-in result:', signInResult);

      if (signInResult.status === 'needs_first_factor') {
        // Find email code factor
        const emailFactor = signInResult.supportedFirstFactors.find(
          (factor) => factor.strategy === 'email_code'
        );
        
        if (emailFactor) {
          console.log('Preparing email factor:', emailFactor);
          
          // Prepare the email code factor
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
          
          console.log('Email factor prepared, OTP should be sent');
          toast.success('OTP sent to your email!');
          setStep('code');
        } else {
          console.error('No email code factor found');
          toast.error('Email verification not available for this account');
        }
      } else if (signInResult.status === 'complete') {
        // User is already signed in
        console.log('User already signed in');
        toast.error('You are already signed in. Redirecting...');
        window.location.href = '/post-auth';
        return;
      } else {
        console.error('Unexpected sign-in status:', signInResult.status);
        toast.error('Unexpected sign-in status: ' + signInResult.status);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      
      // Handle session already exists error
      if (err.errors?.[0]?.code === 'session_exists') {
        toast.error('You are already signed in. Redirecting...');
        window.location.href = '/post-auth';
        return;
      }
      
      toast.error(err.errors?.[0]?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    // Validate OTP code
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying OTP:', { code, email });
      
      // Attempt to verify the OTP
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });

      console.log('OTP verification result:', result);

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast.success('Successfully signed in!');
        // Force redirect to post-auth
        window.location.href = '/post-auth';
      } else {
        console.log('Additional steps required:', result);
        toast.error('Additional verification required');
      }
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      toast.error(err.errors?.[0]?.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'email' ? 'Sign In with Email' : 'Enter OTP'}
          </h2>
          <p className="text-gray-600">
            {step === 'email'
              ? 'Enter your email to receive a one-time password'
              : `We sent a code to ${email}`}
          </p>
          {step === 'code' && (
            <p className="text-sm text-blue-600 mt-2">
              Signing you in...
            </p>
          )}
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                One-Time Password
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
              }}
              className="w-full text-blue-600 hover:text-blue-700 font-medium py-2 transition-colors"
            >
              ← Back to email
            </button>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading}
              className="w-full text-gray-600 hover:text-gray-700 font-medium py-2 transition-colors text-sm"
            >
              Didn't receive the code? Resend
            </button>
          </form>
        )}
      </div>

      <div className="text-center mt-6">
        <p className="text-gray-600 text-sm">
          Don't have an account?{' '}
          <a href="/sign-up" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}

