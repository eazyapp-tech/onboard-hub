'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ADDON_OPTIONS } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
interface OnboardingModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}
export function OnboardingModal({
  bookingId,
  isOpen,
  onClose
}: OnboardingModalProps) {
  const {
    bookings,
    updateBooking
  } = useAppStore();
  const booking = bookings.find(b => b.id === bookingId);
  const [formData, setFormData] = useState({
    actualOnboardingDate: format(new Date(), 'yyyy-MM-dd'),
    actualOnboardingTime: format(new Date(), 'HH:mm'),
    notes: ''
  });
  const [onboardingAddons, setOnboardingAddons] = useState<Array<{
    type: string;
    price: number;
    notes: string;
  }>>([]);
  const [files, setFiles] = useState<{
    checklist: File | null;
    reviews: File | null;
  }>({
    checklist: null,
    reviews: null
  });
  if (!booking) return null;
  const handleFileChange = (type: 'checklist' | 'reviews', file: File | null) => {
    setFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };
  const addOnboardingAddon = () => {
    setOnboardingAddons([...onboardingAddons, {
      type: '',
      price: 0,
      notes: ''
    }]);
  };
  const removeOnboardingAddon = (index: number) => {
    setOnboardingAddons(onboardingAddons.filter((_, i) => i !== index));
  };
  const updateOnboardingAddon = (index: number, field: string, value: any) => {
    const updated = [...onboardingAddons];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setOnboardingAddons(updated);
  };
  const handleComplete = () => {
    if (!formData.actualOnboardingDate || !formData.actualOnboardingTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateBooking(bookingId, {
      status: 'completed',
      actualOnboardingDate: formData.actualOnboardingDate,
      actualOnboardingTime: formData.actualOnboardingTime,
      notes: formData.notes,
      updatedAt: new Date().toISOString()
    });
    toast.success('Onboarding completed successfully!');
    onClose();
  };
  return <AnimatePresence>
      {isOpen && <>
          <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" data-unique-id="61a39fa8-fea6-4d34-8894-364a8b35af0c" data-file-name="components/onboarding-modal.tsx" />
          <motion.div initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} exit={{
        opacity: 0,
        scale: 0.9
      }} transition={{
        type: 'spring',
        damping: 25,
        stiffness: 200
      }} className="fixed inset-4 glass rounded-2xl z-50 overflow-hidden" data-unique-id="c779a545-69fe-4161-b925-46e12f173dfb" data-file-name="components/onboarding-modal.tsx">
            <div className="flex flex-col h-full" data-unique-id="4d619c50-8522-4999-8784-59c331d67615" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-glass-border" data-unique-id="1301a339-040d-4c33-a9d5-4c627b0080c5" data-file-name="components/onboarding-modal.tsx">
                <div data-unique-id="7479b9b0-eb2d-46a4-90dc-13163519fce2" data-file-name="components/onboarding-modal.tsx">
                  <h2 className="text-2xl font-bold" data-unique-id="f22b26a2-e2cd-448d-a413-e7c198b5db7a" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="26cc1ae7-251b-4e05-bc8c-7126560d6832" data-file-name="components/onboarding-modal.tsx">Start Onboarding</span></h2>
                  <p className="text-muted-foreground" data-unique-id="26937243-601e-484f-b39b-a4a75c1b22c9" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">
                    {booking.bookingRef}<span className="editable-text" data-unique-id="240cf4d7-3f59-45e0-b2a6-084e12c79166" data-file-name="components/onboarding-modal.tsx"> • </span>{booking.ownerName}
                  </p>
                </div>
                <motion.button whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors" data-unique-id="783d0eeb-8935-4db9-8bd3-a8a0df92583f" data-file-name="components/onboarding-modal.tsx">
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6" data-unique-id="1156d107-cc62-47a6-aac0-1dc7dabbf05c" data-file-name="components/onboarding-modal.tsx">
                <div className="max-w-2xl mx-auto space-y-8" data-unique-id="d004f39b-9f8b-4429-9227-bed3e4db0f08" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">
                  {/* Booking Details */}
                  <motion.section initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} className="glass p-6 rounded-xl" data-unique-id="9a0b66c3-1077-4a92-876a-58780260ce12" data-file-name="components/onboarding-modal.tsx">
                    <h3 className="text-lg font-semibold mb-4" data-unique-id="8ebfa0e9-6f3f-415a-9814-200e9efca6fd" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="030233f8-2e21-4d73-a6db-8012c3791e4d" data-file-name="components/onboarding-modal.tsx">Booking Details</span></h3>
                    <div className="grid grid-cols-2 gap-4 text-sm" data-unique-id="144b89b7-5fa2-497c-9c99-6af72a40ac5f" data-file-name="components/onboarding-modal.tsx">
                      <div data-unique-id="926d32d7-77b9-4fe2-8391-8769e2a01d3e" data-file-name="components/onboarding-modal.tsx">
                        <span className="text-muted-foreground" data-unique-id="c4db1904-81f9-409f-9483-2dd65bb70278" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="4e6e8a85-e883-467e-9612-bcf1ccbd749d" data-file-name="components/onboarding-modal.tsx">Owner:</span></span>
                        <p className="font-medium" data-unique-id="1e30db2a-20c3-4990-8891-35799b673e24" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">{booking.ownerName}</p>
                      </div>
                      <div data-unique-id="c477b01c-ad8f-4d89-8974-da91b2ef3d68" data-file-name="components/onboarding-modal.tsx">
                        <span className="text-muted-foreground" data-unique-id="3700e01a-9406-40f2-b6bb-672b662784e9" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="97afad4c-4361-4338-890e-497d7b387d15" data-file-name="components/onboarding-modal.tsx">Phone:</span></span>
                        <p className="font-medium" data-unique-id="dda54c50-7367-417e-9336-62d4154e7757" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">{booking.ownerPhone}</p>
                      </div>
                      <div data-unique-id="8913f8ea-b653-46bc-b9bc-5a729fc56036" data-file-name="components/onboarding-modal.tsx">
                        <span className="text-muted-foreground" data-unique-id="ed1411a2-e374-4dfe-b99f-ca9aa09867ee" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="7b9e3ee2-0641-48b1-9066-277a606a598a" data-file-name="components/onboarding-modal.tsx">Email:</span></span>
                        <p className="font-medium" data-unique-id="0df68ad5-609c-4486-b03b-5a28f2a5a4ce" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">{booking.ownerEmail}</p>
                      </div>
                      <div data-unique-id="10039ab1-7294-47a4-aa63-bd19bb14b23e" data-file-name="components/onboarding-modal.tsx">
                        <span className="text-muted-foreground" data-unique-id="181265bb-48e0-4e58-b279-8b935b724456" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="093c912f-2e9c-4e93-abda-e3dad9d151d6" data-file-name="components/onboarding-modal.tsx">RentOk ID:</span></span>
                        <p className="font-medium" data-unique-id="be2ff0ba-9baa-4293-bf6c-4710ff6b638f" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">{booking.rentokId}</p>
                      </div>
                      <div data-unique-id="0951564f-3983-4c2b-a4bb-980c34807eb6" data-file-name="components/onboarding-modal.tsx">
                        <span className="text-muted-foreground" data-unique-id="84b577e2-43e2-450b-a1c0-049d1984d5df" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="708ad896-c269-4f5e-bc72-24bbc87c4172" data-file-name="components/onboarding-modal.tsx">Properties:</span></span>
                        <p className="font-medium" data-unique-id="fbbd026f-cc95-4697-b977-1bb6092c82f5" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">{booking.noOfProperties}</p>
                      </div>
                      <div data-unique-id="b43a7d45-0b0d-47af-a60a-2d76650eecdc" data-file-name="components/onboarding-modal.tsx">
                        <span className="text-muted-foreground" data-unique-id="df183326-19dd-4099-9125-44ca71d3259d" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="3e888a58-1bde-470a-8d4c-8b6d30709680" data-file-name="components/onboarding-modal.tsx">Beds:</span></span>
                        <p className="font-medium" data-unique-id="c99605a7-c1dc-4def-bc69-23ca3128bd95" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">{booking.noOfBeds}</p>
                      </div>
                    </div>
                  </motion.section>

                  {/* Actual Date & Time */}
                  <motion.section initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.1
              }} className="space-y-4" data-unique-id="790438a9-66e4-46c7-b36d-97a4614c7023" data-file-name="components/onboarding-modal.tsx">
                    <h3 className="text-lg font-semibold" data-unique-id="0d2e455f-b706-432e-a9b9-0283e90f795f" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="95d37194-1b6c-4229-b3f8-1831237f70fa" data-file-name="components/onboarding-modal.tsx">Actual Onboarding Details</span></h3>
                    <div className="grid grid-cols-2 gap-4" data-unique-id="d4a42176-7088-493e-a1ce-379f8ccfe3f8" data-file-name="components/onboarding-modal.tsx">
                      <div data-unique-id="65d15356-678e-4e68-b44c-90aa958def2a" data-file-name="components/onboarding-modal.tsx">
                        <label className="block text-sm font-medium mb-2" data-unique-id="561a8514-32ad-45c6-9227-6196807ed460" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="1ab58032-2731-4cb3-89fd-abd7543546cc" data-file-name="components/onboarding-modal.tsx">Actual Onboarding Date *</span></label>
                        <input type="date" required value={formData.actualOnboardingDate} onChange={e => setFormData({
                      ...formData,
                      actualOnboardingDate: e.target.value
                    })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="1c52a47a-0cb1-46c1-bb43-c186db88df5e" data-file-name="components/onboarding-modal.tsx" />
                      </div>
                      <div data-unique-id="df756fe0-f625-4b3f-a287-d62840a6be07" data-file-name="components/onboarding-modal.tsx">
                        <label className="block text-sm font-medium mb-2" data-unique-id="e4a6aea2-6d1a-4709-bc15-aeff76fe4cc9" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="ea04a580-510d-4c74-9f5c-caf75c7424ae" data-file-name="components/onboarding-modal.tsx">Actual Onboarding Time *</span></label>
                        <input type="time" required value={formData.actualOnboardingTime} onChange={e => setFormData({
                      ...formData,
                      actualOnboardingTime: e.target.value
                    })} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="5da545ac-bdaa-411d-b804-829d901cb63a" data-file-name="components/onboarding-modal.tsx" />
                      </div>
                    </div>
                  </motion.section>

                  {/* File Uploads */}
                  <motion.section initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.2
              }} className="space-y-4" data-unique-id="5985dd2d-848c-4d2a-9078-adc0570c6eee" data-file-name="components/onboarding-modal.tsx">
                    <h3 className="text-lg font-semibold" data-unique-id="b2f5dda2-b418-4c70-8b59-09cdaa0833c0" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="5785568c-d922-49b5-92dd-09efed8f45c9" data-file-name="components/onboarding-modal.tsx">File Uploads</span></h3>
                    <div className="grid grid-cols-2 gap-4" data-unique-id="757a7539-8e0d-41ba-9af9-eddb9fd6161a" data-file-name="components/onboarding-modal.tsx">
                      <div data-unique-id="6342604d-2273-4ca5-8e84-9e6a7765b012" data-file-name="components/onboarding-modal.tsx">
                        <label className="block text-sm font-medium mb-2" data-unique-id="398a7938-5154-415e-9ac6-158278163626" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="2b35db04-5b14-4813-9d01-ab4921a3a077" data-file-name="components/onboarding-modal.tsx">Record Checklist</span></label>
                        <div className="glass p-4 rounded-lg border-2 border-dashed border-glass-border hover:border-blue-400 transition-colors" data-unique-id="7c45aac2-ef0e-4814-b9a8-cb5434fc06c6" data-file-name="components/onboarding-modal.tsx">
                          <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange('checklist', e.target.files?.[0] || null)} className="hidden" id="checklist-upload" data-unique-id="e47a5c7b-eafa-4d84-bff1-d38743edc89d" data-file-name="components/onboarding-modal.tsx" />
                          <label htmlFor="checklist-upload" className="flex flex-col items-center gap-2 cursor-pointer" data-unique-id="33c9cc22-1322-43cf-a203-e70825137e0b" data-file-name="components/onboarding-modal.tsx">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground" data-unique-id="db0f5cbf-a7e6-4816-9809-7355d640e445" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">
                              {files.checklist ? files.checklist.name : 'Upload checklist (Image/PDF)'}
                            </span>
                          </label>
                        </div>
                      </div>
                      <div data-unique-id="2811dac1-6616-48f3-b5b2-61e96cf19973" data-file-name="components/onboarding-modal.tsx">
                        <label className="block text-sm font-medium mb-2" data-unique-id="1ff73cba-c004-4870-ae31-f66a56471c88" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="054b8068-86c5-480e-af60-6b8676979bfa" data-file-name="components/onboarding-modal.tsx">Record Reviews</span></label>
                        <div className="glass p-4 rounded-lg border-2 border-dashed border-glass-border hover:border-blue-400 transition-colors" data-unique-id="c3e73529-5947-47d8-b7b4-72a81397fa4c" data-file-name="components/onboarding-modal.tsx">
                          <input type="file" accept="image/*,.pdf" onChange={e => handleFileChange('reviews', e.target.files?.[0] || null)} className="hidden" id="reviews-upload" data-unique-id="3c349b93-c317-49b5-9b2d-3fbd137912b4" data-file-name="components/onboarding-modal.tsx" />
                          <label htmlFor="reviews-upload" className="flex flex-col items-center gap-2 cursor-pointer" data-unique-id="66ea2067-98dd-4475-8d1f-b68265bc4428" data-file-name="components/onboarding-modal.tsx">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground" data-unique-id="57125b49-3a6d-41ca-96c1-d62e242f4432" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">
                              {files.reviews ? files.reviews.name : 'Upload reviews (Image/PDF)'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </motion.section>

                  {/* Add-ons sold at onboarding */}
                  <motion.section initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.3
              }} className="space-y-4" data-unique-id="568d9fb8-74c6-4297-9964-23f8290dddfa" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">
                    <div className="flex items-center justify-between" data-unique-id="2cbc1a47-1791-495d-ac59-cedaa06585c8" data-file-name="components/onboarding-modal.tsx">
                      <h3 className="text-lg font-semibold" data-unique-id="2e6f5946-a98b-42f9-b3eb-a77583bda85a" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="17c071fe-7795-4fc7-80f6-4e32e9bf1830" data-file-name="components/onboarding-modal.tsx">Add-ons sold at onboarding (Optional)</span></h3>
                      <motion.button type="button" whileHover={{
                    scale: 1.05
                  }} whileTap={{
                    scale: 0.95
                  }} onClick={addOnboardingAddon} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors" data-unique-id="d8f2a019-df40-4547-b6a0-8f1d913177b7" data-file-name="components/onboarding-modal.tsx">
                        <Plus className="w-4 h-4" /><span className="editable-text" data-unique-id="ca30fe14-ff73-4cc4-a16a-bb0824035b5b" data-file-name="components/onboarding-modal.tsx">
                        Add Add-on
                      </span></motion.button>
                    </div>
                    
                    {onboardingAddons.map((addon, index) => <motion.div key={index} initial={{
                  opacity: 0,
                  y: 10
                }} animate={{
                  opacity: 1,
                  y: 0
                }} className="grid grid-cols-4 gap-4 p-4 glass rounded-lg" data-unique-id="41c08dd4-ec55-4152-b969-318e4455b56b" data-file-name="components/onboarding-modal.tsx">
                        <select value={addon.type} onChange={e => updateOnboardingAddon(index, 'type', e.target.value)} className="p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="f2f77e8a-a69a-4625-a352-059cf76726c9" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">
                          <option value="" data-unique-id="74c6ba9f-07fc-492b-a26d-9b81a1c72c97" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="c50e674b-7349-4f69-ae35-328cd2a3a015" data-file-name="components/onboarding-modal.tsx">Select Add-on</span></option>
                          {ADDON_OPTIONS.map(option => <option key={option.value} value={option.value} data-unique-id="79419dec-4569-43be-93f8-8d1834c0b2d2" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true">{option.label}</option>)}
                        </select>
                        <input type="number" placeholder="Price" min="0" step="0.01" value={addon.price} onChange={e => updateOnboardingAddon(index, 'price', parseFloat(e.target.value))} className="p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="56f4f1c7-edc5-4835-98cf-fec0f089cae6" data-file-name="components/onboarding-modal.tsx" />
                        <input type="text" placeholder="Notes (optional)" value={addon.notes} onChange={e => updateOnboardingAddon(index, 'notes', e.target.value)} className="p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent" data-unique-id="158519e5-69b7-4033-91d2-4eba2ed729be" data-file-name="components/onboarding-modal.tsx" />
                        <motion.button type="button" whileHover={{
                    scale: 1.05
                  }} whileTap={{
                    scale: 0.95
                  }} onClick={() => removeOnboardingAddon(index)} className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-unique-id="cdf64da7-8c0a-4834-8f24-aca9b7fb106d" data-file-name="components/onboarding-modal.tsx">
                          <Trash2 className="w-4 h-4" data-unique-id="2bb1e376-aa74-4f41-a33e-5407fb5aafbe" data-file-name="components/onboarding-modal.tsx" data-dynamic-text="true" />
                        </motion.button>
                      </motion.div>)}
                  </motion.section>

                  {/* Notes */}
                  <motion.section initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.4
              }} className="space-y-4" data-unique-id="58a23451-ade3-47a9-9d5c-d889caed7073" data-file-name="components/onboarding-modal.tsx">
                    <h3 className="text-lg font-semibold" data-unique-id="ffd4c628-0c83-4add-9d12-91287962747c" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="3172cc4b-a050-47d8-b8b9-8cdf65b19dc1" data-file-name="components/onboarding-modal.tsx">Notes</span></h3>
                    <textarea value={formData.notes} onChange={e => setFormData({
                  ...formData,
                  notes: e.target.value
                })} placeholder="Add any additional notes about the onboarding session..." rows={4} className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" data-unique-id="14faed8b-3870-4d2c-ba85-efcedcb96f82" data-file-name="components/onboarding-modal.tsx" />
                  </motion.section>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-glass-border" data-unique-id="bb6e390c-6f42-4728-b007-1d7f0ddc8bff" data-file-name="components/onboarding-modal.tsx">
                <div className="flex justify-end gap-4" data-unique-id="684ec584-f89e-4d5e-b02e-eb7437ec5161" data-file-name="components/onboarding-modal.tsx">
                  <motion.button whileHover={{
                scale: 1.05
              }} whileTap={{
                scale: 0.95
              }} onClick={onClose} className="px-6 py-3 rounded-lg border border-glass-border hover:bg-white/10 transition-colors" data-unique-id="43af9ec7-fb2a-401c-b119-21ab272591d6" data-file-name="components/onboarding-modal.tsx"><span className="editable-text" data-unique-id="5cd18538-654d-4c44-96e1-e8ba0bcee5e4" data-file-name="components/onboarding-modal.tsx">
                    Cancel
                  </span></motion.button>
                  <motion.button whileHover={{
                scale: 1.05
              }} whileTap={{
                scale: 0.95
              }} onClick={handleComplete} className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-lg hover:shadow-lg transition-shadow" data-unique-id="bbffde0d-f1d2-49a5-8a0a-c4339faab7d0" data-file-name="components/onboarding-modal.tsx">
                    <CheckCircle className="w-5 h-5" /><span className="editable-text" data-unique-id="15a2a1c0-3731-4352-9abd-c0a21e373d91" data-file-name="components/onboarding-modal.tsx">
                    Onboarding Completed
                  </span></motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>}
    </AnimatePresence>;
}