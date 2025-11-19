import { useState } from 'react';
import { motion } from 'framer-motion';
import { SellAddonForm } from './sell-addon';
import { SoldAddonList } from './sold-addon-list';

export function AddonDashboard() {
  const [tab, setTab] = useState<'sell' | 'history'>('sell');

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
      <div className="flex border-b border-glass-border rounded-t-xl overflow-hidden">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setTab('sell')}
          className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
            tab === 'sell'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sell Add-on
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setTab('history')}
          className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium transition-colors ${
            tab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white/70'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sold Add-ons
        </motion.button>
      </div>

      <div className="pb-8">
        {tab === 'sell' ? <SellAddonForm /> : <SoldAddonList />}
      </div>
    </div>
  );
}

