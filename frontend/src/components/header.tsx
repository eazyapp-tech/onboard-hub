'use client';

import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, LogOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@clerk/nextjs';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showTodayBookings?: boolean;
  onTodayBookings?: () => void;
  showLogout?: boolean;
}
export function Header({
  title,
  showBackButton,
  onBack,
  showTodayBookings,
  onTodayBookings,
  showLogout = true
}: HeaderProps) {
  const currentUser = useAppStore(state => state.currentUser);
  const { signOut } = useAuth();
  return <motion.header initial={{
    opacity: 0,
    y: -20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="glass border-b border-glass-border p-4 sm:p-6 sticky top-0 z-50" data-unique-id="ee33ef96-f74e-4673-a383-7ff5258258f4" data-file-name="components/header.tsx">
      <div className="flex items-center justify-between" data-unique-id="83634c42-225a-467d-b0e3-2f841fefaf60" data-file-name="components/header.tsx" data-dynamic-text="true">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1" data-unique-id="6ed9b0ae-4c0e-4dd1-9866-ac82fc20b119" data-file-name="components/header.tsx" data-dynamic-text="true">
          {showBackButton && <motion.button whileHover={{
          scale: 1.05
        }} whileTap={{
          scale: 0.95
        }} onClick={onBack} className="p-2 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0" data-unique-id="40505fbb-69be-479e-b8b6-495b06c6031f" data-file-name="components/header.tsx">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>}
          <div className="min-w-0 flex-1" data-unique-id="a077775d-6fa4-456f-83be-5553334d9807" data-file-name="components/header.tsx" data-dynamic-text="true">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate" data-unique-id="8520b0b8-66d5-4d60-a413-f5c0616d43a8" data-file-name="components/header.tsx" data-dynamic-text="true">{title}</h1>
            {currentUser && <p className="text-xs sm:text-sm text-muted-foreground truncate" data-unique-id="a1cfadc6-897b-481f-bc98-0bf5864b3d3f" data-file-name="components/header.tsx" data-dynamic-text="true">
                {currentUser.name}
              </p>}
          </div>
        </div>

        {showTodayBookings && <motion.button whileHover={{
        scale: 1.05
      }} whileTap={{
        scale: 0.95
      }} onClick={onTodayBookings} className="gradient-primary text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium flex items-center gap-1 sm:gap-2 shadow-lg hover:shadow-xl transition-shadow text-sm sm:text-base flex-shrink-0" data-unique-id="63b35dd5-8b0f-4190-b1bb-978621a4dc0c" data-file-name="components/header.tsx">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" data-unique-id="e88ef21e-96df-4f92-b66a-9c25623406c4" data-file-name="components/header.tsx" />
            <span className="hidden sm:inline editable-text" data-unique-id="bd8db14a-82e1-4eca-b9fd-c3b285c2067b" data-file-name="components/header.tsx">
            Today's Bookings
          </span>
            <span className="sm:hidden editable-text" data-unique-id="bd8db14a-82e1-4eca-b9fd-c3b285c2067b" data-file-name="components/header.tsx">
            Today
          </span>
          </motion.button>}

        {showLogout && <motion.button whileHover={{
        scale: 1.05
      }} whileTap={{
        scale: 0.95
      }} onClick={() => signOut()} className="bg-red-100 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium flex items-center gap-1 sm:gap-2 hover:bg-red-200 transition-colors text-sm sm:text-base flex-shrink-0">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Logout</span>
          </motion.button>}
      </div>
    </motion.header>;
}