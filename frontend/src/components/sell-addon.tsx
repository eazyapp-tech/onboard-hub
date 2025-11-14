// onboard-hub/frontend/src/components/sell-addon-form.tsx
'use client';

import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ADDON_OPTIONS } from '@/types';
import { API_BASE_URL } from '@/lib/config';

type AddonRow = {
  type: (typeof ADDON_OPTIONS)[number]['value'] | '';
  price: number;
  quantity: number;
  notes: string;
};

type SellAddonFormState = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  source: 'pre-sold' | 'at-onboarding';
  addons: AddonRow[];
  note: string;
};

const makeEmptyAddon = (): AddonRow => ({
  type: '',
  price: 0,
  quantity: 1,
  notes: '',
});

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `addon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function SellAddonForm() {
  const { bookings, addBookingAddon, currentUser } = useAppStore();
  const [formState, setFormState] = useState<SellAddonFormState>({
    bookingId: '',
    customerName: '',
    customerPhone: '',
    source: 'pre-sold',
    addons: [makeEmptyAddon()],
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [bookings]
  );

  const selectedBooking = useMemo(
    () => bookings.find(booking => booking.id === formState.bookingId),
    [bookings, formState.bookingId]
  );

  const totalAmount = useMemo(
    () =>
      formState.addons.reduce(
        (sum, addon) => sum + (addon.price || 0) * (addon.quantity || 0),
        0
      ),
    [formState.addons]
  );

  const handleBookingChange = (value: string) => {
    const booking = bookings.find(b => b.id === value);
    setFormState(prev => ({
      ...prev,
      bookingId: value,
      customerName: booking?.ownerName ?? prev.customerName,
      customerPhone: booking?.ownerPhone ?? prev.customerPhone,
    }));
  };

  const handleAddonChange = (
    index: number,
    field: keyof AddonRow,
    rawValue: string
  ) => {
    setFormState(prev => {
      const next = [...prev.addons];
      const row = { ...next[index] };

      if (field === 'price') {
        const parsed = parseFloat(rawValue);
        row.price = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      } else if (field === 'quantity') {
        const parsed = parseInt(rawValue, 10);
        row.quantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      } else if (field === 'type') {
        row.type = rawValue as AddonRow['type'];
      } else if (field === 'notes') {
        row.notes = rawValue;
      }

      next[index] = row;
      return { ...prev, addons: next };
    });
  };

  const handleAddAddon = () => {
    setFormState(prev => ({
      ...prev,
      addons: [...prev.addons, makeEmptyAddon()],
    }));
  };

  const handleRemoveAddon = (index: number) => {
    setFormState(prev => ({
      ...prev,
      addons:
        prev.addons.length === 1
          ? prev.addons
          : prev.addons.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.bookingId) {
      toast.error('Select a booking before recording an add-on.');
      return;
    }

    const invalidRow = formState.addons.find(
      addon => !addon.type || addon.price <= 0 || addon.quantity <= 0
    );

    if (invalidRow) {
      toast.error(
        'Each add-on needs a type, unit price, and a quantity greater than zero.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        bookingId: formState.bookingId,
        bookingRef: selectedBooking?.bookingRef,
        customerName:
          formState.customerName || selectedBooking?.ownerName || '',
        customerPhone:
          formState.customerPhone || selectedBooking?.ownerPhone || '',
        source: formState.source,
        addons: formState.addons.map(addon => ({
          type: addon.type,
          price: addon.price,
          quantity: addon.quantity,
          notes: addon.notes || undefined,
        })),
        totalAmount,
        note: formState.note || undefined,
        createdBy: currentUser?.email || currentUser?.name || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/sell-addon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error || 'Failed to record add-on');
      }

      formState.addons.forEach(addon => {
        addBookingAddon({
          id: generateId(),
          bookingId: formState.bookingId,
          addonType: addon.type,
          price: addon.price * addon.quantity,
          source: formState.source,
          notes:
            [addon.notes, formState.note].filter(Boolean).join(' | ') ||
            undefined,
        });
      });

      toast.success('Add-on recorded successfully!');

      setFormState({
        bookingId: formState.bookingId,
        customerName: selectedBooking?.ownerName ?? '',
        customerPhone: selectedBooking?.ownerPhone ?? '',
        source: 'pre-sold',
        addons: [makeEmptyAddon()],
        note: '',
      });
    } catch (error) {
      console.error('Failed to record add-on', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not record add-on. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 sm:p-6 lg:p-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">
          Sell Add-on
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold">Booking Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Attach to booking *
                </span>
                <select
                  value={formState.bookingId}
                  onChange={event => handleBookingChange(event.target.value)}
                  required
                  className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select booking</option>
                  {sortedBookings.map(booking => (
                    <option key={booking.id} value={booking.id}>
                      {booking.bookingRef} — {booking.ownerName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Source
                </span>
                <select
                  value={formState.source}
                  onChange={event =>
                    setFormState(prev => ({
                      ...prev,
                      source: event.target
                        .value as SellAddonFormState['source'],
                    }))
                  }
                  className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pre-sold">Pre-sold (before onboarding)</option>
                  <option value="at-onboarding">Sold during onboarding</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Customer name
                </span>
                <input
                  type="text"
                  value={formState.customerName}
                  onChange={event =>
                    setFormState(prev => ({
                      ...prev,
                      customerName: event.target.value,
                    }))
                  }
                  placeholder="Owner name"
                  className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Customer phone
                </span>
                <input
                  type="tel"
                  value={formState.customerPhone}
                  onChange={event =>
                    setFormState(prev => ({
                      ...prev,
                      customerPhone: event.target.value,
                    }))
                  }
                  placeholder="+91 98765 43210"
                  className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Add-ons</h3>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddAddon}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Add-on
              </motion.button>
            </div>

            <div className="space-y-4">
              {formState.addons.map((addon, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Add-on type *
                      </span>
                      <select
                        value={addon.type}
                        onChange={event =>
                          handleAddonChange(index, 'type', event.target.value)
                        }
                        required
                        className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select add-on</option>
                        {ADDON_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Unit price (₹) *
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={addon.price || ''}
                        onChange={event =>
                          handleAddonChange(index, 'price', event.target.value)
                        }
                        required
                        className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Quantity *
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={addon.quantity || ''}
                        onChange={event =>
                          handleAddonChange(index, 'quantity', event.target.value)
                        }
                        required
                        className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        Notes
                      </span>
                      <input
                        type="text"
                        value={addon.notes}
                        onChange={event =>
                          handleAddonChange(index, 'notes', event.target.value)
                        }
                        placeholder="Optional notes"
                        className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {formState.addons.length > 1 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(index)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Additional notes
              </span>
              <textarea
                value={formState.note}
                onChange={event =>
                  setFormState(prev => ({
                    ...prev,
                    note: event.target.value,
                  }))
                }
                className="min-h-[120px] rounded-lg border border-glass-border bg-white/60 px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Anything else the onboarding team should know"
              />
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white/60 rounded-xl px-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total value (₹)
                </p>
                <p className="text-2xl font-semibold">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </p>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving…' : 'Record Add-on'}
              </motion.button>
            </div>
          </motion.section>
        </form>
      </motion.div>
    </div>
  );
}