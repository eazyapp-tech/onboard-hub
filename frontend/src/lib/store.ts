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
  
  // backend data management
  loadBookingsFromBackend: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  migrateLocalDataToBackend: () => Promise<void>;
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
        const specificCities = ['north_delhi', 'south_delhi', 'noida', 'gurgaon'];
        
        if (mode === 'virtual') {
          if (specificCities.includes(location)) {
            // Virtual for specific cities: Default to Harsh
            return 'harsh-tulsyan';
          } else {
            // Virtual for Others: Only Harsh
            return 'harsh-tulsyan';
          }
        } else {
          // Physical mode
          if (specificCities.includes(location)) {
            // Physical for specific cities: Default to Manish
            return 'manish-arora';
          } else {
            // Physical for Others: Default to Manish
            return 'manish-arora';
          }
        }
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

      // backend data management
      loadBookingsFromBackend: async () => {
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
          const response = await fetch(`${API_BASE_URL}/api/onboarding`);
          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.data) {
              // Transform backend data to match frontend Booking interface
              const transformedBookings = data.data.map((item: any) => ({
                id: item._id,
                bookingRef: `ONB-${new Date(item.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}-${item._id.slice(-4)}`,
                portfolioManager: item.portfolioManager || 'System',
                ownerName: item.name,
                ownerPhone: item.phone,
                ownerEmail: item.email,
                rentokId: item.propertyId,
                noOfProperties: item.noOfProperties || 1,
                noOfBeds: item.noOfBeds || 2,
                subscriptionType: (item.subscriptionType as 'Base' | 'Silver' | 'Gold') || 'Base',
                soldPricePerBed: item.soldPricePerBed || 0,
                subscriptionStartDate: item.subscriptionStartDate || (item.moveInDate ? new Date(item.moveInDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
                monthsBilled: item.monthsBilled || 6,
                freeMonths: item.freeMonths || 0,
                bookingLocation: (item.bookingLocation as 'north_delhi' | 'south_delhi' | 'noida' | 'gurgaon' | 'others') || 'north_delhi',
                mode: (item.mode as 'virtual' | 'physical') || 'physical',
                cisId: item.cisId,
                slotWindow: (() => {
                  // Convert human-readable format to underscore format
                  const slotWindow = item.slotWindow || '10_13';
                  if (slotWindow.includes('AM') || slotWindow.includes('PM')) {
                    switch (slotWindow) {
                      case '10 AM - 1 PM': return '10_13';
                      case '2 PM - 5 PM': return '14_17';
                      case '6 PM - 7 PM': return '18_19';
                      default: return slotWindow;
                    }
                  }
                  return slotWindow;
                })(),
                date: item.date || (item.moveInDate ? new Date(item.moveInDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
                status: item.status || 'scheduled',
                onboardingStatus: item.status || 'Onboarding Started',
                createdBy: item.createdBy || 'System',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                totalAmount: item.totalAmount || 0,
                notes: item.notes,
                // Completion data
                actualOnboardingDate: item.actualOnboardingDate,
                actualOnboardingTime: item.actualOnboardingTime,
                onboardingAddons: item.onboardingAddons || [],
                attachmentUrls: item.attachmentUrls || { checklist: [], reviews: [] },
                // Cancellation data
                cancellationReason: item.cancellationReason,
                cancellationRemarks: item.cancellationRemarks,
                cancelledAt: item.cancelledAt,
                cancelledBy: item.cancelledBy
              }));
              set({ bookings: transformedBookings });
              console.log('Loaded onboardings from backend:', transformedBookings.length);
            }
          } else {
            console.warn('Failed to load onboardings from backend:', response.status);
          }
        } catch (error) {
          console.error('Error loading onboardings from backend:', error);
        }
      },

      refreshBookings: async () => {
        const { loadBookingsFromBackend } = get();
        await loadBookingsFromBackend();
      },

      migrateLocalDataToBackend: async () => {
        try {
          const { bookings } = get();
          if (bookings.length === 0) {
            console.log('No local data to migrate');
            return;
          }

          console.log(`Migrating ${bookings.length} bookings to backend...`);
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
          
          // Send each booking to the backend
          for (const booking of bookings) {
            try {
              const response = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(booking),
              });
              
              if (response.ok) {
                console.log(`Migrated booking: ${booking.bookingRef}`);
              } else {
                console.error(`Failed to migrate booking: ${booking.bookingRef}`);
              }
            } catch (error) {
              console.error(`Error migrating booking ${booking.bookingRef}:`, error);
            }
          }
          
          // Clear local storage and reload from backend
          set({ bookings: [] });
          await get().loadBookingsFromBackend();
          console.log('Migration completed');
        } catch (error) {
          console.error('Migration error:', error);
        }
      },
    }),
    {
      name: 'onboarding-hub-storage',
    }
  )
);
