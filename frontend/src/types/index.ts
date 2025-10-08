export interface User {
  id: string;
  name: string;
  email: string;
  role: 'sales' | 'cis' | 'admin';
  active: boolean;
}

export interface Booking {
  id: string;
  bookingRef: string;
  portfolioManager: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  rentokId: string;
  noOfProperties: number;
  noOfBeds: number;
  subscriptionType: 'Base' | 'Silver' | 'Gold';
  soldPricePerBed: number;
  subscriptionStartDate: string;
  monthsBilled: number;
  freeMonths?: number;
  bookingLocation: 'north_delhi' | 'south_delhi' | 'noida' | 'gurgaon' | 'others';
  mode: 'virtual' | 'physical';
  cisId: string;
  slotWindow: string;
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  onboardingStatus: OnboardingStatus; // new display status
  statusHistory?: StatusHistoryItem[]; // new
  attachmentUrl?: string;              // new
  onboardingId?: string;               // new: link to onboarding record
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  calendarEventId?: string;
  notes?: string;
  actualOnboardingDate?: string;
  actualOnboardingTime?: string;
  totalAmount: number;
  cancellationReason?: string;         // new: reason for cancellation
  cancellationRemarks?: string;        // new: additional remarks for cancellation
  cancelledAt?: string;                // new: when the cancellation happened
  cancelledBy?: string;                // new: who cancelled it
}

export interface BookingAddon {
  id: string;
  bookingId: string;
  addonType: 'kyc' | 'stamp' | 'verification' | 'whitelabel' | 'genie' | 'legal' | 'ca' | 'electricity';
  price: number;
  source: 'pre-sold' | 'at-onboarding';
  notes?: string;
}

export interface CisDayLock {
  id: string;
  cisId: string;
  date: string;
  lockLocation: 'north_delhi' | 'south_delhi' | 'noida' | 'gurgaon' | 'others';
  lockedByBookingId: string;
  override: boolean;
  createdAt: string;
}

export interface SlotWindow {
  value: '10_13' | '14_17' | '18_19';
  label: string;
  available: boolean;
}

export const ADDON_OPTIONS = [
  { value: 'kyc', label: 'KYC' },
  { value: 'stamp', label: 'Stamp' },
  { value: 'verification', label: 'Verification Services' },
  { value: 'whitelabel', label: 'White Label' },
  { value: 'genie', label: 'RentOk Genie' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'ca', label: 'CA Services' },
  { value: 'electricity', label: 'Electricity Meter' }
] as const;

export const LOCATION_OPTIONS = [
  { value: 'north_delhi', label: 'North Delhi' },
  { value: 'south_delhi', label: 'South Delhi' },
  { value: 'noida', label: 'Noida' },
  { value: 'gurgaon', label: 'Gurgaon' },
  { value: 'others', label: 'Others' }
] as const;

export const SUBSCRIPTION_TYPES = [
  { value: 'Base', label: 'Base' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Gold', label: 'Gold' }
] as const;

export const SLOT_WINDOWS = [
  { value: '10_13', label: '10 AM – 1 PM' },
  { value: '14_17', label: '2 PM – 5 PM' },
  { value: '18_19', label: '6 PM – 7 PM' }
] as const;

export const CIS_USERS = [
  { id: 'manish-arora', name: 'Manish Arora', email: 'manish.arora@eazyapp.tech' },
  { id: 'harsh-tulsyan', name: 'Harsh Tulsyan', email: 'harsh@eazyapp.tech' },
  { id: 'vikash-jarwal', name: 'Vikash Jarwal', email: 'vikash.b@eazyapp.tech' },
  { id: 'jyoti-kalra', name: 'Jyoti Kalra', email: 'jyoti.k@eazyapp.tech' },
  { id: 'megha-verma', name: 'Megha Verma', email: 'meghav@eazyapp.tech' },
  { id: 'aditya-shrivastav', name: 'Aditya Shrivastav', email: 'aditya@eazyapp.tech' }
] as const;

export const BDE_USERS = [
  { id: 'siddhant', name: 'Siddhant Goswami', email: 'siddhant.goswami@eazyapp.tech' },
  { id: 'pankaj', name: 'Pankaj Arora', email: 'pankaj@eazyapp.tech' }
] as const;

// Onboarding status values
export type OnboardingStatus =
  | 'Onboarding Started'
  | 'Onboarding Delayed'
  | 'Onboarding Done'
  | 'Reopened'
  | 'Cancelled';

// Each status change we log with time
export interface StatusHistoryItem {
  status: OnboardingStatus;
  at: string; // ISO string
  note?: string;
  attachmentUrl?: string; // optional photo URL
}
