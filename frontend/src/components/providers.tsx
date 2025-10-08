'use client';

import { ClerkProvider } from '@clerk/nextjs';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  console.log('Clerk Provider Debug:', {
    publishableKey: publishableKey ? `${publishableKey.substring(0, 10)}...` : 'MISSING',
    hasKey: !!publishableKey
  });

  if (!publishableKey) {
    console.error('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing!');
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h2>
          <p className="text-gray-600">Clerk publishable key is missing. Please check your .env.local file.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/post-auth"
      afterSignUpUrl="/post-auth"
      signInFallbackRedirectUrl="/post-auth"
      signUpFallbackRedirectUrl="/post-auth"
      appearance={{
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
          card: 'shadow-xl border border-gray-200',
          headerTitle: 'text-2xl font-bold text-gray-900',
          headerSubtitle: 'text-gray-600',
          socialButtonsBlockButton: 'border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          formFieldInput: 'border-2 border-gray-200 focus:border-blue-500',
          socialButtonsBlockButtonText: 'font-semibold',
          footerActionText: 'text-gray-600',
          footerActionLink: 'text-blue-600 hover:text-blue-700',
        },
        variables: {
          colorPrimary: '#2563eb',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#1f2937',
          borderRadius: '0.75rem',
        },
      }}
      routerPush={(url) => window.location.href = url}
      routerReplace={(url) => window.location.replace(url)}
    >
      {children}
    </ClerkProvider>
  );
}