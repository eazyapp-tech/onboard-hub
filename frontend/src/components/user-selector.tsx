'use client';

import { motion } from 'framer-motion';
import { CIS_USERS } from '@/types';

type Props = {
  title?: string;
  onSelect: (cisId: string) => void;
  onBack?: () => void;
};

export function UserSelector({ title = 'Select Onboarding User', onSelect, onBack }: Props) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">{title}</h2>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg glass border border-glass-border hover:bg-white/30 transition-colors"
          >
            Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CIS_USERS.map((u, idx) => (
          <motion.button
            key={u.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * idx }}
            onClick={() => onSelect(u.id)}
            className="text-left p-5 glass rounded-2xl border border-glass-border hover:bg-white/30 transition-colors"
          >
            <p className="text-lg font-semibold">{u.name}</p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
