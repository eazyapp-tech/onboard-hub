import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Booking, BookingAddon, CisDayLock, OnboardingStatus } from '@/types';
import { format } from 'date-fns';

interface AppState {
  currentUser: User | null;
  bookings: Booking[];
  bookingAddons: BookingAddon[];
  cisDayLocks: CisDayLock[];
  
  // which CIS user's dashboard we're looking at (or saving to)
  dashboardUserId: string | null;
  selectedOnboardingId: string | null;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  addBookingAddon: (addon: BookingAddon) => void;
  addCisDayLock: (lock: CisDayLock) => void;
  getCisDayLock: (cisId: string, date: string) => CisDayLock | undefined;
  getBookingsByDate: (date: string) => Booking[];
  getBookingsByCis: (cisId: string, date?: string) => Booking[];
  generateBookingRef: () => string;
  assignCis: (location: string, mode: string) => string;
  getAvailableSlots: (cisId: string, date: string, location: string) => string[];
  
  // set / clear dashboard user
  setDashboardUserId: (id: string | null) => void;
  
  // convenience: all bookings for that CIS
  getBookingsForCis: (cisId: string) => Booking[];
  
  // onboarding status management
  updateOnboardingStatus: (id: string, status: OnboardingStatus, note?: string) => void;
  attachOnboardingPhoto: (id: string, url: string) => void;
  setSelectedOnboarding: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      bookings: [],
      bookingAddons: [],
      cisDayLocks: [],
      dashboardUserId: null,
      selectedOnboardingId: null,

      setCurrentUser: (user) => set({ currentUser: user }),

      addBooking: (booking) => set((state) => ({
        bookings: [...state.bookings, booking]
      })),

      updateBooking: (id, updates) => set((state) => ({
        bookings: state.bookings.map(booking => 
          booking.id === id ? { ...booking, ...updates } : booking
        )
      })),

      addBookingAddon: (addon) => set((state) => ({
        bookingAddons: [...state.bookingAddons, addon]
      })),

      addCisDayLock: (lock) => set((state) => ({
        cisDayLocks: [...state.cisDayLocks, lock]
      })),

      getCisDayLock: (cisId, date) => {
        const locks = get().cisDayLocks;
        return locks.find(lock => lock.cisId === cisId && lock.date === date);
      },

      getBookingsByDate: (date) => {
        const bookings = get().bookings;
        return bookings.filter(booking => booking.date === date);
      },

      getBookingsByCis: (cisId, date) => {
        const bookings = get().bookings;
        return bookings.filter(booking => 
          booking.cisId === cisId && (!date || booking.date === date)
        );
      },

      generateBookingRef: () => {
        const today = format(new Date(), 'yyyyMMdd');
        const bookings = get().bookings;
        const todayBookings = bookings.filter(b => b.bookingRef.includes(today));
        const nextNumber = todayBookings.length + 1;
        return `ONB-${today}-${nextNumber.toString().padStart(4, '0')}`;
      },

      assignCis: (location, mode) => {
        if (mode === 'virtual') return 'megha';
        if ((location === 'south_delhi' || location === 'gurgaon') && mode === 'physical') return 'vikash';
        if ((location === 'north_delhi' || location === 'noida') && mode === 'physical') return 'manish';
        return 'harsh';
      },

      getAvailableSlots: (cisId, date, location) => {
        const state = get();
        const dayLock = state.getCisDayLock(cisId, date);
        
        // If there's a day lock and location doesn't match, return empty slots
        if (dayLock && !dayLock.override && dayLock.lockLocation !== location) {
          return [];
        }

        const existingBookings = state.bookings.filter(
          booking => booking.cisId === cisId && booking.date === date && booking.status !== 'cancelled'
        );

        const allSlots: ('10_13' | '14_17' | '18_19')[] = ['10_13', '14_17', '18_19'];
        const bookedSlots = existingBookings.map(booking => booking.slotWindow);
        
        return allSlots.filter(slot => !bookedSlots.includes(slot));
      },

      // set / clear dashboard user
      setDashboardUserId: (id) => set((state) => ({ ...state, dashboardUserId: id })),

      // convenience: all bookings for that CIS
      getBookingsForCis: (cisId) => get().bookings.filter(b => b.cisId === cisId),

      // onboarding status management
      updateOnboardingStatus: (id, status, note) => set((state) => {
        const bookings = state.bookings.map(b => {
          if (b.id !== id) return b;
          const now = new Date().toISOString();
          const history = b.statusHistory ? [...b.statusHistory] : [];
          history.push({ status, at: now, note });
          return { ...b, onboardingStatus: status, statusHistory: history, updatedAt: now };
        });
        return { ...state, bookings };
      }),

      attachOnboardingPhoto: (id, url) => set((state) => {
        const bookings = state.bookings.map(b => {
          if (b.id !== id) return b;
          const now = new Date().toISOString();
          const history = b.statusHistory ? [...b.statusHistory] : [];
          // record it on the latest history item too
          if (history.length) {
            history[history.length - 1] = {
              ...history[history.length - 1],
              attachmentUrl: url,
            };
          }
          return { ...b, attachmentUrl: url, statusHistory: history, updatedAt: now };
        });
        return { ...state, bookings };
      }),

      setSelectedOnboarding: (id) => set({ selectedOnboardingId: id }),
    }),
    {
      name: 'onboarding-hub-storage',
    }
  )
);
