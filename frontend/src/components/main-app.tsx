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
import { ReferralForm } from './referral-form';
import { TrainingModule } from './training-module';
import { SalesPreviousBookings } from './sales-previous-bookings';
import { AddonDashboard } from './addon-dashboard';
import { TeamMemberSelector } from './team-member-selector';

type AppState = 
  | 'role-selection'
  | 'sales-dashboard'
  | 'cis-dashboard'
  | 'addon-dashboard';

export function MainApp() {
  const [appState, setAppState] = useState<AppState>('role-selection');
  const [showTodayBookings, setShowTodayBookings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cisTab, setCisTab] = useState<'dashboard' | 'referral'>('dashboard');
  const [salesTab, setSalesTab] = useState<'booking' | 'history' | 'training'>('booking');
  const {
    currentUser,
    setCurrentUser,
    loadBookingsFromBackend,
    migrateLocalDataToBackend,
    bookings,
    loadUserAccess,
    userAccess,
    selectedTeamMember,
    setSelectedTeamMember
  } = useAppStore();
  const { user } = useUser();

  // Prevent hydration mismatch by ensuring component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user access when user is authenticated
  const [loadingUserAccess, setLoadingUserAccess] = useState(false);
  
  useEffect(() => {
    if (!mounted || !user) return;
    
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (userEmail && !userAccess && !loadingUserAccess) {
      setLoadingUserAccess(true);
      
      // Set a maximum timeout to prevent infinite loading
      const maxTimeout = setTimeout(() => {
        console.warn('[MAIN-APP] User access loading timed out, proceeding with fallback');
        setLoadingUserAccess(false);
      }, 15000); // 15 second maximum
      
      loadUserAccess(userEmail).finally(() => {
        clearTimeout(maxTimeout);
        setLoadingUserAccess(false);
      });
    }
  }, [mounted, user, userAccess, loadUserAccess, loadingUserAccess]);

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
    const baseUser = {
      id: user?.id || 'anonymous',
      name: user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User',
      email: user?.emailAddresses[0]?.emailAddress || 'user@eazyapp.tech',
      active: true,
    };

    if (role === 'sales') {
      setCurrentUser({ ...baseUser, role: 'sales' });
      setSalesTab('booking');
      setAppState('sales-dashboard');
    } else if (role === 'cis') {
      setCurrentUser({ ...baseUser, role: 'cis' });
      setCisTab('dashboard');
      setAppState('cis-dashboard');
    } else if (role === 'addon') {
      setCurrentUser({ ...baseUser, role: 'sales' });
      setAppState('addon-dashboard');
    }
  };

  const handleBookingSuccess = () => {};

  const handleBackToRoles = () => {
    setCurrentUser(null);
    setAppState('role-selection');
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
          {user && loadingUserAccess ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your access permissions...</p>
              </div>
            </div>
          ) : (
            <RoleSelector onRoleSelect={handleRoleSelect} />
          )}
        </div>
      )}

      {appState === 'sales-dashboard' && (
        <div>
          <Header
            title={
              salesTab === 'booking'
                ? 'Create Booking'
                : salesTab === 'history'
                ? 'Previous Bookings'
                : 'Training Hub'
            }
            showBackButton
            onBack={handleBackToRoles}
            showTodayBookings={salesTab === 'booking'}
            onTodayBookings={
              salesTab === 'booking' ? () => setShowTodayBookings(true) : undefined
            }
          />

          <div className="max-w-6xl mx-auto px-4 pt-6">
            <div className="flex border-b border-glass-border rounded-t-xl overflow-hidden">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSalesTab('booking')}
                className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  salesTab === 'booking'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Booking
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSalesTab('history')}
                className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  salesTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Previous Bookings
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSalesTab('training')}
                className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  salesTab === 'training'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Training
              </motion.button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 pt-6 pb-8">
            {/* Show team member selector only for viewing tabs, not for booking creation */}
            {salesTab !== 'booking' && userAccess && (userAccess.isSuperAdmin || userAccess.scopes?.sales?.level === 'manager') && (
              <TeamMemberSelector
                userAccess={userAccess}
                scope="sales"
                onSelect={setSelectedTeamMember}
                currentSelection={selectedTeamMember}
              />
            )}
            
            {salesTab === 'booking' && <BookingForm onSuccess={handleBookingSuccess} />}
            {salesTab === 'history' && (
              <SalesPreviousBookings currentUser={currentUser} />
            )}
            {salesTab === 'training' && <TrainingModule />}
          </div>
        </div>
      )}

      {appState === 'cis-dashboard' && (
        <div>
          <Header
            title={cisTab === 'dashboard' ? 'Onboarding Dashboard' : 'Referral Form'}
            showBackButton
            onBack={handleBackToRoles}
          />

          <div className="max-w-6xl mx-auto px-4 pt-6">
            <div className="flex border-b border-glass-border rounded-t-xl overflow-hidden">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCisTab('dashboard')}
                className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  cisTab === 'dashboard'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Onboarding Dashboard
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCisTab('referral')}
                className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
                  cisTab === 'referral'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Referral Form
              </motion.button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 pt-6 pb-8">
            {/* Show team member selector only for dashboard tab, not for referral form */}
            {cisTab === 'dashboard' && userAccess && (userAccess.isSuperAdmin || userAccess.scopes?.onboarding?.level === 'manager') && (
              <TeamMemberSelector
                userAccess={userAccess}
                scope="onboarding"
                onSelect={setSelectedTeamMember}
                currentSelection={selectedTeamMember}
              />
            )}
            
            {cisTab === 'dashboard' ? (
              <CisDashboard />
            ) : (
              <ReferralForm context="cis" teamMemberName={currentUser?.name} />
            )}
          </div>
        </div>
      )}

      {appState === 'addon-dashboard' && (
        <div>
          <Header title="Add-on Manager" showBackButton onBack={handleBackToRoles} />
          <AddonDashboard />
        </div>
      )}

      <TodayBookingsModal isOpen={showTodayBookings} onClose={() => setShowTodayBookings(false)} />

      <Toaster position="top-right" richColors />
    </div>
  );
}