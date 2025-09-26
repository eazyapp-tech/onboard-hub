'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { useAppStore } from '@/lib/store';
import { RoleSelector } from '@/components/role-selector';
import { Header } from '@/components/header';
import { BookingForm } from '@/components/booking-form';
import { CisDashboard } from '@/components/cis-dashboard';
import { TodayBookingsModal } from '@/components/today-bookings-modal';

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {users.map((user) => (
            <motion.button
              key={user.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(user)}
              className="glass rounded-xl p-3 sm:p-4 text-left hover:bg-white/30 transition-all"
            >
              <div className="font-medium text-sm sm:text-base">{user.name}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{user.email}</div>
            </motion.button>
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

export function MainApp() {
  const [appState, setAppState] = useState<AppState>('role-selection');
  const [showTodayBookings, setShowTodayBookings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const {
    currentUser,
    setCurrentUser
  } = useAppStore();

  // Prevent hydration mismatch by ensuring component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize seed data only after component is mounted
  useEffect(() => {
    if (!mounted) return;
    
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
        bookingDate: new Date(),
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        appointmentTime: '10:00 AM',
        status: 'pending' as const
      }, {
        id: '2',
        bookingRef: 'ONB-20240924-0002',
        portfolioManager: 'Sarah Connor',
        ownerName: 'Priya Sharma',
        ownerPhone: '+91 9876543211',
        ownerEmail: 'priya@example.com',
        rentokId: 'RO-2024-002',
        noOfProperties: 1,
        noOfBeds: 2,
        subscriptionType: 'Silver' as const,
        bookingDate: new Date(),
        appointmentDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        appointmentTime: '2:00 PM',
        status: 'confirmed' as const
      }, {
        id: '3',
        bookingRef: 'ONB-20240924-0003',
        portfolioManager: 'Mike Johnson',
        ownerName: 'Amit Patel',
        ownerPhone: '+91 9876543212',
        ownerEmail: 'amit@example.com',
        rentokId: 'RO-2024-003',
        noOfProperties: 3,
        noOfBeds: 6,
        subscriptionType: 'Platinum' as const,
        bookingDate: new Date(),
        appointmentDate: new Date(),
        appointmentTime: '11:30 AM',
        status: 'completed' as const
      }];

      // Store the sample data
      localStorage.setItem('onboarding-bookings', JSON.stringify(sampleBookings));
    };

    initializeData();
  }, [mounted]);

  // Show loading state during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleRoleSelect = (role: string) => {
    if (role === 'sales') {
      setAppState('sales-user-select');   // pick which sales person to book
    } else if (role === 'cis') {
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
    setAppState('cis-user-select');
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
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
    </div>
  );
}