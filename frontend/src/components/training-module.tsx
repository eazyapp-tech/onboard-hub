import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { API_BASE_URL } from '@/lib/config';

const TRAINING_TEAM = [
  { id: 'manish-arora', name: 'Manish Arora', email: 'manish.arora@eazyapp.tech' },
  { id: 'harsh-tulsyan', name: 'Harsh Tulsyan', email: 'harsh@eazyapp.tech' },
  { id: 'vikash-jarwal', name: 'Vikash Jarwal', email: 'vikash.b@eazyapp.tech' },
  { id: 'jyoti-kalra', name: 'Jyoti Kalra', email: 'jyoti.k@eazyapp.tech' },
  { id: 'megha-verma', name: 'Megha Verma', email: 'meghav@eazyapp.tech' },
  { id: 'aditya-shrivastav', name: 'Aditya Shrivastav', email: 'aditya@eazyapp.tech' },
];

const TRAINING_STATUS = ['scheduled', 'ongoing', 'completed', 'cancelled'] as const;

export function TrainingModule() {
  const {
    bookings,
    trainings,
    currentUser,
    addTraining,
    updateTrainingLocal,
    loadTrainingsFromBackend,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    bookingId: '',
    trainingType: 'staff',
    trainingDate: '',
    trainingTime: '',
    trainerId: TRAINING_TEAM[0]?.id || '',
    notes: '',
  });

  useEffect(() => {
    loadTrainingsFromBackend();
  }, [loadTrainingsFromBackend]);

  const bookingsOptions = useMemo(() => {
    return bookings
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings]);

  const selectedBooking = bookings.find((b) => b.id === form.bookingId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bookingId) {
      toast.error('Select a booking for this training.');
      return;
    }
    if (!form.trainingDate || !form.trainingTime) {
      toast.error('Provide training date and time.');
      return;
    }

    const trainer = TRAINING_TEAM.find((t) => t.id === form.trainerId);
    if (!trainer) {
      toast.error('Select a trainer.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        bookingId: form.bookingId,
        bookingRef: selectedBooking?.bookingRef,
        ownerName: selectedBooking?.ownerName,
        ownerPhone: selectedBooking?.ownerPhone,
        trainingType: form.trainingType as 'staff' | 'redemo',
        trainingDate: form.trainingDate,
        trainingTime: form.trainingTime,
        trainerId: trainer.id,
        trainerName: trainer.name,
        trainerEmail: trainer.email,
        notes: form.notes || undefined,
        createdBy: currentUser?.name || currentUser?.email || 'System',
      };

      const response = await fetch(`${API_BASE_URL}/api/trainings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to create training');
      }

      addTraining(data.data);
      toast.success('Training scheduled successfully!');

      setForm({
        bookingId: '',
        trainingType: 'staff',
        trainingDate: '',
        trainingTime: '',
        trainerId: TRAINING_TEAM[0]?.id || '',
        notes: '',
      });
      setActiveTab('history');
    } catch (error) {
      console.error('Training create error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule training');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (trainingId: string, nextStatus: string) => {
    try {
      updateTrainingLocal(trainingId, { status: nextStatus as any });
      const response = await fetch(`${API_BASE_URL}/api/trainings/${trainingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Failed updating status', error);
      toast.error('Unable to update status');
      await loadTrainingsFromBackend();
    }
  };

  const handleEdit = async (trainingId: string, updates: Record<string, string>) => {
    try {
      updateTrainingLocal(trainingId, updates as any);
      const response = await fetch(`${API_BASE_URL}/api/trainings/${trainingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update training');
      }
      toast.success('Training updated');
      setEditingId(null);
    } catch (error) {
      console.error('Training edit error:', error);
      toast.error('Unable to update training');
      await loadTrainingsFromBackend();
    }
  };

  if (!currentUser) {
    return (
      <div className="glass rounded-xl p-6 text-center text-muted-foreground">
        Select your Sales role to schedule trainings.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex border-b border-glass-border rounded-t-xl overflow-hidden">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Schedule Training
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Training History
        </button>
      </div>

      {activeTab === 'schedule' && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 space-y-6"
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Select booking *</span>
              <select
                value={form.bookingId}
                onChange={(e) => setForm((prev) => ({ ...prev, bookingId: e.target.value }))}
                className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose booking</option>
                {bookingsOptions.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.bookingRef} — {booking.ownerName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Training type *</span>
              <select
                value={form.trainingType}
                onChange={(e) => setForm((prev) => ({ ...prev, trainingType: e.target.value }))}
                className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
              >
                <option value="staff">Staff Training</option>
                <option value="redemo">Re-demo</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Training date *</span>
              <input
                type="date"
                value={form.trainingDate}
                onChange={(e) => setForm((prev) => ({ ...prev, trainingDate: e.target.value }))}
                className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Training time *</span>
              <input
                type="time"
                value={form.trainingTime}
                onChange={(e) => setForm((prev) => ({ ...prev, trainingTime: e.target.value }))}
                className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Trainer *</span>
              <select
                value={form.trainerId}
                onChange={(e) => setForm((prev) => ({ ...prev, trainerId: e.target.value }))}
                className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                required
              >
                {TRAINING_TEAM.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Preparation, attendees, etc."
            />
          </label>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg disabled:opacity-60"
          >
            {submitting ? 'Scheduling…' : 'Schedule training'}
          </motion.button>
        </motion.form>
      )}

      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {trainings.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-muted-foreground">
              No trainings recorded yet.
            </div>
          ) : (
            trainings.map((training) => (
              <div key={training._id} className="glass rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {training.trainingType === 'staff' ? 'Staff Training' : 'Re-demo'} —{' '}
                      {training.bookingRef || training.bookingId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {training.ownerName} • {format(new Date(training.trainingDate), 'MMM d, yyyy')} at{' '}
                      {training.trainingTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={training.status}
                      onChange={(e) => handleStatusChange(training._id, e.target.value)}
                      className="rounded-lg border border-glass-border bg-white/60 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {TRAINING_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status[0].toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => setEditingId(training._id)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Trainer: {training.trainerName} ({training.trainerEmail})
                </div>
                {training.notes && <div className="text-sm">{training.notes}</div>}

                {editingId === training._id && (
                  <div className="border-t border-glass-border pt-4 mt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex flex-col gap-1 text-sm">
                        Date
                        <input
                          type="date"
                          defaultValue={training.trainingDate}
                          onChange={(e) => (training.trainingDate = e.target.value)}
                          className="rounded border border-glass-border px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        Time
                        <input
                          type="time"
                          defaultValue={training.trainingTime}
                          onChange={(e) => (training.trainingTime = e.target.value)}
                          className="rounded border border-glass-border px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        Trainer
                        <select
                          defaultValue={training.trainerId}
                          onChange={(e) => {
                            const trainer = TRAINING_TEAM.find((t) => t.id === e.target.value);
                            if (trainer) {
                              training.trainerId = trainer.id;
                              training.trainerName = trainer.name;
                              training.trainerEmail = trainer.email;
                            }
                          }}
                          className="rounded border border-glass-border px-3 py-2"
                        >
                          {TRAINING_TEAM.map((trainer) => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-sm">
                      Notes
                      <textarea
                        defaultValue={training.notes}
                        onChange={(e) => (training.notes = e.target.value)}
                        className="rounded border border-glass-border px-3 py-2"
                      />
                    </label>
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-100 text-sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
                        onClick={() =>
                          handleEdit(training._id, {
                            trainingDate: training.trainingDate,
                            trainingTime: training.trainingTime,
                            trainerId: training.trainerId,
                            trainerName: training.trainerName,
                            trainerEmail: training.trainerEmail,
                            notes: training.notes || '',
                          })
                        }
                      >
                        Save changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}

