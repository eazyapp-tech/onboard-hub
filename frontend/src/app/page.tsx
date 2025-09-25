'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { format } from 'date-fns';
import { useSession, signOut } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { RoleSelector } from '@/components/role-selector';
import { Header } from '@/components/header';
import { BookingForm } from '@/components/booking-form';
import { CisDashboard } from '@/components/cis-dashboard';
import { TodayBookingsModal } from '@/components/today-bookings-modal';
import { CIS_USERS, BDE_USERS } from '@/types';

const SALES_USERS = [
  { id: 'siddhant', name: 'Siddhant', email: 'siddhant@eazyapp.tech' },
  { id: 'pankaj',   name: 'Pankaj',   email: 'pankaj@eazyapp.tech' },
  { id: 'ayush',    name: 'Ayush',    email: 'ayush@eazyapp.tech' },
  { id: 'harsh',    name: 'Harsh',    email: 'harsh@eazyapp.tech' },
  { id: 'prashant', name: 'Prashant', email: 'prashant@eazyapp.tech' },
  { id: 'amit',     name: 'Amit',     email: 'amit@eazyapp.tech' },
  { id: 'ashish',   name: 'Ashish',   email: 'ashish@eazyapp.tech' },
  { id: 'abhishek', name: 'Abhishek', email: 'abhishek@eazyapp.tech' },
  { id: 'aditi',    name: 'Aditi',    email: 'aditi@eazyapp.tech' },
];

function UserPicker({
  title,
  users,
  onSelect,
  onBack,
}: {
  title: string;
  users: { id: string; name: string; email: string }[];
  onSelect: (u: { id: string; name: string; email: string }) => void;
  onBack: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          <button
            onClick={onBack}
            className="px-3 sm:px-4 py-2 rounded-lg bg-white/50 hover:bg-white/70 transition text-sm sm:text-base"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="glass rounded-xl p-3 sm:p-4 text-left hover:bg-white/30 transition"
            >
              <p className="font-medium text-sm sm:text-base">{u.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{u.email}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
type AppState =
  | 'role-selection'
  | 'sales-user-select'
  | 'sales-booking'
  | 'cis-user-select'
  | 'cis-dashboard';
export default function HomePage() {
  const { data: session, status } = useSession();
  const [appState, setAppState] = useState<AppState>('role-selection');
  const [showTodayBookings, setShowTodayBookings] = useState(false);
  const {
    currentUser,
    setCurrentUser
  } = useAppStore();

  // Initialize seed data
  useEffect(() => {
    const initializeData = () => {
      // Create sample bookings for demonstration
      const sampleBookings = [{
        id: '1',
        bookingRef: 'ONB-20240924-0001',
        portfolioManager: 'John Smith',
        ownerName: 'Rajesh Kumar',
        ownerPhone: '+91 9876543210',
        ownerEmail: 'rajesh@example.com',
        rentokId: 'RO-2024-001',
        noOfProperties: 2,
        noOfBeds: 4,
        subscriptionType: 'Gold' as const,
        soldPricePerBed: 1500,
        subscriptionStartDate: '2024-10-01',
        monthsBilled: 12,
        freeMonths: 1,
        bookingLocation: 'north_delhi' as const,
        mode: 'physical' as const,
        cisId: 'manish',
        slotWindow: '10_13' as const,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'scheduled' as const,
        onboardingStatus: 'Onboarding Started' as const,
        createdBy: 'siddhant',
        createdAt: '2024-09-23T10:00:00Z',
        updatedAt: '2024-09-23T10:00:00Z',
        totalAmount: 72000
      }, {
        id: '2',
        bookingRef: 'ONB-20240924-0002',
        portfolioManager: 'Sarah Johnson',
        ownerName: 'Priya Sharma',
        ownerPhone: '+91 9876543211',
        ownerEmail: 'priya@example.com',
        rentokId: 'RO-2024-002',
        noOfProperties: 1,
        noOfBeds: 2,
        subscriptionType: 'Silver' as const,
        soldPricePerBed: 1200,
        subscriptionStartDate: '2024-10-01',
        monthsBilled: 6,
        freeMonths: 0,
        bookingLocation: 'south_delhi' as const,
        mode: 'virtual' as const,
        cisId: 'megha',
        slotWindow: '14_17' as const,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'scheduled' as const,
        onboardingStatus: 'Onboarding Started' as const,
        createdBy: 'pankaj',
        createdAt: '2024-09-23T11:00:00Z',
        updatedAt: '2024-09-23T11:00:00Z',
        totalAmount: 14400
      }, {
        id: '3',
        bookingRef: 'ONB-20240924-0003',
        portfolioManager: 'Mike Wilson',
        ownerName: 'Amit Patel',
        ownerPhone: '+91 9876543212',
        ownerEmail: 'amit@example.com',
        rentokId: 'RO-2024-003',
        noOfProperties: 1,
        noOfBeds: 3,
        subscriptionType: 'Base' as const,
        soldPricePerBed: 1000,
        subscriptionStartDate: '2024-10-01',
        monthsBilled: 3,
        freeMonths: 0,
        bookingLocation: 'noida' as const,
        mode: 'physical' as const,
        cisId: 'aditya',
        slotWindow: '14_17' as const,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'scheduled' as const,
        onboardingStatus: 'Onboarding Started' as const,
        createdBy: 'ayush',
        createdAt: '2024-09-23T12:00:00Z',
        updatedAt: '2024-09-23T12:00:00Z',
        totalAmount: 9000
      }];

      // Only add sample data if no bookings exist
      const existingBookings = useAppStore.getState().bookings;
      if (existingBookings.length === 0) {
        sampleBookings.forEach(booking => {
          useAppStore.getState().addBooking(booking);
        });
      }
    };
    initializeData();
  }, []);

  // Handle authentication
  useEffect(() => {
    console.log('Auth status:', status);
    console.log('Session:', session);
    console.log('Environment check:', {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'
    });
    
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      // User not authenticated, redirect to sign-in
      console.log('No session, redirecting to sign-in');
      window.location.href = '/auth/signin';
      return;
    }
    
    // User is authenticated, set current user from session
    if (session.user) {
      console.log('User authenticated:', session.user);
      setCurrentUser({
        id: session.user.email?.split('@')[0] || 'unknown',
        name: session.user.name || 'Unknown User',
        email: session.user.email || '',
        role: 'sales' // Default role, can be determined by email domain
      });
    }
  }, [session, status, setCurrentUser]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  if (!session) {
    return null;
  }
  const handleRoleSelect = (role: 'sales' | 'cis') => {
    if (role === 'sales') {
      setAppState('sales-user-select'); // pick who is creating
    } else {
      setAppState('cis-user-select');   // pick which onboarding dashboard to open
    }
  };
  const handleBookingSuccess = () => {
    // Could navigate to a success page or show confirmation
  };
  const handleBack = () => {
    setCurrentUser(null);
    setAppState('role-selection');
  };

  const handleSalesPicked = (u: { id: string; name: string; email: string }) => {
    setCurrentUser({ ...u, role: 'sales', active: true });
    setAppState('sales-booking');
  };

  const handleCisPicked = (u: { id: string; name: string; email: string }) => {
    setCurrentUser({ ...u, role: 'cis', active: true });
    setAppState('cis-dashboard');
  };

  const handleBackFromSales = () => {
    setAppState('sales-user-select');
  };

  const handleBackFromCis = () => {
    setAppState('cis-user-select'); // <-- THIS fixes your back button issue
  };
  return <div className="min-h-screen overflow-x-hidden" data-unique-id="a00c175c-a1b5-4860-b0e3-151bc63c2c51" data-file-name="app/page.tsx" data-dynamic-text="true">
      {appState === 'role-selection' && (
        <RoleSelector onRoleSelect={handleRoleSelect} />
      )}

      {appState === 'sales-user-select' && (
        <UserPicker
          title="Select Sales User"
          users={SALES_USERS}
          onSelect={handleSalesPicked}
          onBack={() => setAppState('role-selection')}
        />
      )}

      {appState === 'sales-booking' && (
        <div>
          <Header title="Create Booking" showBackButton onBack={handleBackFromSales} showTodayBookings onTodayBookings={() => setShowTodayBookings(true)} />
          <BookingForm onSuccess={handleBookingSuccess} />
        </div>
      )}

      {appState === 'cis-user-select' && (
        <UserPicker
          title="Select Onboarding Person"
          users={[
            { id: 'megha',  name: 'Megha',        email: 'megha@eazyapp.tech' },
            { id: 'aditya', name: 'Aditya',       email: 'aditya@rentok.com' },
            { id: 'manish', name: 'Manish Arora', email: 'manish.arora@eazyapp.tech' },
          ]}
          onSelect={handleCisPicked}
          onBack={() => setAppState('role-selection')}
        />
      )}

      {appState === 'cis-dashboard' && (
        <div>
          <Header title="Onboarding Dashboard" showBackButton onBack={handleBackFromCis} />
          <CisDashboard />
        </div>
      )}

      <TodayBookingsModal isOpen={showTodayBookings} onClose={() => setShowTodayBookings(false)} />

      <Toaster position="top-right" richColors />
    </div>;
}