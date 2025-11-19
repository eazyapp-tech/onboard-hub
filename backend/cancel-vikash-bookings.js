// One-time script to cancel all old bookings and calendar events for Vikash
require('dotenv').config();
const mongoose = require('mongoose');
const { google } = require('googleapis');
const fs = require('fs');

const GOOGLE_KEYFILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS_PATH;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'test';

// CIS Users
const CIS_USERS = [
  { id: 'manish-arora', name: 'Manish Arora', email: 'manish.arora@eazyapp.tech' },
  { id: 'harsh-tulsyan', name: 'Harsh Tulsyan', email: 'harsh@eazyapp.tech' },
  { id: 'vikash-jarwal', name: 'Vikash Jarwal', email: 'vikash.b@eazyapp.tech' },
  { id: 'jyoti-kalra', name: 'Jyoti Kalra', email: 'jyoti@eazyapp.tech' },
  { id: 'megha-verma', name: 'Megha Verma', email: 'megha@eazyapp.tech' },
  { id: 'aditya-shrivastav', name: 'Aditya Shrivastav', email: 'aditya@eazyapp.tech' },
  { id: 'chandan-mishra', name: 'Chandan Mishra', email: 'chandan.m@eazyapp.tech' }
];

// Schemas
const OnboardingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  city: String,
  budget: Number,
  propertyId: String,
  propertyName: String,
  moveInDate: Date,
  source: String,
  preferences: String,
  notes: String,
  sheetSynced: Boolean,
  status: String,
  cisId: String,
  portfolioManager: String,
  subscriptionStartDate: String,
  subscriptionSummary: String,
  noOfProperties: Number,
  noOfBeds: Number,
  subscriptionType: String,
  soldPricePerBed: Number,
  monthsBilled: Number,
  freeMonths: Number,
  bookingLocation: String,
  mode: String,
  slotWindow: String,
  date: String,
  createdBy: String,
  totalAmount: Number,
  calendarEventId: String,
  statusHistory: Array,
  attachmentUrl: String,
  actualOnboardingDate: String,
  actualOnboardingTime: String,
  onboardingAddons: Array,
  attachmentUrls: Object,
  cancellationReason: String,
  cancellationRemarks: String,
  cancelledAt: String,
  cancelledBy: String,
}, { timestamps: true });

const BookingSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  propertyId: String,
  propertyName: String,
  startTime: Date,
  endTime: Date,
  summary: String,
  description: String,
  attendees: Array,
  location: String,
  calendarEventId: String,
  sheetSynced: Boolean,
  status: String,
}, { timestamps: true });

async function main() {
  try {
    if (!MONGO_URL) {
      console.error('❌ MONGO_URL is missing from .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB');

    const Onboarding = mongoose.model('Onboarding', OnboardingSchema);
    const Booking = mongoose.model('Booking', BookingSchema);

    const vikashId = 'vikash-jarwal';
    const vikashEmail = 'vikash.b@eazyapp.tech';

    // Find all non-cancelled Onboarding records for Vikash
    const onboardings = await Onboarding.find({
      cisId: vikashId,
      status: { $ne: 'cancelled' }
    });

    // Also find Booking records for Vikash that might have calendar events
    const bookings = await Booking.find({
      'attendees.email': vikashEmail,
      status: { $ne: 'cancelled' }
    });

    console.log(`\nFound ${onboardings.length} non-cancelled onboarding(s) for Vikash`);
    console.log(`Found ${bookings.length} non-cancelled booking(s) for Vikash`);

    if (onboardings.length === 0 && bookings.length === 0) {
      console.log('No onboardings or bookings to cancel. Exiting.');
      await mongoose.disconnect();
      return;
    }

    // Setup Google Calendar auth
    let authConfig;
    if (GOOGLE_KEYFILE.startsWith('{')) {
      const credentials = JSON.parse(GOOGLE_KEYFILE);
      const tempKeyFile = '/tmp/google-credentials-vikash-cancel.json';
      fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
      authConfig = {
        keyFile: tempKeyFile,
        scopes: ['https://www.googleapis.com/auth/calendar'],
        subject: vikashEmail,
      };
    } else {
      authConfig = {
        keyFile: GOOGLE_KEYFILE,
        scopes: ['https://www.googleapis.com/auth/calendar'],
        subject: vikashEmail,
      };
    }

    const auth = new google.auth.JWT(authConfig);
    await auth.authorize();
    const calendarClient = google.calendar({ version: 'v3', auth });

    let cancelledCount = 0;
    let calendarDeletedCount = 0;
    let bookingCancelledCount = 0;

    // First, process Booking records that might have calendar events
    console.log('\n=== Processing Booking Records ===');
    for (const booking of bookings) {
      if (booking.calendarEventId) {
        console.log(`\n--- Processing Booking: ${booking.fullName} (${booking._id}) ---`);
        console.log(`Calendar Event ID: ${booking.calendarEventId}`);
        console.log(`Start Time: ${booking.startTime}`);
        
        try {
          await calendarClient.events.delete({
            calendarId: 'primary',
            eventId: booking.calendarEventId,
            sendUpdates: 'all',
          });
          console.log(`✅ Calendar event deleted: ${booking.calendarEventId}`);
          calendarDeletedCount++;
          
          booking.status = 'cancelled';
          await booking.save();
          console.log(`✅ Booking record marked as cancelled`);
          bookingCancelledCount++;
        } catch (calendarError) {
          console.error(`❌ Failed to delete calendar event ${booking.calendarEventId}:`, calendarError.message);
        }
      }
    }

    // Then process Onboarding records
    console.log('\n=== Processing Onboarding Records ===');
    for (const onboarding of onboardings) {
      console.log(`\n--- Processing: ${onboarding.name} (${onboarding._id}) ---`);
      console.log(`Status: ${onboarding.status}`);
      console.log(`Calendar Event ID: ${onboarding.calendarEventId || 'N/A'}`);
      console.log(`Date: ${onboarding.date || 'N/A'}`);

      // Delete calendar event if exists
      if (onboarding.calendarEventId) {
        try {
          await calendarClient.events.delete({
            calendarId: 'primary',
            eventId: onboarding.calendarEventId,
            sendUpdates: 'all',
          });
          console.log(`✅ Calendar event deleted: ${onboarding.calendarEventId}`);
          calendarDeletedCount++;

          // Mark corresponding Booking as cancelled
          const booking = await Booking.findOneAndUpdate(
            { calendarEventId: onboarding.calendarEventId },
            { status: 'cancelled' },
            { new: true }
          );
          if (booking) {
            console.log(`✅ Booking record marked as cancelled: ${booking._id}`);
            bookingCancelledCount++;
          }
        } catch (calendarError) {
          console.error(`❌ Failed to delete calendar event ${onboarding.calendarEventId}:`, calendarError.message);
        }
      }

      // Mark Onboarding as cancelled
      onboarding.status = 'cancelled';
      onboarding.cancelledAt = new Date().toISOString();
      onboarding.cancelledBy = 'System (Manual Cleanup)';
      onboarding.cancellationReason = 'Manual cleanup of old bookings';
      
      if (!onboarding.statusHistory) {
        onboarding.statusHistory = [];
      }
      onboarding.statusHistory.push({
        status: 'Cancelled',
        at: new Date(),
        note: 'Manual cleanup of old bookings'
      });

      await onboarding.save();
      console.log(`✅ Onboarding marked as cancelled`);
      cancelledCount++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total onboardings processed: ${onboardings.length}`);
    console.log(`Onboardings cancelled: ${cancelledCount}`);
    console.log(`Calendar events deleted: ${calendarDeletedCount}`);
    console.log(`Booking records cancelled: ${bookingCancelledCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Done! Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

