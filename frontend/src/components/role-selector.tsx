'use client';

import { motion } from 'framer-motion';
import { Users, UserCheck } from 'lucide-react';
interface RoleSelectorProps {
  onRoleSelect: (role: 'sales' | 'cis') => void;
}
export function RoleSelector({
  onRoleSelect
}: RoleSelectorProps) {
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
          Choose your role to continue
        </span></motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto px-4" data-unique-id="3607d29e-4ef2-4cc4-9286-e3ce75f08659" data-file-name="components/role-selector.tsx">
          <motion.div initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.6,
          delay: 0.3
        }} whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} onClick={() => onRoleSelect('sales')} className="glass rounded-2xl p-6 sm:p-8 cursor-pointer group hover:shadow-2xl transition-all duration-300" data-unique-id="cc056caf-42b6-42a7-9f62-80f0298e9c72" data-file-name="components/role-selector.tsx">
            <div className="gradient-primary w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform duration-300" data-unique-id="6db85459-39c4-4cc1-937f-6ad297316135" data-file-name="components/role-selector.tsx">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4" data-unique-id="9dee455c-7772-4de5-8a47-9f65285b8233" data-file-name="components/role-selector.tsx"><span className="editable-text" data-unique-id="a5987a1f-712a-4e90-b27d-e59e0e0224c0" data-file-name="components/role-selector.tsx">Sales</span></h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed" data-unique-id="b582fbf2-7e13-4c1a-ae59-a86056efb78d" data-file-name="components/role-selector.tsx"><span className="editable-text" data-unique-id="5ebea8a5-1bd9-4737-a339-41825847f854" data-file-name="components/role-selector.tsx">
              Book onboarding slots for new clients after successful sales
            </span></p>
          </motion.div>

          <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.6,
          delay: 0.4
        }} whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} onClick={() => onRoleSelect('cis')} className="glass rounded-2xl p-6 sm:p-8 cursor-pointer group hover:shadow-2xl transition-all duration-300" data-unique-id="17b48710-2042-4799-b663-edc7f4af17ca" data-file-name="components/role-selector.tsx">
            <div className="gradient-primary w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform duration-300" data-unique-id="7d312c13-0d8b-4cfb-825a-221bd18b140d" data-file-name="components/role-selector.tsx">
              <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4" data-unique-id="66449494-a379-468c-9c3b-5bab85f4c91c" data-file-name="components/role-selector.tsx"><span className="editable-text" data-unique-id="9a241429-3217-474d-9620-67301c0b0328" data-file-name="components/role-selector.tsx">Onboarding</span></h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed" data-unique-id="3e7474cb-5f9b-45de-87df-2fb813107847" data-file-name="components/role-selector.tsx"><span className="editable-text" data-unique-id="4909c42c-2223-4054-b900-378ed69ced5a" data-file-name="components/role-selector.tsx">
              Manage and complete client onboarding sessions
            </span></p>
          </motion.div>
        </div>
      </motion.div>
    </div>;
}