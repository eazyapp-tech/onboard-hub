'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const ALLOWED_DOMAINS = ['eazyapp.tech', 'rentok.com'];

export function useDomainValidation() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [isValidDomain, setIsValidDomain] = useState(true);
  const [userDomain, setUserDomain] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const email = user.emailAddresses?.[0]?.emailAddress || '';
      const domain = email.split('@')[1];
      
      setUserDomain(domain);
      setIsValidDomain(ALLOWED_DOMAINS.includes(domain));
    } else if (isLoaded && !isSignedIn) {
      setIsValidDomain(true); // Allow access to welcome screen
      setUserDomain(null);
    }
  }, [user, isSignedIn, isLoaded]);

  return {
    isValidDomain,
    userDomain,
    allowedDomains: ALLOWED_DOMAINS,
    isLoaded,
    isSignedIn
  };
}
