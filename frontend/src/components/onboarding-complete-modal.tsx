'use client';

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, FileUp, Plus, Trash2, UploadCloud, X, CheckCircle } from "lucide-react";
import { toast } from 'sonner';

/**
 * Onboarding Complete Module
 * -----------------------------------------------------------------
 * Modal for completing onboarding sessions with file uploads and add-ons
 */

// ---------------------- Types ----------------------
export type BookingDetails = {
  ownerName: string;
  email: string;
  phone: string;
  rentOkId: string;
  propertiesCount: number;
  bedsCount: number;
  location?: string;
};

export type AddOn = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type OnboardingPayload = {
  booking: BookingDetails;
  completedAt: string; // ISO string
  attachments: { checklist?: File[]; reviews?: File[] };
  addons: AddOn[];
  notes?: string;
  draft?: boolean;
};

// ---------------------- Helpers ----------------------
const safeUUID = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Converts a Date + human time string ("07:12 PM" or "19:12") to ISO string. */
export const toIsoFromDateAndTime = (date: Date, time: string) => {
  let h = 0, m = 0;
  const ampm = time.trim().toUpperCase().match(/AM|PM/);
  if (ampm) {
    const [hh, mm] = time.replace(/\s?(AM|PM)/i, "").split(":").map(Number);
    h = (hh % 12) + (ampm[0] === "PM" ? 12 : 0);
    m = mm || 0;
  } else {
    const [hh, mm] = time.split(":").map(Number);
    h = hh || 0; m = mm || 0;
  }
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const formatINR = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const addonsSubtotal = (addons: AddOn[]) => addons.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);

// ---------------------- Component ----------------------
export type OnboardingCompleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetails;
  defaultDate?: Date;
  defaultTime?: string; // e.g. "07:12 PM"
  onSubmit: (payload: OnboardingPayload) => Promise<void> | void;
  loading?: boolean;
};

export default function OnboardingCompleteModal({ 
  isOpen, 
  onClose, 
  booking, 
  onSubmit, 
  loading, 
  defaultDate, 
  defaultTime 
}: OnboardingCompleteModalProps) {
  const [date, setDate] = useState<string>(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState<string>(defaultTime ?? format(new Date(), "HH:mm"));
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<File[]>([]);
  const [reviews, setReviews] = useState<File[]>([]);

  const addonsTotal = useMemo(() => addonsSubtotal(addons), [addons]);

  const handleFileChange = (type: 'checklist' | 'reviews', files: FileList | null) => {
    if (!files) return;
    const allowed = Array.from(files).filter((f) => /pdf|image\//.test(f.type));
    const setter = type === "checklist" ? setChecklist : setReviews;
    setter((prev) => [...prev, ...allowed]);
  };

  const removeFile = (type: "checklist" | "reviews", idx: number) => {
    const setter = type === "checklist" ? setChecklist : setReviews;
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAddon = () => setAddons((prev) => [...prev, { id: safeUUID(), name: "", quantity: 1, unitPrice: 0 }]);
  
  const updateAddon = (id: string, patch: Partial<AddOn>) => 
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  
  const deleteAddon = (id: string) => setAddons((prev) => prev.filter((a) => a.id !== id));

  const submit = async (asDraft = false) => {
    if (!date || !time) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const completedDate = new Date(date + 'T' + time);
      const payload = {
        booking,
        completedAt: completedDate.toISOString(),
        attachments: { checklist, reviews },
        addons,
        notes,
        draft: asDraft,
      };
      
      console.log('[ONBOARDING-COMPLETE] Submitting payload:', {
        completedAt: payload.completedAt,
        addonsCount: addons.length,
        addons: addons,
        checklistCount: checklist.length,
        reviewsCount: reviews.length,
        notes: notes,
      });
      
      await onSubmit(payload);
      toast.success(asDraft ? "Draft saved" : "Onboarding completed successfully!");
      onClose();
    } catch (e: any) {
      console.error('[ONBOARDING-COMPLETE] Submit error:', e);
      toast.error(e?.message ?? "Failed to save onboarding");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 glass rounded-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div>
                  <h2 className="text-2xl font-bold">Complete Onboarding</h2>
                  <p className="text-muted-foreground">{booking.ownerName} • {booking.rentOkId}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                  
                  {/* Booking Summary */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-6 rounded-xl"
                  >
                    <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <SummaryItem label="Owner" value={booking.ownerName} />
                      <SummaryItem label="Phone" value={booking.phone} />
                      <SummaryItem label="Email" value={booking.email} />
                      <SummaryItem label="RentOk ID" value={booking.rentOkId} />
                      <SummaryItem label="Properties" value={String(booking.propertiesCount)} />
                      <SummaryItem label="Beds" value={String(booking.bedsCount)} />
                      {booking.location && <SummaryItem label="Location" value={booking.location} />}
                    </div>
                  </motion.section>

                  {/* Actual Onboarding Details */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">Actual Onboarding Details</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Actual Onboarding Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full pl-9 p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Actual Onboarding Time <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 pointer-events-none" />
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                            className="w-full pl-9 p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
                            style={{ colorScheme: 'light' }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.section>

                  {/* File Uploads */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">File Uploads</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <DropZone 
                        title="Record Checklist" 
                        onFiles={(fl) => handleFileChange('checklist', fl)}
                      >
                        <FileList files={checklist} onRemove={(i) => removeFile("checklist", i)} />
                      </DropZone>
                      <DropZone 
                        title="Record Reviews" 
                        onFiles={(fl) => handleFileChange('reviews', fl)}
                      >
                        <FileList files={reviews} onRemove={(i) => removeFile("reviews", i)} />
                      </DropZone>
                    </div>
                  </motion.section>

                  {/* Add-ons */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Add‑ons sold at onboarding (Optional)</h3>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={addAddon}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Add‑on
                      </motion.button>
                    </div>
                    
                    <div className="glass rounded-xl overflow-hidden">
                      {addons.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          No add‑ons yet. Click "Add Add‑on" to get started.
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-12 gap-3 p-3 text-xs font-medium text-muted-foreground border-b border-glass-border">
                            <div className="col-span-5">Name</div>
                            <div className="col-span-2">Qty</div>
                            <div className="col-span-2">Unit Price</div>
                            <div className="col-span-2">Line Total</div>
                            <div className="col-span-1"></div>
                          </div>
                          
                          {addons.map((addon) => (
                            <div key={addon.id} className="grid grid-cols-12 gap-3 p-3 items-center border-b border-glass-border last:border-0">
                              <div className="col-span-5">
                                <input
                                  type="text"
                                  value={addon.name}
                                  onChange={(e) => updateAddon(addon.id, { name: e.target.value })}
                                  placeholder="e.g., Smart KYC"
                                  className="w-full p-2 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={addon.quantity}
                                  onChange={(e) => updateAddon(addon.id, { quantity: Number(e.target.value) })}
                                  className="w-full p-2 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={addon.unitPrice || ''}
                                  onChange={(e) => updateAddon(addon.id, { unitPrice: Number(e.target.value) || 0 })}
                                  placeholder="₹ 0"
                                  className="w-full p-2 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="col-span-2 text-sm font-medium">
                                {addon.unitPrice > 0 || addon.quantity > 1 ? formatINR(addon.quantity * addon.unitPrice) : '₹ 0'}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => deleteAddon(addon.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  aria-label={`Remove ${addon.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              </div>
                            </div>
                          ))}
                          
                          <div className="flex items-center justify-end gap-6 p-4 border-t border-glass-border bg-muted/20">
                            <div className="font-medium">Subtotal</div>
                            <div className="text-lg font-semibold">{formatINR(addonsTotal)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.section>

                  {/* Notes */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                  >
                    <h3 className="text-lg font-semibold">Notes</h3>
                    <textarea
                      placeholder="Add any additional notes about the onboarding session..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full p-3 rounded-lg glass border border-glass-border focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </motion.section>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-glass-border">
                <div className="flex justify-end gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="px-6 py-3 rounded-lg border border-glass-border hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => submit(true)}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg border border-glass-border hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Save Draft
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => submit(false)}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {loading ? "Saving..." : "Complete Onboarding"}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------- Subcomponents ----------------------
function SummaryItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium leading-6 break-words">{value ?? "—"}</div>
    </div>
  );
}

// DropZone with Drag‑n‑Drop + click to upload
function DropZone({ 
  title, 
  onFiles, 
  children 
}: { 
  title: string; 
  onFiles: (files: FileList | null) => void; 
  children?: React.ReactNode; 
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => { 
    e.preventDefault(); 
    setIsOver(false); 
    onFiles(e.dataTransfer?.files ?? null); 
  };
  
  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }} 
      onDragLeave={() => setIsOver(false)} 
      onDrop={onDrop} 
      className={`glass rounded-lg p-4 border-2 border-dashed transition ${
        isOver ? "border-blue-400 bg-blue-50/5" : "border-glass-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <UploadCloud className="h-5 w-5 opacity-70" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            Drag & drop files here, or click to browse (PDF or images)
          </div>
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <FileUp className="h-4 w-4" />
              Choose files
            </motion.button>
            <input 
              ref={inputRef} 
              type="file" 
              accept="application/pdf,image/*" 
              multiple 
              className="hidden" 
              onChange={(e) => onFiles(e.target.files)} 
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function FileList({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  if (!files?.length) return null;
  
  return (
    <div className="mt-3 grid gap-2">
      {files.map((f, i) => (
        <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg glass px-3 py-2 border border-glass-border">
          <div className="truncate text-sm">
            <span className="font-medium">{f.name}</span>{' '}
            <span className="text-muted-foreground text-xs">({Math.round(f.size / 1024)} KB)</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onRemove(i)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label={`Remove ${f.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        </div>
      ))}
    </div>
  );
}

// ---------------------- Test hooks & examples ----------------------
export const _internal = { toIsoFromDateAndTime, formatINR, addonsSubtotal };

/** Usage Example:
<OnboardingCompleteModal
  isOpen={open}
  onClose={() => setOpen(false)}
  booking={{ 
    ownerName: "John Doe", 
    email: "john@example.com", 
    phone: "+91 9289382808", 
    rentOkId: "RO-12345", 
    propertiesCount: 1, 
    bedsCount: 2, 
    location: "Gurugram, HR" 
  }}
  onSubmit={async (payload) => { 
    console.log('Onboarding completed:', payload); 
    // Send to backend API
  }}
/>
*/
