'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Play, Clock, MapPin, Phone, User } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { CIS_USERS, SLOT_WINDOWS, LOCATION_OPTIONS, OnboardingStatus, StatusHistoryItem } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config';

type OnboardingRow = {
  id: string;
  portfolioManager: string;
  date: string;
  slotWindow: string;
  bookingLocation: string;
  mode: 'physical' | 'virtual';
  ownerName: string;
  ownerPhone: string;
  status: OnboardingStatus;
  statusHistory?: StatusHistoryItem[];
  attachmentUrl?: string;
  // ... any other fields you already store
};

function OnboardingDetailPanel({
  item,
  onClose,
  onStatusChange,
}: {
  item: any; // Booking type
  onClose: () => void;
  onStatusChange: (status: OnboardingStatus, note?: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    ownerName: item.ownerName,
    ownerPhone: item.ownerPhone,
    ownerEmail: item.ownerEmail,
    rentokId: item.rentokId,
    noOfProperties: item.noOfProperties,
    noOfBeds: item.noOfBeds,
    subscriptionType: item.subscriptionType,
    totalAmount: item.totalAmount,
  });
  const getStatusColor = (status: OnboardingStatus) => {
    switch (status) {
      case 'Onboarding Started': return 'bg-yellow-100 text-yellow-700';
      case 'Onboarding Delayed': return 'bg-orange-100 text-orange-700';
      case 'Onboarding Done': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSave = async () => {
    try {
      // Update local store
      const { updateBooking } = useAppStore.getState();
      updateBooking(item.id, {
        ...editData,
        updatedAt: new Date().toISOString()
      });

      // Update backend/sheets if onboarding ID exists
      if (item.onboardingId) {
        const response = await fetch(`${API_BASE_URL}/api/onboarding/${item.onboardingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editData),
        });

        if (response.ok) {
          toast.success('Onboarding details updated successfully!');
          setIsEditing(false);
        } else {
          const errorData = await response.json();
          console.error('Backend update failed:', errorData);
          toast.error('Failed to update onboarding details');
        }
      } else {
        // If no onboarding ID, just update locally
        toast.success('Booking details updated locally!');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating onboarding:', error);
      toast.error('Error updating onboarding details');
    }
  };

  const handleCancel = () => {
    setEditData({
      ownerName: item.ownerName,
      ownerPhone: item.ownerPhone,
      ownerEmail: item.ownerEmail,
      rentokId: item.rentokId,
      noOfProperties: item.noOfProperties,
      noOfBeds: item.noOfBeds,
      subscriptionType: item.subscriptionType,
      totalAmount: item.totalAmount,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white/70 backdrop-blur-lg shadow-2xl p-4 sm:p-6 z-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-semibold">Onboarding Details</h3>
          <div className="flex gap-1 sm:gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 sm:px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs sm:text-sm"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-2 sm:px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs sm:text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2 sm:px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs sm:text-sm"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-2 sm:px-3 py-1 rounded-lg bg-white/60 hover:bg-white text-xs sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="glass p-3 rounded-lg">
            <p><b>Portfolio Manager:</b> {item.portfolioManager}</p>
            {isEditing ? (
              <>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editData.ownerName}
                    onChange={(e) => setEditData({...editData, ownerName: e.target.value})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={editData.ownerPhone}
                    onChange={(e) => setEditData({...editData, ownerPhone: e.target.value})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editData.ownerEmail}
                    onChange={(e) => setEditData({...editData, ownerEmail: e.target.value})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">RentOk ID</label>
                  <input
                    type="text"
                    value={editData.rentokId}
                    onChange={(e) => setEditData({...editData, rentokId: e.target.value})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Properties</label>
                  <input
                    type="number"
                    value={editData.noOfProperties}
                    onChange={(e) => setEditData({...editData, noOfProperties: parseInt(e.target.value)})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Beds</label>
                  <input
                    type="number"
                    value={editData.noOfBeds}
                    onChange={(e) => setEditData({...editData, noOfBeds: parseInt(e.target.value)})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Subscription Type</label>
                  <select
                    value={editData.subscriptionType}
                    onChange={(e) => setEditData({...editData, subscriptionType: e.target.value})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  >
                    <option value="Base">Base</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1">Total Amount</label>
                  <input
                    type="number"
                    value={editData.totalAmount}
                    onChange={(e) => setEditData({...editData, totalAmount: parseInt(e.target.value)})}
                    className="w-full p-2 rounded border border-gray-300 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <p><b>Owner:</b> {item.ownerName} ({item.ownerPhone})</p>
                <p><b>Email:</b> {item.ownerEmail}</p>
              </>
            )}
            <p><b>Date:</b> {format(new Date(item.date), 'MMM d, yyyy')}</p>
            <p><b>Slot:</b> {item.slotWindow === '10_13' ? '10 AM – 1 PM' : item.slotWindow === '14_17' ? '2 PM – 5 PM' : '6 PM – 7 PM'}</p>
            <p><b>Location:</b> {item.bookingLocation.replace('_', ' ')}</p>
            <p><b>Mode:</b> {item.mode}</p>
            {!isEditing && (
              <>
                <p><b>RentOk ID:</b> {item.rentokId}</p>
                <p><b>Properties:</b> {item.noOfProperties}</p>
                <p><b>Beds:</b> {item.noOfBeds}</p>
                <p><b>Subscription:</b> {item.subscriptionType}</p>
                <p><b>Total Amount:</b> ₹{item.totalAmount.toLocaleString()}</p>
              </>
            )}
            <p><b>Status:</b>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.onboardingStatus)}`}>
                {item.onboardingStatus}
              </span>
            </p>
          </div>

          {/* Timeline */}
          <div className="glass p-3 rounded-lg">
            <p className="font-medium mb-2">Onboarding Journey</p>
            <div className="space-y-2">
              {(item.statusHistory || []).map((h: any, idx: number) => (
                <div key={idx} className="p-2 bg-white/60 rounded">
                  <p><b>{h.status}</b> — {new Date(h.at).toLocaleString()}</p>
                  {h.note ? <p className="text-xs text-muted-foreground">Note: {h.note}</p> : null}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="glass p-3 rounded-lg space-y-3">
            <p className="font-medium">Update Onboarding Status</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onStatusChange('Onboarding Started')}
                className="px-3 py-2 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              >
                Started
              </button>
              <button
                onClick={() => onStatusChange('Onboarding Delayed')}
                className="px-3 py-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200"
              >
                Delayed
              </button>
              <button
                onClick={() => onStatusChange('Onboarding Done')}
                className="px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CisDashboard() {
  const { currentUser, selectedOnboardingId, setSelectedOnboarding, getBookingsForCis, updateOnboardingStatus, bookings } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<'scheduled' | 'completed' | 'all'>('scheduled');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get bookings from local store
  const myBookings = currentUser?.id ? getBookingsForCis(currentUser.id) : [];
  
  // Debug logging
  console.log('CIS Dashboard Debug:', {
    currentUserId: currentUser?.id,
    allBookings: bookings,
    myBookings,
    bookingsLength: bookings.length
  });
  
  const filteredBookings = myBookings.filter(booking => {
    if (selectedDate && booking.date !== selectedDate) return false;
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    if (locationFilter !== 'all' && booking.bookingLocation !== locationFilter) return false;
    if (modeFilter !== 'all' && booking.mode !== modeFilter) return false;
    return true;
  });

  const scheduledCount = filteredBookings.filter(b => b.status === 'scheduled').length;
  const completedCount = filteredBookings.filter(b => b.status === 'completed').length;

  const selected = filteredBookings.find(b => b.id === selectedOnboardingId);

  const closePanel = () => setSelectedOnboarding(null);

  const changeStatus = (status: OnboardingStatus, note?: string) => {
    if (!selected) return;
    
    // Update in store
    updateOnboardingStatus(selected.id, status, note);
    toast.success('Status updated');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Onboarding Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your onboarding sessions and track your progress.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }} 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
      >
        <div className="glass rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h3 className="text-base sm:text-lg font-semibold">Scheduled</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{scheduledCount}</p>
        </div>
        
        <div className="glass rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            <h3 className="text-base sm:text-lg font-semibold">Completed</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{completedCount}</p>
        </div>
        
        <div className="glass rounded-xl p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
            <h3 className="text-base sm:text-lg font-semibold">Total</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">{filteredBookings.length}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }} 
        className="glass rounded-xl p-4 sm:p-6 mb-6 sm:mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
          <h3 className="text-base sm:text-lg font-semibold">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="w-full p-2 sm:p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" 
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Status</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value as any)} 
              className="w-full p-2 sm:p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Location</label>
            <select 
              value={locationFilter} 
              onChange={e => setLocationFilter(e.target.value)} 
              className="w-full p-2 sm:p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Locations</option>
              {LOCATION_OPTIONS.map(location => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Mode</label>
            <select 
              value={modeFilter} 
              onChange={e => setModeFilter(e.target.value)} 
              className="w-full p-2 sm:p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Modes</option>
              <option value="physical">Physical</option>
              <option value="virtual">Virtual</option>
            </select>
          </div>
          
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => {
                setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                setStatusFilter('scheduled');
                setLocationFilter('all');
                setModeFilter('all');
              }} 
              className="w-full p-2 sm:p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Reset
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Bookings List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }} 
        className="glass rounded-xl overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-glass-border">
          <div className="flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-semibold">Onboarding Queue</h3>
            <button
              onClick={() => {
                console.log('Current store state:', useAppStore.getState());
                setRefreshKey(prev => prev + 1);
              }}
              className="px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto" key={refreshKey}>
          <table className="w-full">
            <thead className="bg-white/10">
              <tr>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Portfolio Manager</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Date</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">Slot Window</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden md:table-cell">Location</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden md:table-cell">Mode</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Owner Name</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">Phone</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Status</th>
                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking, index) => {
              const slot = SLOT_WINDOWS.find(s => s.value === booking.slotWindow);
                const getStatusColor = (status: OnboardingStatus) => {
                  switch (status) {
                    case 'Onboarding Started': return 'bg-yellow-100 text-yellow-700';
                    case 'Onboarding Delayed': return 'bg-orange-100 text-orange-700';
                    case 'Onboarding Done': return 'bg-green-100 text-green-700';
                    default: return 'bg-gray-100 text-gray-700';
                  }
                };
                
                return (
                  <motion.tr 
                    key={booking.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: index * 0.05 }} 
                    className="border-t border-glass-border hover:bg-white/5 transition-colors"
                  >
                    <td className="p-2 sm:p-4 text-xs sm:text-sm">{booking.portfolioManager}</td>
                    <td className="p-2 sm:p-4 text-xs sm:text-sm">{format(new Date(booking.date), 'MMM d, yyyy')}</td>
                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden sm:table-cell">{slot?.label}</td>
                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden md:table-cell capitalize">{booking.bookingLocation.replace('_', ' ')}</td>
                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden md:table-cell capitalize">{booking.mode}</td>
                    <td className="p-2 sm:p-4 text-xs sm:text-sm">{booking.ownerName}</td>
                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden sm:table-cell flex items-center gap-2">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                      {booking.ownerPhone}
                    </td>
                    <td className="p-2 sm:p-4">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.onboardingStatus)}`}>
                        {booking.onboardingStatus}
                      </span>
                    </td>
                    <td className="p-2 sm:p-4">
                      <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }} 
                        onClick={() => setSelectedOnboarding(booking.id)} 
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-shadow text-xs sm:text-sm"
                      >
                        <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                      </motion.button>
                    </td>
                  </motion.tr>
                );
            })}
            </tbody>
          </table>
          
          {filteredBookings.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No bookings found matching your filters</p>
            </div>
          )}
        </div>
      </motion.div>

      {selected && (
        <OnboardingDetailPanel
          item={selected}
          onClose={closePanel}
          onStatusChange={changeStatus}
        />
      )}
    </div>
  );
}