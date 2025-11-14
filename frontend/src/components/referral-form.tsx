'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config';
import { CIS_USERS } from '@/types';

type ReferralFormProps = {
  context?: 'sales' | 'cis';
  teamMemberName?: string;
};

type ReferralFormState = {
  teamMemberName: string;
  referrerName: string;
  referrerPhone: string;
  rentokId: string;
  referredClients: { name: string; phone: string }[];
  notes: string;
};

type ReferralRecord = {
  _id: string;
  context: 'sales' | 'cis';
  teamMemberName: string;
  referrerName: string;
  referrerPhone: string;
  rentokId?: string;
  referredClients: { name: string; phone: string }[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function ReferralForm({ context = 'sales', teamMemberName }: ReferralFormProps) {
  const [formData, setFormData] = useState<ReferralFormState>({
      teamMemberName: teamMemberName ?? '',
      referrerName: '',
      referrerPhone: '',
      rentokId: '',
      referredClients: [{ name: '', phone: '' }],
      notes: '',
      });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [previousReferrals, setPreviousReferrals] = useState<ReferralRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [refreshHistoryFlag, setRefreshHistoryFlag] = useState(0);

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleReferrerChange =
    (field: 'referrerName' | 'referrerPhone' | 'rentokId') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: event.target.value }));
    };

  const handleReferredChange =
    (index: number, field: 'name' | 'phone') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => {
        const next = [...prev.referredClients];
        next[index] = { ...next[index], [field]: event.target.value };
        return { ...prev, referredClients: next };
      });
    };

  const handleAddReferred = () =>
    setFormData(prev => ({
      ...prev,
      referredClients: [...prev.referredClients, { name: '', phone: '' }],
    }));

  const handleRemoveReferred = (index: number) =>
    setFormData(prev => ({
      ...prev,
      referredClients: prev.referredClients.filter((_, i) => i !== index),
    }));

  useEffect(() => {
    if (teamMemberName === undefined) return;
    setFormData(prev =>
      prev.teamMemberName === teamMemberName ? prev : { ...prev, teamMemberName }
    );
  }, [teamMemberName]);

  useEffect(() => {
    const selected = formData.teamMemberName.trim();

    if (!selected) {
      setPreviousReferrals([]);
      setHistoryError(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const params = new URLSearchParams({
          teamMemberName: selected,
          limit: '25',
        });
        if (context) {
          params.append('context', context);
        }
        const res = await fetch(`${API_BASE_URL}/api/referrals?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!isMounted) return;
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || 'Failed to load referrals');
        }
        setPreviousReferrals(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('[REFERRAL_FORM] Fetch history failed:', error);
        if (isMounted) {
          setHistoryError(error instanceof Error ? error.message : 'Failed to load referrals');
          setPreviousReferrals([]);
        }
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [formData.teamMemberName, context, refreshHistoryFlag]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.teamMemberName.trim()) {
      toast.error('Please enter your (team member) name.');
      return;
    }

    if (!formData.referrerName.trim() || !formData.referrerPhone.trim()) {
      toast.error('Referrer name and phone are required.');
      return;
    }

    if (formData.referredClients.some(referred => !referred.name || !referred.phone)) {
      toast.error('Each referred person needs a name and phone.');
      return;
    }

    try {
      setSubmitting(true);
      const selectedTeamMember = formData.teamMemberName;

      const payload = {
        context,
        teamMemberName: formData.teamMemberName.trim(),
        referrerName: formData.referrerName.trim(),
        referrerPhone: formData.referrerPhone.trim(),
        rentokId: formData.rentokId.trim() || undefined,
        referredClients: formData.referredClients.map(client => ({
          name: client.name.trim(),
          phone: client.phone.trim(),
        })),
        notes: formData.notes.trim() || undefined,
      };

      const res = await fetch(`${API_BASE_URL}/api/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        console.error('[REFERRAL_FORM] Submit failed:', json);
        toast.error(json?.error || 'Could not submit referral. Please try again.');
        return;
      }

      toast.success('Referral submitted!');
      setFormData({
        teamMemberName: selectedTeamMember,
        referrerName: '',
        referrerPhone: '',
        rentokId: '',
        referredClients: [{ name: '', phone: '' }],
        notes: '',
      });
      setRefreshHistoryFlag(prev => prev + 1);
      setActiveTab('history');
    } catch (error) {
      console.error('[REFERRAL_FORM] Submit failed:', error);
      toast.error('Could not submit referral. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const headline =
    context === 'cis'
      ? 'Submit Referral to Sales'
      : 'Submit Referral to Onboarding';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 sm:p-8"
    >
      <h2 className="text-2xl font-semibold mb-6">{headline}</h2>
      <div className="flex border-b border-glass-border mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('form')}
          className={`flex-1 p-3 font-medium transition-colors ${
            activeTab === 'form'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          New Referral
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('history')}
          className={`flex-1 p-3 font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Previous Referrals
        </motion.button>
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Who is submitting?</h3>
            {teamMemberName ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-blue-700 shadow-sm">
                {teamMemberName}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Team member name *</span>
                  <select
                    value={formData.teamMemberName}
                    onChange={event =>
                      setFormData(prev => ({ ...prev, teamMemberName: event.target.value }))
                    }
                    className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>
                      Select your name
                    </option>
                    {CIS_USERS.map(user => (
                      <option key={user.id} value={user.name}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Who is referring?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Name *</span>
                <input
                  type="text"
                  value={formData.referrerName}
                  onChange={handleReferrerChange('referrerName')}
                  className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Phone *</span>
                <input
                  type="tel"
                  value={formData.referrerPhone}
                  onChange={handleReferrerChange('referrerPhone')}
                  className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-muted-foreground">RentOk ID</span>
                <input
                  type="text"
                  value={formData.rentokId}
                  onChange={handleReferrerChange('rentokId')}
                  className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Who is being referred?</h3>
              <motion.button
                type="button"
                onClick={handleAddReferred}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-full border border-blue-600 px-4 py-2 text-blue-600 shadow-sm hover:bg-blue-50"
              >
                <span className="text-xl leading-none">+</span>
                Add person
              </motion.button>
            </div>
            {formData.referredClients.map((referred, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-3 gap-5"
              >
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Name *</span>
                  <input
                    type="text"
                    value={referred.name}
                    onChange={handleReferredChange(index, 'name')}
                    className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Phone *</span>
                  <input
                    type="tel"
                    value={referred.phone}
                    onChange={handleReferredChange(index, 'phone')}
                    className="rounded-lg border border-glass-border bg-white/60 px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone"
                    required
                  />
                </label>
                {formData.referredClients.length > 1 && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveReferred(index)}
                      className="w-full rounded-lg border border-red-500 px-4 py-2 text-red-500 shadow-sm transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">Notes</span>
            <textarea
              value={formData.notes}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setFormData(prev => ({ ...prev, notes: event.target.value }))
              }
              className="min-h-[120px] rounded-lg border border-glass-border bg-white/60 px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share context for the hand-off"
            />
          </label>

          <div className="flex justify-end">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Referral'}
            </motion.button>
          </div>
        </form>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {formData.teamMemberName
                  ? `Showing referrals submitted by ${formData.teamMemberName}.`
                  : 'Referral history appears once a team member is selected.'}
              </p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setRefreshHistoryFlag(prev => prev + 1)}
              disabled={!formData.teamMemberName || historyLoading}
              className="rounded-full border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </motion.button>
          </div>

          {!formData.teamMemberName ? (
            <div className="rounded-xl border border-dashed border-glass-border bg-white/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Select a team member to view their referral history.
            </div>
          ) : historyLoading ? (
            <div className="rounded-xl border border-glass-border bg-white/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Loading previous referrals…
            </div>
          ) : historyError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
              {historyError}
            </div>
          ) : previousReferrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-glass-border bg-white/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No referrals found for {formData.teamMemberName}. Submit one to see it here.
            </div>
          ) : (
            <div className="space-y-4">
              {previousReferrals.map(referral => (
                <div
                  key={referral._id}
                  className="rounded-xl border border-glass-border bg-white/60 p-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Submitted</div>
                      <div className="font-medium">{formatDateTime(referral.createdAt)}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Context:&nbsp;
                      <span className="font-medium capitalize">{referral.context}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">Referrer:</span>{' '}
                      {referral.referrerName} &middot; {referral.referrerPhone}
                    </div>
                    {referral.rentokId && (
                      <div>
                        <span className="font-medium text-foreground">RentOk ID:</span>{' '}
                        {referral.rentokId}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">Referred Clients:</span>
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {referral.referredClients.map((client, index) => (
                          <li
                            key={`${referral._id}-${client.phone}-${index}`}
                            className="rounded-lg border border-glass-border bg-white/70 px-3 py-2"
                          >
                            <div className="font-medium">{client.name}</div>
                            <div className="text-muted-foreground text-xs">{client.phone}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {referral.notes && (
                      <div>
                        <span className="font-medium text-foreground">Notes:</span>
                        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                          {referral.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
}