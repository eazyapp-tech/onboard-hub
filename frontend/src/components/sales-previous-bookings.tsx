import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { User } from '@/types';
import { format } from 'date-fns';

interface Props {
  currentUser: User | null;
}

export function SalesPreviousBookings({ currentUser }: Props) {
  const bookings = useAppStore((state) => state.bookings);

  const filtered = useMemo(() => {
    if (!currentUser) return [];
    const creatorName = currentUser.name?.toLowerCase();
    const creatorEmail = currentUser.email?.toLowerCase();

    return bookings
      .filter((booking) => {
        const createdBy = (booking.createdBy || '').toLowerCase();
        return createdBy === creatorName || createdBy === creatorEmail;
      })
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [bookings, currentUser]);

  if (!currentUser) {
    return (
      <div className="glass rounded-xl p-6 text-center text-muted-foreground">
        Please sign in to view your bookings.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="glass rounded-xl p-6 text-center text-muted-foreground">
        No bookings found for {currentUser.name}. Create your first booking to see it here.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 sm:p-6 overflow-x-auto"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b border-glass-border">
            <th className="text-left py-3 pr-4 font-medium">Date</th>
            <th className="text-left py-3 pr-4 font-medium">Owner</th>
            <th className="text-left py-3 pr-4 font-medium">Location</th>
            <th className="text-left py-3 pr-4 font-medium">Mode</th>
            <th className="text-left py-3 pr-4 font-medium">Onboarding Person</th>
            <th className="text-left py-3 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((booking) => (
            <tr key={booking.id} className="border-b border-glass-border/70">
              <td className="py-3 pr-4">
                {format(new Date(booking.date), 'MMM d, yyyy')}<br />
                <span className="text-xs text-muted-foreground">
                  {booking.slotWindow}
                </span>
              </td>
              <td className="py-3 pr-4">
                <div className="font-medium">{booking.ownerName}</div>
                <div className="text-xs text-muted-foreground">{booking.ownerPhone}</div>
              </td>
              <td className="py-3 pr-4 capitalize">{booking.bookingLocation.replace('_', ' ')}</td>
              <td className="py-3 pr-4 capitalize">{booking.mode}</td>
              <td className="py-3 pr-4">{booking.cisId || 'Not assigned'}</td>
              <td className="py-3 pr-4">
                <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  {booking.onboardingStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

