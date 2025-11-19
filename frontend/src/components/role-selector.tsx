'use client';

import { motion } from 'framer-motion';
import { Users, UserCheck, PlusSquare } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface RoleSelectorProps {
  onRoleSelect: (role: 'sales' | 'cis' | 'addon') => void;
}
export function RoleSelector({
  onRoleSelect
}: RoleSelectorProps) {
  const { userAccess } = useAppStore();
  
  // Determine which cards to show based on user access
  // If userAccess is null (loading failed or not loaded), show all cards as fallback
  const showSales = !userAccess || userAccess?.isSuperAdmin || userAccess?.scopes?.sales?.canAccess;
  const showOnboarding = !userAccess || userAccess?.isSuperAdmin || userAccess?.scopes?.onboarding?.canAccess;
  const showAddon = true; // Always show add-on
  
  // Calculate grid columns based on visible cards
  const visibleCards = [showSales, showOnboarding, showAddon].filter(Boolean).length;
  const gridCols = visibleCards === 1 ? 'grid-cols-1' : visibleCards === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3';
  return <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8" data-unique-id="8b964b2f-24b8-431e-86be-b6774a87cabf" data-file-name="components/role-selector.tsx">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6
    }} className="text-center w-full max-w-6xl" data-unique-id="2232c1cd-402c-4afd-95e0-95db813e9276" data-file-name="components/role-selector.tsx">
        <motion.h1 initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6,
        delay: 0.1
      }} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" data-unique-id="7331e956-a981-4284-816e-89d66ef335ae" data-file-name="components/role-selector.tsx"><span className="editable-text" data-unique-id="0c973f93-acc3-4e0f-b5b6-85e854348fdc" data-file-name="components/role-selector.tsx">
          Onboarding Hub
        </span></motion.h1>
        
        <motion.p initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6,
        delay: 0.2
      }} className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-12 px-4" data-unique-id="f9da32b5-a06a-4771-9982-73522cd0377c" data-file-name="components/role-selector.tsx"><span className="editable-text" data-unique-id="07317fca-625e-4a30-8ebb-06b296537776" data-file-name="components/role-selector.tsx">
          Choose your task to continue
        </span></motion.p>

        <div className={`grid ${gridCols} gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto px-4`}>
          {showSales && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRoleSelect('sales')} 
              className="glass rounded-2xl p-6 sm:p-8 cursor-pointer group hover:shadow-2xl transition-all duration-300"
            >
              <div className="gradient-primary w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Sales</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Book onboarding slots for new clients after successful sales
              </p>
            </motion.div>
          )}

          {showOnboarding && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRoleSelect('cis')} 
              className="glass rounded-2xl p-6 sm:p-8 cursor-pointer group hover:shadow-2xl transition-all duration-300"
            >
              <div className="gradient-primary w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Onboarding</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Manage and complete client onboarding sessions
              </p>
            </motion.div>
          )}

          {showAddon && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRoleSelect('addon')} 
              className="glass rounded-2xl p-6 sm:p-8 cursor-pointer group hover:shadow-2xl transition-all duration-300"
            >
              <div className="gradient-primary w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                <PlusSquare className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Add-on Manager</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Sell add-ons and review all sold add-ons across bookings
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>;
}