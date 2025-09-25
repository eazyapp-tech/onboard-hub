'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, DollarSign, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ADDON_OPTIONS, LOCATION_OPTIONS, SUBSCRIPTION_TYPES, SLOT_WINDOWS, CIS_USERS } from '@/types';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config';
interface BookingFormProps {
  onSuccess: () => void;
  forcedCisId?: string; // NEW: when Sales picked a user
}
export function BookingForm({
  onSuccess,
  forcedCisId
}: BookingFormProps) {
  const {
    addBooking,
    updateBooking,
    addCisDayLock,
    generateBookingRef,
    assignCis,
    getAvailableSlots,
    getCisDayLock,
    currentUser
  } = useAppStore();
  const [formData, setFormData] = useState({
    portfolioManager: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    rentokId: '',
    noOfProperties: 1,
    noOfBeds: 1,
    subscriptionType: 'Base' as const,
    soldPricePerBed: 0,
    subscriptionStartDate: format(new Date(), 'yyyy-MM-dd'),
    monthsBilled: 1,
    freeMonths: 0,
    bookingLocation: 'north_delhi' as const,
    mode: 'physical' as 'physical' | 'virtual',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    slotWindow: '' as string,
    cisId: '' as 'megha' | 'aditya' | 'manish' | ''
  });
  const [selectedAddons, setSelectedAddons] = useState<Array<{
    type: string;
    price: number;
    notes: string;
  }>>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [cisOptions, setCisOptions] = useState<
    { label: string; email: string }[]
  >([]);
  const [selectedCisEmail, setSelectedCisEmail] = useState<string>('');
  const [serverSlots, setServerSlots] = useState<
    { id: string; label: string; startTime: string; endTime: string }[]
  >([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [slotOptions, setSlotOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  
  // Build candidate slots by mode.
  // - physical: 3h blocks [10-13], [14-17], plus 1h [18-19]
  // - virtual:  2h blocks [10-12], [12-14], [15-17], plus 1h [18-19]
  function getCandidateSlotsForMode(mode: 'physical' | 'virtual') {
    if (mode === 'virtual') {
      return [
        { value: '10_12', label: '10:00 AM – 12:00 PM', startHour: 10, endHour: 12 },
        { value: '12_14', label: '12:00 PM – 2:00 PM', startHour: 12, endHour: 14 },
        { value: '15_17', label: '3:00 PM – 5:00 PM', startHour: 15, endHour: 17 },
        { value: '18_19', label: '6:00 PM – 7:00 PM', startHour: 18, endHour: 19 },
      ];
    }
    // physical
    return [
      { value: '10_13', label: '10:00 AM – 1:00 PM', startHour: 10, endHour: 13 },
      { value: '14_17', label: '2:00 PM – 5:00 PM', startHour: 14, endHour: 17 },
      { value: '18_19', label: '6:00 PM – 7:00 PM', startHour: 18, endHour: 19 },
    ];
  }

  // Check if two time ranges overlap (Date objects)
  function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && bStart < aEnd;
  }

  // Parse a backend busy array into Date ranges
  type BusyRange = { start: string; end: string };
  function parseBusy(busy: BusyRange[]) {
    return busy.map(b => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));
  }

  // --- helper: build payload for /api/onboarding (Deals sheet) ---
  const buildOnboardingPayloadFromBookingForm = () => {
    const locLabel =
      LOCATION_OPTIONS.find(l => l.value === formData.bookingLocation)?.label ||
      formData.bookingLocation;

    // turn selected add-ons into a readable string (optional)
    const addonsSummary = selectedAddons.length
      ? selectedAddons.map(a => `${a.type || 'custom'}: ₹${a.price}${a.notes ? ` (${a.notes})` : ''}`).join('; ')
      : '';

    // Format slot window for display
    const formatSlotWindow = (slotWindow) => {
      switch (slotWindow) {
        case '10_13': return '10 AM - 1 PM';
        case '14_17': return '2 PM - 5 PM';
        case '18_19': return '6 PM - 7 PM';
        default: return slotWindow;
      }
    };

    // Calculate subscription summary
    const subscriptionSummary = `${formData.subscriptionType} · ${formData.noOfBeds} beds · ${formData.monthsBilled} months`;

    return {
      // Basic contact info
      name: formData.ownerName,
      phone: formData.ownerPhone || '',
      email: formData.ownerEmail || '',
      city: locLabel,
      budget: totalAmount,

      // Property details
      propertyId: formData.rentokId || '',
      propertyName: '', // not collected here
      moveInDate: formData.subscriptionStartDate || '',

      // Comprehensive booking details for sheets
      portfolioManager: formData.portfolioManager || '',
      subscriptionStartDate: formData.subscriptionStartDate || '',
      subscriptionSummary: subscriptionSummary,
      noOfProperties: formData.noOfProperties || 0,
      noOfBeds: formData.noOfBeds || 0,
      subscriptionType: formData.subscriptionType || 'Base',
      soldPricePerBed: formData.soldPricePerBed || 0,
      monthsBilled: formData.monthsBilled || 0,
      freeMonths: formData.freeMonths || 0,
      bookingLocation: locLabel,
      mode: formData.mode || 'physical',
      cisId: formData.cisId || '',
      slotWindow: formatSlotWindow(formData.slotWindow),
      date: formData.date || '',
      status: 'scheduled',
      bookingRef: generateBookingRef(),
      createdBy: currentUser?.name || 'Unknown',

      // Meta information
      source: 'Onboarding Booking Form',
      preferences: subscriptionSummary,
      notes: addonsSummary,

      // Onboarding status tracking
      statusHistory: [
        { status: 'Onboarding Started', at: new Date().toISOString(), note: 'Created from Sales form' }
      ],
    };
  };
  
  useEffect(() => {
    if (formData.mode === 'virtual') {
      const opts = [
        { label: 'Megha (megha@eazyapp.tech)', email: 'megha@eazyapp.tech' },
      ];
      setCisOptions(opts);
      setSelectedCisEmail(opts[0].email);
    } else {
      const opts = [
        { label: 'Aditya (aditya@eazyapp.tech)', email: 'aditya@eazyapp.tech' },
        { label: 'Manish Arora (manish.arora@eazyapp.tech)', email: 'manish.arora@eazyapp.tech' },
      ];
      setCisOptions(opts);
      setSelectedCisEmail(opts[0].email);
    }
  }, [formData.mode]);

  async function loadSlots() {
    if (!selectedCisEmail || !formData.date) return;
    try {
      setLoadingSlots(true);
      setServerSlots([]);
      setSelectedSlotId('');

      const params = new URLSearchParams({
        email: selectedCisEmail,
        date: formData.date,
        mode: formData.mode,
      });
      const res = await fetch(`${API_BASE_URL}/api/freebusy?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        console.error('freebusy failed:', json);
        toast.error('Could not load availability. Check console.');
        return;
      }
      setServerSlots(json.data || []);
    } catch (e) {
      console.error('freebusy error:', e);
      toast.error('Could not load availability. Check console.');
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCisEmail, formData.date, formData.mode]);

  // Auto-fill portfolio manager when sales user is selected
  useEffect(() => {
    // If a sales user is selected and the field is empty, fill it.
    if (currentUser?.role === 'sales' && !formData.portfolioManager) {
      setFormData((prev) => ({ ...prev, portfolioManager: currentUser.name }));
    }
  }, [currentUser?.id]);
  
  // which CIS is selected in the form
  const cisUser = CIS_USERS.find(cis => cis.id === formData.cisId);

  // whenever date, mode, or CIS changes → fetch free/busy and compute slots
  useEffect(() => {
    async function load() {
      setSlotsError(null);
      setLoadingSlots(true);
      setSlotOptions([]); // reset to avoid stale

      // need a CIS email to query; if none, bail early
      const email = cisUser?.email;
      if (!email) {
        setLoadingSlots(false);
        return;
      }

      // 1) get busy from backend
      try {
        const url = `/api/freebusy?email=${encodeURIComponent(email)}&date=${encodeURIComponent(
          formData.date
        )}&mode=${encodeURIComponent(formData.mode)}`;

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          console.error('freebusy error:', json);
          setSlotsError('Could not load availability. Try again.');
          setLoadingSlots(false);
          return;
        }

        const busyRanges = parseBusy(json.data?.busy || []);

        // 2) build candidate slots by mode
        const candidates = getCandidateSlotsForMode(formData.mode);

        // 3) turn each candidate into a range on the selected date and filter if overlapping busy
        const [y, m, d] = formData.date.split('-').map(Number);

        const available = candidates.filter(c => {
          const start = new Date(y, m - 1, d, c.startHour, 0, 0);
          const end = new Date(y, m - 1, d, c.endHour, 0, 0);

          // if overlaps ANY busy -> remove
          const conflicts = busyRanges.some(b => rangesOverlap(start, end, b.start, b.end));
          return !conflicts;
        });

        setSlotOptions(available.map(a => ({ value: a.value, label: a.label })));

        // optional: if the currently selected slot is no longer available, clear it
        if (formData.slotWindow && !available.find(a => a.value === formData.slotWindow)) {
          setFormData(prev => ({ ...prev, slotWindow: '' }));
        }
      } catch (e) {
        console.error('freebusy fetch fail:', e);
        setSlotsError('Could not load availability. Check console.');
      } finally {
        setLoadingSlots(false);
      }
    }

    load();
  }, [cisUser?.email, formData.date, formData.mode, formData.cisId]);
  
  const availableSlots = getAvailableSlots(formData.cisId, formData.date, formData.bookingLocation);
  
  // --- helper: turn slotWindow + date into start/end ISO strings (local → ISO) ---
  function getSlotTimesISO(dateStr: string, slotWindow: string) {
    // slotWindow like "10_13", "15_17", "10_12", etc.
    const [startH, endH] = slotWindow.split('_').map(Number);

    if (!Number.isFinite(startH) || !Number.isFinite(endH)) {
      throw new Error(`Invalid slotWindow: ${slotWindow}`);
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d, startH, 0, 0);
    const end = new Date(y, m - 1, d, endH, 0, 0);

    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  // --- helper: build backend payload from your form data ---
  const buildBackendPayload = () => {
    const locLabel =
      LOCATION_OPTIONS.find(l => l.value === formData.bookingLocation)?.label ||
      formData.bookingLocation;

    const { startISO, endISO } = getSlotTimesISO(formData.date, formData.slotWindow);

    return {
      fullName: formData.ownerName,
      email: formData.ownerEmail,
      phone: formData.ownerPhone,
      propertyId: formData.rentokId || undefined,
      propertyName: '',
      startTime: startISO,
      endTime: endISO,
      summary: `Onboarding Booking - ${formData.ownerName}`,
      location: `${locLabel} · ${formData.mode === 'physical' ? 'Physical' : 'Virtual'}`,
      attendees: [
        ...(formData.ownerEmail ? [{ email: formData.ownerEmail, displayName: formData.ownerName }] : []),
        ...(selectedCisEmail ? [{ email: selectedCisEmail, displayName: 'CIS' }] : []),
      ],
      cisEmail: selectedCisEmail, // <— IMPORTANT for backend impersonation
    };
  };
  
  const totalAmount = formData.noOfBeds * formData.soldPricePerBed * formData.monthsBilled;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      toast.error('Please confirm the owner has received the required templates');
      return;
    }
    if (!formData.slotWindow) {
      toast.error('Please pick a free time slot');
      return;
    }
    if (!formData.cisId) {
      toast.error('Please select the onboarding person');
      return;
    }
  
    const bookingId = crypto.randomUUID();
    const bookingRef = generateBookingRef();
    const booking = {
      id: bookingId,
      bookingRef,
      ...formData,
      slotWindow: formData.slotWindow, // now just a string like "10_12" or "14_17"
      selectedSlotId,
      cisId: formData.cisId,
      status: 'scheduled' as const,
      onboardingStatus: 'Onboarding Started' as const,
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalAmount
    };
  
    // 1) your existing local state writes (kept exactly as-is)
    console.log('Adding booking to store:', booking);
    addBooking(booking);
    console.log('Store after adding booking:', useAppStore.getState().bookings);
  
    // Create day lock if this is the first booking for this CIS on this date
    const existingLock = getCisDayLock(formData.cisId, formData.date);
    if (!existingLock) {
      addCisDayLock({
        id: crypto.randomUUID(),
        cisId: formData.cisId,
        date: formData.date,
        lockLocation: formData.bookingLocation,
        lockedByBookingId: bookingId,
        override: false,
        createdAt: new Date().toISOString()
      });
    }
  
    // 2) NEW: also sync to backend (Express → Calendar + Sheets + Mongo)
    try {
      const payload = buildBackendPayload();
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 2b) NEW: also append an "onboarding" row to Deals sheet (and Mongo)
try {
  const onboardingPayload = buildOnboardingPayloadFromBookingForm();
      const res2 = await fetch(`${API_BASE_URL}/api/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(onboardingPayload),
  });
  const data2 = await res2.json();

  if (!res2.ok || !data2?.ok) {
    console.error('Onboarding sheet sync failed:', data2);
    toast.error('Saved booking, but failed to save Onboarding to sheet.');
  } else {
    toast.success('Onboarding saved to Deals sheet ✅');
    
    // Store the onboarding ID in the booking for future updates
    const onboardingId = data2.data._id;
    updateBooking(bookingId, { onboardingId });
  }
} catch (e) {
  console.error('Onboarding sheet sync error:', e);
  toast.error('Saved booking, but sheet call errored. Check console.');
}
  
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        console.error('Backend sync failed:', data);
        toast.error('Synced locally, but backend failed to save. Check logs.');
      } else {
        if (data?.data?.eventLink) {
          toast.success('Calendar event created ✅');
          // optional: console.log('Event link:', data.data.eventLink);
        }
      }
    } catch (err) {
      console.error('Backend sync error:', err);
      toast.error('Synced locally, but backend call errored. Check console.');
    }
  
    // 3) your original success flow
    toast.success(`Booking created successfully! Ref: ${bookingRef}`);
    onSuccess();
  };  
  const addAddon = () => {
    setSelectedAddons([...selectedAddons, {
      type: '',
      price: 0,
      notes: ''
    }]);
  };
  const removeAddon = (index: number) => {
    setSelectedAddons(selectedAddons.filter((_, i) => i !== index));
  };
  const updateAddon = (index: number, field: string, value: any) => {
    const updated = [...selectedAddons];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setSelectedAddons(updated);
  };
  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6" data-unique-id="44048e76-c3fc-46f8-8f7e-4d4941c3dd07" data-file-name="components/booking-form.tsx">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="glass rounded-2xl p-4 sm:p-6 lg:p-8" data-unique-id="402cb450-ea69-4626-b34d-93930184cc7a" data-file-name="components/booking-form.tsx">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" data-unique-id="62bd7d20-5f8c-4742-9a9d-1417106d7580" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="50f142bb-baa2-433d-8fc1-a40c2cc05146" data-file-name="components/booking-form.tsx">Create New Onboarding Booking</span></h2>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8" data-unique-id="c1090198-a138-420e-83ad-65f268609f07" data-file-name="components/booking-form.tsx" data-dynamic-text="true">
          {/* Portfolio Section */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.1
        }} className="space-y-4" data-unique-id="9458dfa7-7a98-4b04-b094-24a72602f0d2" data-file-name="components/booking-form.tsx">
            <h3 className="text-xl font-semibold" data-unique-id="d84522a5-4678-4c75-aff0-3f8385fe9a8e" data-file-name="components/booking-form.tsx">
              <span className="editable-text" data-unique-id="b8ec3c99-ad3a-478f-b5fb-fa8bad1ed65a" data-file-name="components/booking-form.tsx">
              Portfolio
            </span></h3>
            <div className="grid grid-cols-1 gap-4" data-unique-id="d3f8a69f-986a-45fa-9e24-d7813fa79281" data-file-name="components/booking-form.tsx">
              <div data-unique-id="d9985816-a695-41be-9fdd-a08cdf3be6e3" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="2959ac79-5f03-4623-8bc1-521c88e5448e" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="b8c5518d-ffa7-4836-8922-35584210630b" data-file-name="components/booking-form.tsx">Portfolio Manager *</span></label>
                <input type="text" required value={formData.portfolioManager} onChange={e => setFormData({
                ...formData,
                portfolioManager: e.target.value
              })} className="w-full p-2 sm:p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" data-unique-id="5486c118-ea17-4be4-ae0d-dea1ba6a1332" data-file-name="components/booking-form.tsx" />
              </div>
            </div>
          </motion.section>

          {/* Owner Details Section */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.2
        }} className="space-y-4" data-unique-id="a72a16d2-cd7a-4651-b111-917930d1339c" data-file-name="components/booking-form.tsx">
            <h3 className="text-xl font-semibold" data-unique-id="1de87352-afe4-490f-9a21-3d3e6bcb4845" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="f0cdb1dc-ec2b-43b7-b719-8d5793409d07" data-file-name="components/booking-form.tsx">Owner Details</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" data-unique-id="6c7ec640-d565-4e1a-91db-19711ba058a3" data-file-name="components/booking-form.tsx">
              <div data-unique-id="1b0d1529-daa8-43a0-9454-72e78e7d1489" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="6878ddbd-445b-42bd-aa58-c25a5ad1ae8d" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="cb0f5348-4fd3-4f14-87b1-dc160273cba2" data-file-name="components/booking-form.tsx">Owner Name *</span></label>
                <input type="text" required value={formData.ownerName} onChange={e => setFormData({
                ...formData,
                ownerName: e.target.value
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="8177e3ea-4119-4f7a-8d50-5285f54f7e63" data-file-name="components/booking-form.tsx" />
              </div>
              <div data-unique-id="24f103a0-2621-45e3-9376-e17dbcfda367" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="e6fcfa17-8f18-4e68-a618-5b3b0934e02b" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="9db80fb1-b972-4a65-a035-89723328360b" data-file-name="components/booking-form.tsx">Contact Number *</span></label>
                <input type="tel" required value={formData.ownerPhone} onChange={e => setFormData({
                ...formData,
                ownerPhone: e.target.value
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="cc77d781-f23c-4fed-a1de-a2fb0f38e7a1" data-file-name="components/booking-form.tsx" />
              </div>
              <div data-unique-id="1eca11d0-71d8-46b9-bf0a-974a33e3bebe" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="9a160bb5-7a41-4adf-8829-1f60be9ff60d" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="4fe6728b-a211-4768-b315-3e06bebd1fc9" data-file-name="components/booking-form.tsx">Owner Email *</span></label>
                <input type="email" required value={formData.ownerEmail} onChange={e => setFormData({
                ...formData,
                ownerEmail: e.target.value
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="d4046774-331a-4c6e-8628-40a548efaab8" data-file-name="components/booking-form.tsx" />
              </div>
              <div data-unique-id="0db87682-1f2f-4ffa-920e-c26f6a033400" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="7a521a25-275f-4b85-9686-eb6f8a48dd94" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="1e4a4cc5-1606-4508-a829-90db33c4af4e" data-file-name="components/booking-form.tsx">RentOk ID *</span></label>
                <input type="text" required value={formData.rentokId} onChange={e => setFormData({
                ...formData,
                rentokId: e.target.value
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="abd881ef-b3ef-468a-bc81-4b018b266a44" data-file-name="components/booking-form.tsx" />
              </div>
            </div>
          </motion.section>

          {/* Subscription Details */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.3
        }} className="space-y-4" data-unique-id="79318e64-7114-4071-9a97-ef03586ddfea" data-file-name="components/booking-form.tsx">
            <h3 className="text-xl font-semibold" data-unique-id="1f35354a-1d92-497e-861c-42c203e776ce" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="09b078f6-b7e3-44c7-a362-53b65eaa329b" data-file-name="components/booking-form.tsx">Subscription Details</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-unique-id="07ff6ae1-45de-4143-b910-71279eadb741" data-file-name="components/booking-form.tsx">
              <div data-unique-id="b9c4d2aa-a8eb-4ba7-998b-ddcaec9351b6" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="b070639c-c30d-4bae-8bdd-f67203495e74" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="3b8b4fe9-f893-40c1-a9ca-b1e9bab07d06" data-file-name="components/booking-form.tsx">No. of Properties *</span></label>
                <input type="number" min="1" required value={formData.noOfProperties} onChange={e => setFormData({
                ...formData,
                noOfProperties: parseInt(e.target.value)
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="693a7bbd-7939-4c0e-9bc8-4d4614ec6c5a" data-file-name="components/booking-form.tsx" />
              </div>
              <div data-unique-id="cafdd35d-2215-4db3-8788-fcd69be84f8b" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="24489490-b59d-440c-ac37-d81ee221a4d8" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="52b3231b-f697-4a98-a437-bda4b179064b" data-file-name="components/booking-form.tsx">No. of Beds *</span></label>
                <input type="number" min="1" required value={formData.noOfBeds} onChange={e => setFormData({
                ...formData,
                noOfBeds: parseInt(e.target.value)
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="b92ae84d-f6fe-483d-b6e3-b9bde3dbb2ef" data-file-name="components/booking-form.tsx" />
              </div>
              <div data-unique-id="a236ae06-2291-4764-9ee4-61d10eddf958" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="01233b47-e513-4234-bb9d-c46af14ef279" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="d483cf57-52e0-4214-99fe-2a56f2ce1b27" data-file-name="components/booking-form.tsx">Subscription Type *</span></label>
                <select required value={formData.subscriptionType} onChange={e => setFormData({
                ...formData,
                subscriptionType: e.target.value as any
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="b442022a-6485-4c4f-a1f2-956addb0a520" data-file-name="components/booking-form.tsx" data-dynamic-text="true">
                  {SUBSCRIPTION_TYPES.map(type => <option key={type.value} value={type.value} data-unique-id="b8edc3fe-36b8-4ce2-9ae5-f2757177029c" data-file-name="components/booking-form.tsx" data-dynamic-text="true">{type.label}</option>)}
                </select>
              </div>
              <div data-unique-id="decaabfa-9c40-42ef-a71f-b974917b4264" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="be45a656-8149-4137-892b-89495b23636d" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="034acc7d-5c39-466c-a736-732cd359f6ec" data-file-name="components/booking-form.tsx">Sold at price / bed / month *</span></label>
                <input type="number" min="0" step="0.01" required value={formData.soldPricePerBed} onChange={e => setFormData({
                ...formData,
                soldPricePerBed: parseFloat(e.target.value)
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="da1408a5-b4a2-4d0e-a1fb-4a577aabf358" data-file-name="components/booking-form.tsx" />
              </div>
              <div data-unique-id="28de89f8-afea-4bfd-9194-1c33d1cc2c80" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="c2c7a954-07e9-4740-9740-842bf242d187" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="e0643904-2aea-4b40-b9cf-9a79503917c9" data-file-name="components/booking-form.tsx">Subscription Start Date *</span></label>
                <input type="date" required value={formData.subscriptionStartDate} onChange={e => setFormData({
                ...formData,
                subscriptionStartDate: e.target.value
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="74fd69da-eaad-4245-8518-aacb6f882f02" data-file-name="components/booking-form.tsx" />
              </div>
              <div data-unique-id="b842897b-b45e-4f40-874e-fef2cd417e05" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="9a7acb16-3014-4681-819d-a9a3b8de9a43" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="3b0e433f-5390-42a0-8315-8656c1909731" data-file-name="components/booking-form.tsx">Number of Months Billed For *</span></label>
                <input type="number" min="1" required value={formData.monthsBilled} onChange={e => setFormData({
                ...formData,
                monthsBilled: parseInt(e.target.value)
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="ae215fea-1e02-4b01-95d5-976ff6898a8d" data-file-name="components/booking-form.tsx" />
              </div>
              <div className="md:col-span-3" data-unique-id="7c0a0e81-8b54-411f-b25c-69770b16c825" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="8f1104de-0e39-42a4-bc3b-460a560b5333" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="552931ad-04d2-40b7-b0ae-a9b5353cd367" data-file-name="components/booking-form.tsx">Number of Free Months</span></label>
                <input type="number" min="0" value={formData.freeMonths} onChange={e => setFormData({
                ...formData,
                freeMonths: parseInt(e.target.value)
              })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="e29165f4-d966-4562-94b6-7986e4bbf48a" data-file-name="components/booking-form.tsx" />
              </div>
            </div>
          </motion.section>

          {/* Add-Ons Section */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.4
        }} className="space-y-4" data-unique-id="3e108fd9-7f26-47e4-83f1-656a11232a8b" data-file-name="components/booking-form.tsx" data-dynamic-text="true">
            <div className="flex items-center justify-between" data-unique-id="f5c831e2-8410-4987-89d6-268412f00453" data-file-name="components/booking-form.tsx">
              <h3 className="text-xl font-semibold" data-unique-id="cb3c4f42-1a55-4057-8612-de99dc209060" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="4fbe92d2-30c2-4cd2-8172-107eba6f750a" data-file-name="components/booking-form.tsx">Add-Ons (Optional)</span></h3>
              <motion.button type="button" whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={addAddon} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors" data-unique-id="bcce094e-4e15-4edf-897c-73932218fcae" data-file-name="components/booking-form.tsx">
                <Plus className="w-4 h-4" /><span className="editable-text" data-unique-id="6b88bc64-3502-4d3b-a1df-0ce59d6a44f8" data-file-name="components/booking-form.tsx">
                Add Add-on
              </span></motion.button>
            </div>
            
            {selectedAddons.map((addon, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass rounded-lg" data-unique-id="f09a7db1-26b2-40b4-b4e4-6e3007b41b18" data-file-name="components/booking-form.tsx">
                <select value={addon.type} onChange={e => updateAddon(index, 'type', e.target.value)} className="p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="56864960-f661-4e03-9f27-4baecaeefa87" data-file-name="components/booking-form.tsx" data-dynamic-text="true">
                  <option value="" data-unique-id="4d749101-696b-4c43-bc20-a5d09e849255" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="3ca24e1d-351a-4c20-976b-30fc127e4171" data-file-name="components/booking-form.tsx">Select Add-on</span></option>
                  {ADDON_OPTIONS.map(option => <option key={option.value} value={option.value} data-unique-id="db37bab7-a051-4940-a27d-f6ed811b6c31" data-file-name="components/booking-form.tsx" data-dynamic-text="true">{option.label}</option>)}
                </select>
                <input type="number" placeholder="Price" min="0" step="0.01" value={addon.price} onChange={e => updateAddon(index, 'price', parseFloat(e.target.value))} className="p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="23d7b172-c124-4655-8659-5199c4ee0b96" data-file-name="components/booking-form.tsx" />
                <input type="text" placeholder="Notes (optional)" value={addon.notes} onChange={e => updateAddon(index, 'notes', e.target.value)} className="p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="cab4c432-d773-4317-b872-b32240275c15" data-file-name="components/booking-form.tsx" />
                <motion.button type="button" whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={() => removeAddon(index)} className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-unique-id="0544e3e3-e167-4238-9155-03d3d630f635" data-file-name="components/booking-form.tsx">
                  <Trash2 className="w-4 h-4" data-unique-id="04cd322a-8e81-42f2-a73e-110314d2f4c9" data-file-name="components/booking-form.tsx" data-dynamic-text="true" />
                </motion.button>
              </motion.div>)}
          </motion.section>

          {/* Location & Mode */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.5
        }} className="space-y-4" data-unique-id="7c8ab4ca-ae6a-4fd4-a730-a4d7fb9a8710" data-file-name="components/booking-form.tsx">
            <h3 className="text-xl font-semibold flex items-center gap-2" data-unique-id="4723cc08-8220-476d-b00d-ffd3202c6159" data-file-name="components/booking-form.tsx">
              <MapPin className="w-5 h-5" /><span className="editable-text" data-unique-id="6ae09965-6713-48b1-8a43-b57ca351f56d" data-file-name="components/booking-form.tsx">
              Location & Mode
            </span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6" data-unique-id="63ca5589-0e70-49fa-91d8-0318ecfef581" data-file-name="components/booking-form.tsx">
              <div data-unique-id="b242ae24-b7aa-4a57-8c84-a8831566f17a" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-3" data-unique-id="99b75f7a-f77e-4ea5-aa06-2cb8df9a1b15" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="f2b5e271-976e-4b9b-94f9-91530a8891d9" data-file-name="components/booking-form.tsx">Location *</span></label>
                <div className="space-y-2" data-unique-id="a04fa43a-6037-47a7-ac2f-d0723ae76fd5" data-file-name="components/booking-form.tsx" data-dynamic-text="true">
                  {LOCATION_OPTIONS.map(location => <label key={location.value} className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer hover:bg-white/30 transition-colors" data-unique-id="7874c851-f4d5-4dac-b73f-cfa848a7ce01" data-file-name="components/booking-form.tsx">
                      <input type="radio" name="location" value={location.value} checked={formData.bookingLocation === location.value} onChange={e => setFormData({
                    ...formData,
                    bookingLocation: e.target.value as any
                  })} className="w-4 h-4 text-blue-600" data-unique-id="a8101276-b83c-4254-ad6d-58ab498aa764" data-file-name="components/booking-form.tsx" />
                      <span data-unique-id="778f85f0-c50e-44f4-a580-9f3d9786fea7" data-file-name="components/booking-form.tsx" data-dynamic-text="true">{location.label}</span>
                    </label>)}
                </div>
              </div>
              <div data-unique-id="e007c9c5-e14d-4617-9046-c1cb81c20b72" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-3" data-unique-id="c56bec7f-251a-4da8-b53e-dd2b46df18be" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="9fe26ac8-dd39-4e96-81b8-425f8bbf5886" data-file-name="components/booking-form.tsx">Mode *</span></label>
                <div className="space-y-2" data-unique-id="10dfb50f-3231-404f-84eb-98c9be17103b" data-file-name="components/booking-form.tsx">
                  <label className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer hover:bg-white/30 transition-colors" data-unique-id="dac63f90-8b25-4c6e-b5c9-c3683d1de1f1" data-file-name="components/booking-form.tsx">
                    <input type="radio" name="mode" value="physical" checked={formData.mode === 'physical'} onChange={e => setFormData({
                    ...formData,
                    mode: e.target.value as any
                  })} className="w-4 h-4 text-blue-600" data-unique-id="eb6dd375-bed7-47b7-8d97-2c2f18d0915f" data-file-name="components/booking-form.tsx" />
                    <span data-unique-id="10aaeb7a-eb91-4a7e-be30-c47240144bf7" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="162058ab-d2d9-47ff-bc87-ff03a0148874" data-file-name="components/booking-form.tsx">Physical (Offline)</span></span>
                  </label>
                  <label className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer hover:bg-white/30 transition-colors" data-unique-id="45f99a74-9b1b-4757-90f6-cc7aec1f02ab" data-file-name="components/booking-form.tsx">
                    <input type="radio" name="mode" value="virtual" checked={formData.mode === 'virtual'} onChange={e => setFormData({
                    ...formData,
                    mode: e.target.value as any
                  })} className="w-4 h-4 text-blue-600" data-unique-id="dce851b9-8237-4c70-94ce-1642cbb55c45" data-file-name="components/booking-form.tsx" />
                    <span data-unique-id="e4cc4267-35ca-45da-9d4c-ab879c58abcc" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="eebda948-bbbd-4191-96ff-8a3cf1b1ba73" data-file-name="components/booking-form.tsx">Virtual (Online)</span></span>
                  </label>
                </div>
              </div>
            </div>
          </motion.section>

          {/* CIS Assignment & Slot Selection */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.6
        }} className="space-y-4" data-unique-id="dcc580d7-cbf5-408b-977d-bfa3840f90d2" data-file-name="components/booking-form.tsx">
            <h3 className="text-xl font-semibold flex items-center gap-2" data-unique-id="0db7b537-2560-40f9-9a37-4f7f0f9027ea" data-file-name="components/booking-form.tsx">
              <Clock className="w-5 h-5" /><span className="editable-text" data-unique-id="95f44ecb-443b-48d6-a20e-c02ed69ce398" data-file-name="components/booking-form.tsx">
              Scheduling
            </span></h3>
            
            {/* Onboarding Person (CIS) selection */}
            <div className="glass p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Select Onboarding Person</p>

              {formData.mode === 'virtual' ? (
                // virtual = only Megha
                <label className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer hover:bg-white/30 transition-colors">
                  <input
                    type="radio"
                    name="cis"
                    value="megha"
                    checked={formData.cisId === 'megha'}
                    onChange={(e) => setFormData({ ...formData, cisId: e.target.value as any })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Megha (megha@eazyapp.tech)</span>
                </label>
              ) : (
                // physical = Aditya or Manish
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer hover:bg-white/30 transition-colors">
                    <input
                      type="radio"
                      name="cis"
                      value="aditya"
                      checked={formData.cisId === 'aditya'}
                      onChange={(e) => setFormData({ ...formData, cisId: e.target.value as any })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>Aditya (aditya@rentok.com)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 glass rounded-lg cursor-pointer hover:bg-white/30 transition-colors">
                    <input
                      type="radio"
                      name="cis"
                      value="manish"
                      checked={formData.cisId === 'manish'}
                      onChange={(e) => setFormData({ ...formData, cisId: e.target.value as any })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>Manish Arora (manish.arora@eazyapp.tech)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" data-unique-id="0d187fde-6c22-49e7-999a-6d267159efa9" data-file-name="components/booking-form.tsx">
              <div data-unique-id="8e4e22af-8b5f-43f7-b4cc-e9a077db969f" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2" data-unique-id="e4fa0d56-f262-4be0-b995-050d8c04419f" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="2d285b88-13aa-4c7a-8a67-79bb2be4918c" data-file-name="components/booking-form.tsx">Date *</span></label>
                <input type="date" required min={format(addDays(new Date(), 1), 'yyyy-MM-dd')} value={formData.date} onChange={e => {
                  setFormData({
                    ...formData,
                    date: e.target.value,
                    slotWindow: '' // Clear selected slot when date changes
                  });
                }} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div data-unique-id="ea626b52-a745-4ff6-95ed-ce9f85acba4e" data-file-name="components/booking-form.tsx">
                <label className="block text-sm font-medium mb-2">Time Slot *</label>

                <select
                  required
                  value={formData.slotWindow}
                  onChange={e => setFormData({ ...formData, slotWindow: e.target.value })}
                  className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{loadingSlots ? 'Loading availability…' : 'Select time slot'}</option>

                  {slotOptions.map(slot => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>

                {slotsError && (
                  <p className="text-sm text-red-600 mt-2">{slotsError}</p>
                )}

                {!loadingSlots && !slotsError && slotOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No slots available for this date. Try another date or change mode/user.
                  </p>
                )}
              </div>
            </div>
          </motion.section>

          {/* Subscription Summary */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.7
        }} className="glass p-6 rounded-lg" data-unique-id="58705aed-c4ea-4c91-ab76-aca131cc5663" data-file-name="components/booking-form.tsx">
            <h3 className="text-xl font-semibold mb-4" data-unique-id="7fc2abf7-122e-4e3c-a599-35039186418a" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="d08f59b7-e70e-4b9e-a7f0-1a712b3e3d17" data-file-name="components/booking-form.tsx">Subscription Summary</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center" data-unique-id="96199d1b-ff15-4cc7-909c-dbbd99d4176a" data-file-name="components/booking-form.tsx">
              <div data-unique-id="1ac18777-7a35-466f-9d54-cfffb44cf7db" data-file-name="components/booking-form.tsx">
                <p className="text-sm text-muted-foreground" data-unique-id="185242f9-6111-4be1-9e03-bc4ba11aed9a" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="75870c46-c627-4698-b2b3-01829eeb4a0b" data-file-name="components/booking-form.tsx">Beds</span></p>
                <p className="text-2xl font-bold" data-unique-id="d1523b4a-2e64-4446-9de5-621cfc7938d7" data-file-name="components/booking-form.tsx" data-dynamic-text="true">{formData.noOfBeds}</p>
              </div>
              <div data-unique-id="e35aebfb-a346-4607-b14f-b278512a4f75" data-file-name="components/booking-form.tsx">
                <p className="text-sm text-muted-foreground" data-unique-id="a39656d2-871e-43a1-b699-2de5ff308c9a" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="2ee65793-b7af-4c8d-b873-067ddedfa73c" data-file-name="components/booking-form.tsx">Price per Bed</span></p>
                <p className="text-2xl font-bold" data-unique-id="4c4a57d7-d8b9-4295-9222-e137428788d4" data-file-name="components/booking-form.tsx" data-dynamic-text="true"><span className="editable-text" data-unique-id="8a9b0033-0e9e-433b-be2d-744acf02e202" data-file-name="components/booking-form.tsx">₹</span>{formData.soldPricePerBed}</p>
              </div>
              <div data-unique-id="89899840-ad23-4279-b050-bfd0ff79474c" data-file-name="components/booking-form.tsx">
                <p className="text-sm text-muted-foreground" data-unique-id="6b439034-dd2f-4524-8fd0-a9aa20a9c4d4" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="cc6a53e0-5738-47cc-b04e-4401ce87ee67" data-file-name="components/booking-form.tsx">Months</span></p>
                <p className="text-2xl font-bold" data-unique-id="8ccc9caf-6e5b-41da-82af-9bfdc631f18c" data-file-name="components/booking-form.tsx" data-dynamic-text="true">{formData.monthsBilled}</p>
              </div>
              <div data-unique-id="2e0f3eee-2888-4371-bb9e-00705433f042" data-file-name="components/booking-form.tsx">
                <p className="text-sm text-muted-foreground" data-unique-id="75152fd4-7828-40f0-9b91-f5792c7ea585" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="29cadb1a-1d0c-42f4-b9c3-859af581801e" data-file-name="components/booking-form.tsx">Total Amount</span></p>
                <p className="text-3xl font-bold text-green-600" data-unique-id="e6650252-b4bb-41ba-bd5c-7a4e192c4f22" data-file-name="components/booking-form.tsx" data-dynamic-text="true"><span className="editable-text" data-unique-id="0b456757-cb6e-4fca-9fdc-9849fbe35115" data-file-name="components/booking-form.tsx">₹</span>{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </motion.section>

          {/* Confirmation */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.8
        }} className="space-y-4" data-unique-id="a53e56b8-d6b1-4192-9f28-a3ed9da9fee7" data-file-name="components/booking-form.tsx">
            <label className="flex items-start gap-3 p-4 glass rounded-lg cursor-pointer" data-unique-id="5a3b0f41-ed83-49a7-ad74-4a1eca70a4da" data-file-name="components/booking-form.tsx">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="w-5 h-5 text-blue-600 mt-1" data-unique-id="36ceb57a-87eb-4ca7-a923-6791d34a6a61" data-file-name="components/booking-form.tsx" />
              <span className="text-sm" data-unique-id="58d758d1-9ef0-4dc7-95a6-d34e91d513e7" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="fdebdd31-bb35-4810-97a1-cbeec1b4e22c" data-file-name="components/booking-form.tsx">
                I confirm the owner has received the templates of tenant and inventory data (hard copy/soft copy) along the list of details required for onboarding.
              </span></span>
            </label>
          </motion.section>

          {/* Submit Button */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.9
        }} className="flex justify-center sm:justify-end" data-unique-id="33d302ad-5799-4dfc-8b49-1005b36db266" data-file-name="components/booking-form.tsx">
            <motion.button type="submit" disabled={!confirmed} whileHover={{
            scale: confirmed ? 1.02 : 1
          }} whileTap={{
            scale: confirmed ? 0.98 : 1
          }} className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all ${confirmed ? 'gradient-primary text-white shadow-lg hover:shadow-xl' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} data-unique-id="afb47472-3655-4390-8b37-6c32b9214073" data-file-name="components/booking-form.tsx"><span className="editable-text" data-unique-id="429437a7-1c5f-46e3-bea5-5ea64203104c" data-file-name="components/booking-form.tsx">
              Confirm Booking
            </span></motion.button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}