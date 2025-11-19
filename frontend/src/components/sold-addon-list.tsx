import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { ADDON_OPTIONS } from '@/types';
import { format } from 'date-fns';

const addonLabelMap = new Map(ADDON_OPTIONS.map((option) => [option.value, option.label]));
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function SoldAddonList() {
  const bookingAddons = useAppStore((state) => state.bookingAddons);
  const bookings = useAppStore((state) => state.bookings);

  const rows = useMemo(() => {
    return bookingAddons
      .map((addon) => {
        const booking = bookings.find((b) => b.id === addon.bookingId);
        return {
          id: addon.id,
          bookingRef: booking?.bookingRef || addon.bookingId,
          ownerName: booking?.ownerName || 'Unknown',
          ownerPhone: booking?.ownerPhone || 'NA',
          addonType: addonLabelMap.get(addon.addonType) || addon.addonType,
          totalPrice: addon.price,
          source: addon.source === 'pre-sold' ? 'Pre-sold' : 'Sold during onboarding',
          notes: addon.notes,
          recordedAt: addon.recordedAt ? new Date(addon.recordedAt).getTime() : 0,
          recordedAtDisplay: addon.recordedAt
            ? format(new Date(addon.recordedAt), 'MMM d, yyyy • h:mm a')
            : 'Not recorded',
        };
      })
      .sort((a, b) => b.recordedAt - a.recordedAt);
  }, [bookingAddons, bookings]);

  if (rows.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 text-center text-muted-foreground"
      >
        <p className="text-base sm:text-lg">No add-ons have been recorded yet.</p>
        <p className="text-sm mt-2">Use the “Sell Add-on” tab to record your first add-on.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 sm:p-6 overflow-x-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Sold Add-ons</h2>
          <p className="text-sm text-muted-foreground">
            Showing {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </div>

      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-glass-border">
              <th className="py-3 pr-4 font-medium">Recorded At</th>
              <th className="py-3 pr-4 font-medium">Booking Ref</th>
              <th className="py-3 pr-4 font-medium">Owner</th>
              <th className="py-3 pr-4 font-medium">Add-on</th>
              <th className="py-3 pr-4 font-medium">Source</th>
              <th className="py-3 pr-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-glass-border/70 hover:bg-white/30 transition-colors">
                <td className="py-3 pr-4">{row.recordedAtDisplay}</td>
                <td className="py-3 pr-4 font-medium">{row.bookingRef}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col">
                    <span>{row.ownerName}</span>
                    <span className="text-xs text-muted-foreground">{row.ownerPhone}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">{row.addonType}</td>
                <td className="py-3 pr-4">{row.source}</td>
                <td className="py-3 pr-4 text-right font-semibold">{currency.format(row.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-glass-border p-4 bg-white/70 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{row.bookingRef}</span>
              <span className="text-sm text-muted-foreground">{row.recordedAtDisplay}</span>
            </div>
            <div className="text-sm">
              <p className="font-medium">{row.ownerName}</p>
              <p className="text-muted-foreground">{row.ownerPhone}</p>
            </div>
            <div className="text-sm flex justify-between">
              <span>{row.addonType}</span>
              <span className="font-semibold">{currency.format(row.totalPrice)}</span>
            </div>
            {row.notes && (
              <p className="text-xs text-muted-foreground bg-gray-50/70 rounded p-2">{row.notes}</p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

