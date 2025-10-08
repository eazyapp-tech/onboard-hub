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
import { useUser } from '@clerk/nextjs';

const SALES_USERS = [
  { id: 'abhishek-wadia', name: 'Abhishek Wadia', email: 'abhishek.wadia@eazyapp.tech' },
  { id: 'akash-kumar-sao', name: 'Akash Kumar Sao', email: 'akash.k@eazyapp.tech' },
  { id: 'prashant', name: 'Prashant', email: 'prashant@eazyapp.tech' },
  { id: 'somesh-g', name: 'Somesh G', email: 'somesh.g@eazyapp.tech' },
  { id: 'aditis', name: 'Aditis', email: 'aditis@eazyapp.tech' },
  { id: 'tabitha-d', name: 'Tabitha D', email: 'tabitha.d@eazyapp.tech' },
  { id: 'amit', name: 'Amit', email: 'amit@eazyapp.tech' },
  { id: 'bharat-k', name: 'Bharat K', email: 'bharat.k@eazyapp.tech' },
  { id: 'kamalkant-upadhyay', name: 'Kamalkant Upadhyay', email: 'kamalkant.u@eazyapp.tech' },
  { id: 'ashish-p', name: 'Ashish P', email: 'ashish.p@eazyapp.tech' },
  { id: 'ayush-gupta', name: 'Ayush Gupta', email: 'ayush@eazyapp.tech' },
  { id: 'siddhant-goswami', name: 'Siddhant Goswami', email: 'siddhant.goswami@eazyapp.tech' },
  { id: 'pankaj', name: 'Pankaj', email: 'pankaj@eazyapp.tech' },
  { id: 'sanjeev-jadhav', name: 'Sanjeev Jadhav', email: 'sanjeev@eazyapp.tech' },
  { id: 'harsh-tulsyan', name: 'Harsh Tulsyan', email: 'harsh@eazyapp.tech' },
  { id: 'pankaj-arora', name: 'Pankaj Arora', email: 'pankaj@eazyapp.tech' },
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
    setCurrentUser,
    loadBookingsFromBackend,
    migrateLocalDataToBackend,
    bookings
  } = useAppStore();
  const { user } = useUser();

  // Prevent hydration mismatch by ensuring component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load data from backend on startup
  useEffect(() => {
    if (!mounted) return;
    
    const initializeData = async () => {
      try {
        // Load bookings from backend
        await loadBookingsFromBackend();
        console.log('Data loaded from backend on startup');
      } catch (error) {
        console.error('Failed to load data from backend:', error);
        // Fallback: create sample data if backend is not available
        console.log('Using fallback sample data');
      }
    };

    initializeData();
  }, [mounted, loadBookingsFromBackend]);

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

  // If user is signed in but no currentUser in store, show welcome immediately
  if (user && !currentUser && appState === 'role-selection') {
    // User is authenticated but hasn't selected role yet - show welcome
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
      {/* Welcome Banner - Show when user is authenticated */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">
                Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}! 👋
              </h2>
              <p className="text-blue-100 text-sm sm:text-base">
                {appState === 'role-selection' 
                  ? "You're successfully signed in. Select your role to continue."
                  : currentUser 
                    ? `You're signed in as ${currentUser.role === 'sales' ? 'Sales' : 'CIS'} user.`
                    : "You're successfully signed in."
                }
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/sign-out'}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </motion.div>
      )}

      {appState === 'role-selection' && (
        <div>
          <RoleSelector onRoleSelect={handleRoleSelect} />
          
          {/* Debug and Migration Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            className="max-w-md mx-auto mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-blue-800">Data Management</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-blue-700 text-sm">
                Local bookings: <span className="font-semibold">{bookings.length}</span>
              </p>
              
              {bookings.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-blue-700 text-sm">
                    Found {bookings.length} existing onboarding(s) in your browser.
                  </p>
                  <button
                    onClick={async () => {
                      await migrateLocalDataToBackend();
                      alert('Data migration completed! All users can now see your onboardings.');
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Migrate {bookings.length} Onboarding(s) to Shared Database
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-blue-700 text-sm">
                    No local bookings found. Create some test data to test the migration.
                  </p>
                  <button
                    onClick={() => {
                      // Create sample bookings for testing
                      const sampleBookings = [
                        {
                          id: 'test-1',
                          bookingRef: 'ONB-TEST-001',
                          portfolioManager: 'Test Manager',
                          ownerName: 'Test Owner 1',
                          ownerPhone: '+91-9876543210',
                          ownerEmail: 'test1@example.com',
                          rentokId: 'RO-TEST-001',
                          noOfProperties: 1,
                          noOfBeds: 2,
                          subscriptionType: 'Gold' as const,
                          soldPricePerBed: 5000,
                          subscriptionStartDate: '2025-01-15',
                          monthsBilled: 6,
                          freeMonths: 0,
                          bookingLocation: 'north_delhi' as const,
                          mode: 'physical' as const,
                          bookingDate: new Date(),
                          appointmentDate: new Date(),
                          appointmentTime: '10:00 AM',
                          status: 'scheduled' as const,
                          onboardingStatus: 'Onboarding Started' as const,
                          cisId: 'manish-arora',
                          date: '2025-01-15',
                          slotWindow: '10_13',
                          createdBy: 'Test User',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          totalAmount: 10000
                        },
                        {
                          id: 'test-2',
                          bookingRef: 'ONB-TEST-002',
                          portfolioManager: 'Test Manager 2',
                          ownerName: 'Test Owner 2',
                          ownerPhone: '+91-9876543211',
                          ownerEmail: 'test2@example.com',
                          rentokId: 'RO-TEST-002',
                          noOfProperties: 2,
                          noOfBeds: 4,
                          subscriptionType: 'Silver' as const,
                          soldPricePerBed: 3000,
                          subscriptionStartDate: '2025-01-16',
                          monthsBilled: 8,
                          freeMonths: 1,
                          bookingLocation: 'south_delhi' as const,
                          mode: 'virtual' as const,
                          bookingDate: new Date(),
                          appointmentDate: new Date(),
                          appointmentTime: '2:00 PM',
                          status: 'scheduled' as const,
                          onboardingStatus: 'Onboarding Started' as const,
                          cisId: 'harsh-tulsyan',
                          date: '2025-01-16',
                          slotWindow: '13_15',
                          createdBy: 'Test User',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          totalAmount: 20000
                        }
                      ];
                      
                      // Add to store
                      sampleBookings.forEach(booking => {
                        useAppStore.getState().addBooking(booking);
                      });
                      
                      alert(`Created ${sampleBookings.length} test bookings. Refresh the page to see the migration button.`);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create Test Data (2 Sample Bookings)
                  </button>
                </div>
              )}
              
              <button
                onClick={async () => {
                  await loadBookingsFromBackend();
                  alert('Data refreshed from backend!');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Refresh from Backend
              </button>
            </div>
          </motion.div>
        </div>
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
            { id: 'manish-arora', name: 'Manish Arora', email: 'manish.arora@eazyapp.tech' },
            { id: 'harsh-tulsyan', name: 'Harsh Tulsyan', email: 'harsh@eazyapp.tech' },
            { id: 'vikash-jarwal', name: 'Vikash Jarwal', email: 'vikash.b@eazyapp.tech' },
            { id: 'jyoti-kalra', name: 'Jyoti Kalra', email: 'jyoti.k@eazyapp.tech' },
            { id: 'megha-verma', name: 'Megha Verma', email: 'meghav@eazyapp.tech' },
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