'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Users } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface TeamMemberSelectorProps {
  userAccess: {
    scopes: {
      sales?: { level: string; canAccess: boolean; teamName?: string };
      onboarding?: { level: string; canAccess: boolean; teamName?: string };
    };
    teams: {
      sales?: string[];
      onboarding?: string[];
    };
    isSuperAdmin: boolean;
  };
  scope: 'sales' | 'onboarding';
  onSelect: (email: string | null) => void;
  currentSelection: string | null;
}

export function TeamMemberSelector({
  userAccess,
  scope,
  onSelect,
  currentSelection
}: TeamMemberSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isSuperAdmin = userAccess.isSuperAdmin;
  const isManager = userAccess.scopes[scope]?.level === 'manager';
  const isTeamMember = userAccess.scopes[scope]?.level === 'team_member';

  // Get team members for this scope
  const teamMembers = isSuperAdmin 
    ? allUsers // Super admin sees all users
    : userAccess.teams[scope] || [];

  // Fetch all users for super admin
  useEffect(() => {
    if (isSuperAdmin && allUsers.length === 0 && !loadingUsers) {
      setLoadingUsers(true);
      fetch(`${API_BASE_URL}/api/users-by-scope?scope=${scope}`)
        .then(res => res.json())
        .then(result => {
          if (result.ok && result.data) {
            const emails = result.data.map((u: { email: string }) => u.email);
            setAllUsers(emails);
          }
          setLoadingUsers(false);
        })
        .catch(err => {
          console.error('[TeamSelector] Error fetching users:', err);
          setLoadingUsers(false);
        });
    }
  }, [isSuperAdmin, scope, allUsers.length, loadingUsers]);

  // If team member, no selector needed
  if (isTeamMember) {
    return null;
  }

  const handleSelect = (email: string | null) => {
    onSelect(email);
    setIsOpen(false);
  };

  return (
    <div className="mb-4">
      {(isSuperAdmin || (isManager && teamMembers.length > 0)) ? (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={loadingUsers}
            className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-2 hover:border-blue-500 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">
                {loadingUsers 
                  ? 'Loading users...'
                  : currentSelection 
                    ? `Viewing: ${currentSelection.split('@')[0]}`
                    : isSuperAdmin
                      ? 'Select User (All Users)'
                      : 'Select Team Member'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && !loadingUsers && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              <button
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                  currentSelection === null ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                <span className="text-sm font-medium">
                  {isSuperAdmin ? 'All Users' : 'All Team Members'}
                </span>
              </button>
              {teamMembers.length > 0 ? (
                teamMembers.map((email) => (
                  <button
                    key={email}
                    onClick={() => handleSelect(email)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                      currentSelection === email ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <span className="text-sm">{email.split('@')[0]}</span>
                    <span className="text-xs text-gray-500 ml-2">({email})</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No users found
                </div>
              )}
            </motion.div>
          )}
        </div>
      ) : null}
    </div>
  );
}

