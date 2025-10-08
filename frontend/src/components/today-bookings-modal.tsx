'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, List, ChevronLeft, ChevronRight, Download, Calendar as CalendarIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { format, addDays, subDays } from 'date-fns';
import { CIS_USERS, SLOT_WINDOWS } from '@/types';

// Calendar Picker Component
function CalendarPicker({ 
  selectedDate, 
  onDateSelect, 
  isOpen, 
  onClose 
}: { 
  selectedDate: string; 
  onDateSelect: (date: string) => void; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const today = new Date();
  const selected = new Date(selectedDate);
  
  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDay = new Date(startDate);
    const endDay = new Date(startDate);
    endDay.setDate(endDay.getDate() + 41); // 6 weeks
    
    while (currentDay <= endDay) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = getDaysInMonth(selected);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const isSameDay = (date1: Date, date2: Date) => 
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  // Month and year navigation functions
  const goToPreviousMonth = () => {
    const newDate = new Date(selected);
    newDate.setMonth(newDate.getMonth() - 1);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    onDateSelect(newDateStr);
    // Don't close the calendar, just navigate
  };

  const goToNextMonth = () => {
    const newDate = new Date(selected);
    newDate.setMonth(newDate.getMonth() + 1);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    onDateSelect(newDateStr);
    // Don't close the calendar, just navigate
  };

  const goToPreviousYear = () => {
    const newDate = new Date(selected);
    newDate.setFullYear(newDate.getFullYear() - 1);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    onDateSelect(newDateStr);
    // Don't close the calendar, just navigate
  };

  const goToNextYear = () => {
    const newDate = new Date(selected);
    newDate.setFullYear(newDate.getFullYear() + 1);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    onDateSelect(newDateStr);
    // Don't close the calendar, just navigate
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-60 p-4"
          >
            <div className="glass rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select Date</h3>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                {/* Year Navigation */}
                <div className="flex items-center justify-between mb-2">
                  <button 
                    onClick={goToPreviousYear}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                    title="Previous Year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-lg font-semibold text-center flex-1">
                    {selected.getFullYear()}
                  </h3>
                  <button 
                    onClick={goToNextYear}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                    title="Next Year"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <button 
                    onClick={goToPreviousMonth}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold">
                    {monthNames[selected.getMonth()]}
                  </h2>
                  <button 
                    onClick={goToNextMonth}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const today = new Date();
                    onDateSelect(format(today, 'yyyy-MM-dd'));
                    onClose();
                  }}
                  className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Today
                </button>
                <button 
                  onClick={() => {
                    const thisMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
                    onDateSelect(format(thisMonth, 'yyyy-MM-dd'));
                  }}
                  className="flex-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  This Month
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2 mt-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const isCurrentMonth = day.getMonth() === selected.getMonth();
                  const isSelected = isSameDay(day, selected);
                  const isToday = isSameDay(day, today);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        onDateSelect(format(day, 'yyyy-MM-dd'));
                        onClose();
                      }}
                      className={`
                        p-2 text-sm rounded-lg transition-colors
                        ${!isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}
                        ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/20'}
                        ${isToday && !isSelected ? 'ring-2 ring-blue-600' : ''}
                      `}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface TodayBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export function TodayBookingsModal({
  isOpen,
  onClose
}: TodayBookingsModalProps) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'sheet'>('calendar');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const {
    getBookingsByDate,
    currentUser
  } = useAppStore();
  
  // Get all bookings for the selected date
  const allBookings = getBookingsByDate(selectedDate);
  
  // Filter bookings based on user role
  const bookings = allBookings.filter(booking => {
    // If no current user, show all bookings
    if (!currentUser) {
      return true;
    }
    
    // For SALES users: Show ALL bookings (not just their own)
    if (currentUser.role === 'sales') {
      return true; // Show all onboardings for sales users
    }
    
    // For CIS users: Show bookings assigned to them
    if (currentUser.role === 'cis') {
      return booking.cisId === currentUser.id;
    }
    
    // For ADMIN users: Show all bookings
    if (currentUser.role === 'admin') {
      return true;
    }
    
    // Default: no bookings
    return false;
  });
  
  const exportCSV = () => {
    if (typeof window === 'undefined') return;
    const headers = ['Booking Ref', 'Person', 'Date', 'Slot Window', 'Location', 'Mode', 'Owner Name', 'Phone', 'RentOk ID', 'Salesperson', 'Status'];
    const rows = bookings.map(booking => {
      const cis = CIS_USERS.find(c => c.id === booking.cisId);
      const slot = SLOT_WINDOWS.find(s => s.value === booking.slotWindow);
      return [
        booking.bookingRef, 
        cis?.name || '', 
        booking.date, 
        slot?.label || '', 
        booking.bookingLocation.replace('_', ' '), 
        booking.mode, 
        booking.ownerName, 
        booking.ownerPhone, 
        booking.rentokId, 
        booking.createdBy || 'Unknown', // Show actual salesperson name
        booking.status
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${selectedDate}-${currentUser?.name || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const goToPrevDay = () => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };
  const goToNextDay = () => {
    setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  };
  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };
  return <AnimatePresence>
      {isOpen && <>
          <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" data-unique-id="f75f3578-d874-4cd6-b87c-ec8a7f91384f" data-file-name="components/today-bookings-modal.tsx" />
          <motion.div initial={{
        opacity: 0,
        x: '100%'
      }} animate={{
        opacity: 1,
        x: 0
      }} exit={{
        opacity: 0,
        x: '100%'
      }} transition={{
        type: 'spring',
        damping: 25,
        stiffness: 200
      }} className="fixed right-0 top-0 h-full w-full max-w-4xl glass border-l border-glass-border z-50 overflow-hidden" data-unique-id="86e2df50-f7fd-4329-a76c-b36ec3875154" data-file-name="components/today-bookings-modal.tsx">
            <div className="flex flex-col h-full" data-unique-id="6c8e665c-16ba-4a49-80f6-4179ca7e0e04" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-glass-border" data-unique-id="b7478b63-a5de-4212-a03b-5c1301ad4807" data-file-name="components/today-bookings-modal.tsx">
                <h2 className="text-2xl font-bold" data-unique-id="585b70df-5076-4777-bab2-bb8840275c31" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="131140e6-a23a-412e-ac6b-d541cf29dbd0" data-file-name="components/today-bookings-modal.tsx">Today's Bookings</span></h2>
                <motion.button whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors" data-unique-id="f31cf78d-94a9-4ddd-bb6e-23dabcf06f51" data-file-name="components/today-bookings-modal.tsx">
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-glass-border" data-unique-id="8237a2f8-9f3d-4b3f-9fd8-f003a0a895cc" data-file-name="components/today-bookings-modal.tsx">
                <motion.button whileHover={{
              scale: 1.02
            }} whileTap={{
              scale: 0.98
            }} onClick={() => setActiveTab('calendar')} className={`flex-1 p-4 font-medium transition-colors ${activeTab === 'calendar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'}`} data-unique-id="e2f94c58-d6b6-4245-913c-d1fc485a92a6" data-file-name="components/today-bookings-modal.tsx">
                  <Calendar className="w-5 h-5 inline mr-2" data-unique-id="c07cb381-7831-44fb-b5d7-7f78f074b6ce" data-file-name="components/today-bookings-modal.tsx" /><span className="editable-text" data-unique-id="5e70e474-e1c9-4ae5-bdec-e236d01189ea" data-file-name="components/today-bookings-modal.tsx">
                  Calendar
                </span></motion.button>
                <motion.button whileHover={{
              scale: 1.02
            }} whileTap={{
              scale: 0.98
            }} onClick={() => setActiveTab('sheet')} className={`flex-1 p-4 font-medium transition-colors ${activeTab === 'sheet' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'}`} data-unique-id="ecdb4095-a72a-4907-a7f3-57ac806d758c" data-file-name="components/today-bookings-modal.tsx">
                  <List className="w-5 h-5 inline mr-2" /><span className="editable-text" data-unique-id="c917416b-cd44-4726-a3de-9d8911a827c5" data-file-name="components/today-bookings-modal.tsx">
                  Sheet
                </span></motion.button>
              </div>

              {/* Date Controls */}
              <div className="flex items-center justify-between p-4 border-b border-glass-border" data-unique-id="6271fed5-8d2a-46de-9024-6cc95fd97668" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                <div className="flex items-center gap-2" data-unique-id="1c6f8b03-deb2-4f57-9f50-6251fbce24a5" data-file-name="components/today-bookings-modal.tsx">
                  <motion.button whileHover={{
                scale: 1.05
              }} whileTap={{
                scale: 0.95
              }} onClick={goToPrevDay} className="p-2 rounded-lg hover:bg-white/20 transition-colors" data-unique-id="0571c874-c8a3-42a7-a262-46696d21aedb" data-file-name="components/today-bookings-modal.tsx">
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={goToToday} 
                    className="px-4 py-2 rounded-lg hover:bg-white/20 transition-colors font-medium" 
                    data-unique-id="e474dacf-884d-4822-bc85-0a3df21d8ede" 
                    data-file-name="components/today-bookings-modal.tsx"
                  >
                    <span className="editable-text" data-unique-id="60c25091-6ba0-4325-a88d-c3571ab8c06d" data-file-name="components/today-bookings-modal.tsx">
                      {format(new Date(selectedDate), 'MMM d')}
                    </span>
                  </motion.button>
                  <motion.button whileHover={{
                scale: 1.05
              }} whileTap={{
                scale: 0.95
              }} onClick={goToNextDay} className="p-2 rounded-lg hover:bg-white/20 transition-colors" data-unique-id="2b8c7eb5-19cd-45ee-8865-043baab57470" data-file-name="components/today-bookings-modal.tsx">
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                  
                  {/* Calendar Picker Button */}
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => setShowCalendarPicker(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Select date"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>Calendar</span>
                  </motion.button>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold" data-unique-id="724b8953-c9e2-43a3-80a3-be299e0c3448" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                    {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                  </div>
                  {currentUser && (
                    <div className="text-sm text-muted-foreground">
                      {currentUser.role === 'sales' && `Showing bookings created by: ${currentUser.name}`}
                      {currentUser.role === 'cis' && `Showing bookings assigned to: ${currentUser.name}`}
                      {currentUser.role === 'admin' && `Showing all bookings (Admin view)`}
                      {!currentUser.role && `Showing bookings for: ${currentUser.name}`}
                    </div>
                  )}
                </div>
                
                
                {activeTab === 'sheet' && <motion.button whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" data-unique-id="01e23a2d-69b2-40fc-ac72-b290bbefa71f" data-file-name="components/today-bookings-modal.tsx">
                    <Download className="w-4 h-4" /><span className="editable-text" data-unique-id="d1f5a6c0-c0ab-4863-9319-cd00161ccd81" data-file-name="components/today-bookings-modal.tsx">
                    Export CSV
                  </span></motion.button>}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6" data-unique-id="d5dc1e6c-1fd8-48f8-a478-09449c2bdee6" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                {activeTab === 'calendar' ? <CalendarView bookings={bookings} /> : <SheetView bookings={bookings} />}
              </div>
            </div>
          </motion.div>
          
          {/* Calendar Picker */}
          <CalendarPicker
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            isOpen={showCalendarPicker}
            onClose={() => setShowCalendarPicker(false)}
          />
        </>}
    </AnimatePresence>;
}
function CalendarView({
  bookings
}: {
  bookings: any[];
}) {
  const { currentUser } = useAppStore();
  const timeSlots = SLOT_WINDOWS;
  return <div className="space-y-6" data-unique-id="6a79ab2b-d3aa-438f-8abd-8c51b550840d" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
      {timeSlots.map((slot, index) => {
      const slotBookings = bookings.filter(b => b.slotWindow === slot.value);
      return <motion.div key={slot.value} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: index * 0.1
      }} className="glass rounded-xl p-6" data-unique-id="1bd49e8f-2dd1-4507-b65f-15a1e13bb38e" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
            <h3 className="text-lg font-semibold mb-4" data-unique-id="6725b78c-3bda-4706-984b-c0f542bb6aef" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{slot.label}</h3>
            {slotBookings.length === 0 ? <p className="text-muted-foreground" data-unique-id="dcdcad7f-d87c-4396-8043-ccae33376a15" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="132c48f5-4742-4c43-936c-0a8b253ddce9" data-file-name="components/today-bookings-modal.tsx">No bookings scheduled</span></p> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-unique-id="6d7845eb-4bfb-447b-ab35-5de01a6bf78c" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                {slotBookings.map(booking => {
            const cis = CIS_USERS.find(c => c.id === booking.cisId);
            return <motion.div key={booking.id} whileHover={{
              scale: 1.02
            }} className="glass p-4 rounded-lg border border-glass-border" data-unique-id="94dafe96-7dec-4c17-8a96-7b251cf9522d" data-file-name="components/today-bookings-modal.tsx">
                      <div className="flex items-center justify-between mb-2" data-unique-id="fcb5ea01-dd1e-45c2-8266-df12263da5d7" data-file-name="components/today-bookings-modal.tsx">
                        {/* Show different info based on user role */}
                        <span className="font-medium" data-unique-id="5bb274c3-1d1d-43db-ad41-aeb34a74c44e" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                          {currentUser?.role === 'sales' 
                            ? `Assigned to: ${cis?.name}`  // Sales: Show which CIS is handling
                            : currentUser?.role === 'cis'
                            ? booking.createdBy || 'Unknown'  // CIS: Show who booked it
                            : `${cis?.name}`  // Admin: Show CIS name
                          }
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : booking.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} data-unique-id="60a5cfb2-2f08-4c21-ba7f-4b2023120060" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1" data-unique-id="5962fd3a-d038-48b6-8c07-10b5da0ba546" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                        {booking.ownerName}<span className="editable-text" data-unique-id="88185d55-26d0-46cf-80ae-cacbfe48a0a6" data-file-name="components/today-bookings-modal.tsx"> • </span>{booking.bookingLocation.replace('_', ' ')}<span className="editable-text" data-unique-id="646d9297-9bd5-4afc-89ad-02cb08666fca" data-file-name="components/today-bookings-modal.tsx"> • </span>{booking.mode}
                      </p>
                      <p className="text-xs text-muted-foreground" data-unique-id="727a175a-2b64-4310-8166-0927772d2a82" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                        {booking.bookingRef}
                      </p>
                    </motion.div>;
          })}
              </div>}
          </motion.div>;
    })}
    </div>;
}
function SheetView({
  bookings
}: {
  bookings: any[];
}) {
  return <div className="glass rounded-xl overflow-hidden" data-unique-id="05936318-c0af-4066-b0e6-bcff1e5a7f37" data-file-name="components/today-bookings-modal.tsx">
      <div className="overflow-x-auto" data-unique-id="6f8efb8d-1a70-48ca-a7c8-0bf02486e85c" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
        <table className="w-full" data-unique-id="f34d0322-452b-4ade-a5b2-48584a7c9bba" data-file-name="components/today-bookings-modal.tsx">
          <thead className="bg-white/10" data-unique-id="395dd04e-ab3a-4753-8d74-69116afdfad1" data-file-name="components/today-bookings-modal.tsx">
            <tr data-unique-id="b6c516e4-5efe-472b-991a-932ca7be19ae" data-file-name="components/today-bookings-modal.tsx">
              <th className="text-left p-4 font-medium" data-unique-id="96c2fd8f-f6e0-4682-98cb-f7c5c6231640" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="c06f8b11-7dc6-43d8-8b71-930355df7d8b" data-file-name="components/today-bookings-modal.tsx">Booking Ref</span></th>
              <th className="text-left p-4 font-medium" data-unique-id="684cf3a2-2ab0-4c1d-9a62-ad8b9f9ff216" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="2d3fc30f-2619-44c3-bf20-58cbe74678c3" data-file-name="components/today-bookings-modal.tsx">Person</span></th>
              <th className="text-left p-4 font-medium" data-unique-id="e3dd1aa4-19c7-408f-bbf1-e7e13acd97bd" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="a62ae80b-17a8-4f00-8748-2f565eecc039" data-file-name="components/today-bookings-modal.tsx">Slot Window</span></th>
              <th className="text-left p-4 font-medium" data-unique-id="161821cd-1cec-49d3-abdb-4456d8851252" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="5825e58c-db51-424d-a736-c88aea8bac19" data-file-name="components/today-bookings-modal.tsx">Location</span></th>
              <th className="text-left p-4 font-medium" data-unique-id="fdd1aeda-8371-4e57-8d03-c8106d5164ad" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="e107def1-5bb2-4ef4-96ca-65bd05ddf3f5" data-file-name="components/today-bookings-modal.tsx">Mode</span></th>
              <th className="text-left p-4 font-medium" data-unique-id="7ab75df7-3f3a-4421-be83-38bbe92f026b" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="bd2ce2b5-aaf3-44dc-b26e-d50ffe64bc83" data-file-name="components/today-bookings-modal.tsx">Owner Name</span></th>
              <th className="text-left p-4 font-medium" data-unique-id="0b2efe4d-8d10-49ee-9112-e9463a20e10c" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="bf94c8da-5df9-41e7-b24d-d6b6c5e3af59" data-file-name="components/today-bookings-modal.tsx">Phone</span></th>
              <th className="text-left p-4 font-medium" data-unique-id="7e7dd1b3-0f4f-4b48-bf3e-90718a870c18" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="2cece041-e258-476e-bcd7-efa2582914a5" data-file-name="components/today-bookings-modal.tsx">Status</span></th>
            </tr>
          </thead>
          <tbody data-unique-id="6e545063-2043-488d-a4c8-22f710bc318a" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
            {bookings.map((booking, index) => {
            const cis = CIS_USERS.find(c => c.id === booking.cisId);
            const slot = SLOT_WINDOWS.find(s => s.value === booking.slotWindow);
            return <motion.tr key={booking.id} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: index * 0.05
            }} className="border-t border-glass-border hover:bg-white/5 transition-colors" data-unique-id="30b47f76-4d65-4b50-bee0-51792c602846" data-file-name="components/today-bookings-modal.tsx">
                  <td className="p-4 font-mono text-sm" data-unique-id="14161414-de7c-49ca-ad44-888d9fab0729" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{booking.bookingRef}</td>
                  <td className="p-4" data-unique-id="1fd29e9e-ef3c-4f95-b01f-6072865a6a30" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{cis?.name}</td>
                  <td className="p-4" data-unique-id="1615b2b1-c576-49e6-abd5-3149da828bdf" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{slot?.label}</td>
                  <td className="p-4 capitalize" data-unique-id="e6c605ba-f3b1-4f91-a54c-7a8bfddafacc" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{booking.bookingLocation.replace('_', ' ')}</td>
                  <td className="p-4 capitalize" data-unique-id="97bd0d1e-6739-4431-ab23-1ca9583a119b" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{booking.mode}</td>
                  <td className="p-4" data-unique-id="af93161a-18df-45a3-a21f-fb538c79a1da" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{booking.ownerName}</td>
                  <td className="p-4" data-unique-id="3f4fa8b2-46e7-4035-9d90-8c7dc4a6399a" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">{booking.ownerPhone}</td>
                  <td className="p-4" data-unique-id="295a5e71-9815-4064-b873-6b2116674b7f" data-file-name="components/today-bookings-modal.tsx">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : booking.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} data-unique-id="c918dca1-135f-40b4-8d58-a1ee37926c04" data-file-name="components/today-bookings-modal.tsx" data-dynamic-text="true">
                      {booking.status}
                    </span>
                  </td>
                </motion.tr>;
          })}
          </tbody>
        </table>
        {bookings.length === 0 && <div className="p-8 text-center text-muted-foreground" data-unique-id="5e5c7841-549f-4612-9c83-93bc8633f549" data-file-name="components/today-bookings-modal.tsx"><span className="editable-text" data-unique-id="ad04a7c5-d329-4384-88f3-4761cf15e092" data-file-name="components/today-bookings-modal.tsx">
            No bookings found for this date
          </span></div>}
      </div>
    </div>;
}