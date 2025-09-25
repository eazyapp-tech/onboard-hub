console.log('>>> RUNNING server.js FROM:', __dirname);
// 1) Load .env first
require('dotenv').config();
console.log('ENV KEY:', process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS_PATH);


// 2) Imports
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { google } = require('googleapis');
const dayjs = require('dayjs');
const { z } = require('zod');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 3) Basic app setup
const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

// simple local uploads (dev)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const upload = multer({ dest: uploadsDir });

// 4) Middlewares
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  })
);

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5) Health route
app.get('/health', (_req, res) => {
  res.json({ ok: true, env: NODE_ENV });
});

// Root route
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Onboarding Hub Backend API', 
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health',
      'GET /api/onboarding',
      'POST /api/onboarding',
      'GET /api/bookings',
      'POST /api/bookings',
      'GET /api/freebusy',
      'GET /api/onboarding/cis/:cisId',
      'PATCH /api/onboarding/:id/status',
      'POST /api/onboarding/:id/attachment',
      'PATCH /api/onboarding/:id'
    ]
  });
});

// 6) MongoDB connect
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'test';

if (!MONGO_URL) {
  console.warn('[WARN] MONGO_URL is missing from .env');
}
mongoose
  .connect(MONGO_URL, { dbName: DB_NAME })
  .then(() => console.log('[DB] Connected'))
  .catch((err) => {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  });

// 7) Models
const OnboardingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
    sheetSynced: { type: Boolean, default: false },
    status: { type: String, default: 'Onboarding Started' },
    cisId: String,
    statusHistory: [{
      status: String,
      at: Date,
      note: String,
      attachmentUrl: String
    }],
    attachmentUrl: String,
  },
  { timestamps: true }
);

const BookingSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: String,
    phone: String,
    propertyId: String,
    propertyName: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    summary: String,
    description: String,
    attendees: [{ email: String, displayName: String }],
    location: String,
    calendarEventId: String,
    sheetSynced: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Onboarding = mongoose.model('Onboarding', OnboardingSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// 8) Google clients (Sheets + Calendar)
const GOOGLE_KEYFILE =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.GOOGLE_SHEET_CREDENTIALS_PATH;
const DEALS_SHEET_ID = process.env.DEALS_SHEET_ID;
const BOOKINGS_SHEET_ID = process.env.BOOKINGS_SHEET_ID;
const SHEET_TAB_NAME = process.env.SHEET_TAB_NAME || 'Sheet1';
const CALENDAR_ID = process.env.CALENDAR_ID;

let sheetsClient, calendarClient;

// ---- Google (Sheets + Calendar) with Domain-Wide Delegation ----

async function initGoogle() {
  try {
    const subject = process.env.GSUITE_IMPERSONATE_USER;
    if (!GOOGLE_KEYFILE) throw new Error('GOOGLE_APPLICATION_CREDENTIALS (or GOOGLE_SHEET_CREDENTIALS_PATH) not set');
    if (!subject) throw new Error('GSUITE_IMPERSONATE_USER not set');

    // ⬇️ key change: use JWT + subject (impersonation), not GoogleAuth
    let authConfig;
    
    // Check if GOOGLE_KEYFILE is a JSON string (for Render) or file path (for local)
    if (GOOGLE_KEYFILE.startsWith('{')) {
      // It's a JSON string (Render environment) - write to temp file
      const credentials = JSON.parse(GOOGLE_KEYFILE);
      const tempKeyFile = '/tmp/google-credentials.json';
      fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
      authConfig = {
        keyFile: tempKeyFile,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar',
        ],
        subject, // act as this real Workspace user
      };
    } else {
      // It's a file path (local environment)
      authConfig = {
        keyFile: GOOGLE_KEYFILE,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar',
        ],
        subject, // act as this real Workspace user
      };
    }
    
    const auth = new google.auth.JWT(authConfig);

    await auth.authorize(); // verify now

    sheetsClient = google.sheets({ version: 'v4', auth });
    calendarClient = google.calendar({ version: 'v3', auth });

    console.log('[Google] DWD ready as', subject);
  } catch (e) {
    console.error('[Google] Init error:', e.message);
  }
}
initGoogle();

// 9) Validation
const onboardingZ = z.object({
  name: z.string().min(1, 'name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  budget: z.coerce.number().optional(),
  propertyId: z.string().optional(),
  propertyName: z.string().optional(),
  moveInDate: z.string().optional(), // allow "YYYY-MM-DD"
  source: z.string().optional(),
  preferences: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  cisId: z.string().optional(),
  statusHistory: z.array(z.object({
    status: z.string(),
    at: z.string(),
    note: z.string().optional(),
    attachmentUrl: z.string().optional()
  })).optional(),
  attachmentUrl: z.string().optional(),
});

const bookingZ = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  propertyId: z.string().optional(),
  propertyName: z.string().optional(),
  startTime: z.string().min(1), // ISO string "2025-10-06T15:00:00+05:30"
  endTime: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  attendees: z
    .array(z.object({ email: z.string().email(), displayName: z.string().optional() }))
    .optional(),
  location: z.string().optional(),
  cisEmail: z.string().email('cisEmail must be a valid email'), // CIS user to impersonate
});

// 10) Helpers
async function appendToSheet({ spreadsheetId, values }) {
  if (!sheetsClient) throw new Error('Sheets client not ready');
  if (!spreadsheetId) throw new Error('Spreadsheet ID missing');
  return sheetsClient.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TAB_NAME}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

async function createCalendarEvent(payload) {
    const cisEmail = payload.cisEmail;
    if (!cisEmail) throw new Error('cisEmail is required for impersonation');
  
    // Create dynamic auth for this specific CIS user
    let authConfig;
    
    // Check if GOOGLE_KEYFILE is a JSON string (for Render) or file path (for local)
    if (GOOGLE_KEYFILE.startsWith('{')) {
      // It's a JSON string (Render environment) - write to temp file
      const credentials = JSON.parse(GOOGLE_KEYFILE);
      const tempKeyFile = '/tmp/google-credentials-calendar.json';
      fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
      authConfig = {
        keyFile: tempKeyFile,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar',
        ],
        clientOptions: { subject: cisEmail }, // impersonate THIS user only
      };
    } else {
      // It's a file path (local environment)
      authConfig = {
        keyFile: GOOGLE_KEYFILE,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar',
        ],
        clientOptions: { subject: cisEmail }, // impersonate THIS user only
      };
    }
    
    const auth = new google.auth.GoogleAuth(authConfig);

    // Create calendar client with dynamic auth
    const dynamicCalendarClient = google.calendar({ version: 'v3', auth });
  
    const calendarId = process.env.CALENDAR_ID || 'primary';
  
    const event = {
      summary: payload.summary || `Visit/Call with ${payload.fullName}`,
      description: payload.description || '',
      start: { dateTime: payload.startTime, timeZone: TIMEZONE },
      end: { dateTime: payload.endTime, timeZone: TIMEZONE },
      location: payload.location || '',
      attendees: [
        ...(payload.attendees || []).map(a => ({ email: a.email, displayName: a.displayName })),
        ...(payload.email ? [{ email: payload.email, displayName: payload.fullName }] : []),
      ],
    };
  
    const { data } = await dynamicCalendarClient.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'all', // invitations are sent by the impersonated user
    });
  
    return data; // contains id, htmlLink, etc.
  }
// 11) Routes

// Create onboarding: save to Mongo + append to Deals sheet
app.post('/api/onboarding', async (req, res, next) => {
  try {
    const parsed = onboardingZ.parse(req.body);

    const doc = await Onboarding.create({
      ...parsed,
      moveInDate: parsed.moveInDate ? new Date(parsed.moveInDate) : undefined,
      statusHistory: parsed.statusHistory ? parsed.statusHistory.map(item => ({
        ...item,
        at: new Date(item.at)
      })) : undefined,
    });

    // Append to Deals sheet with comprehensive booking details
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    // Format slot window for display
    const formatSlotWindow = (slotWindow) => {
      switch (slotWindow) {
        case '10_13': return '10 AM - 1 PM';
        case '14_17': return '2 PM - 5 PM';
        case '18_19': return '6 PM - 7 PM';
        default: return slotWindow;
      }
    };

    // Format location for display
    const formatLocation = (location) => {
      return location.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const values = [
      now, // Timestamp
      doc._id.toString(), // Onboarding ID
      doc.name || '', // Owner Name
      doc.phone || '', // Phone
      doc.email || '', // Email
      doc.city || '', // City/Location
      doc.budget || 0, // Budget/Total Amount
      doc.propertyId || '', // Property ID/RentOk ID
      doc.propertyName || '', // Property Name
      parsed.portfolioManager || '', // Portfolio Manager
      parsed.subscriptionStartDate || '', // Subscription Start Date
      parsed.subscriptionSummary || '', // Subscription Summary
      parsed.noOfProperties || 0, // Number of Properties
      parsed.noOfBeds || 0, // Number of Beds
      parsed.subscriptionType || 'Base', // Subscription Type
      parsed.soldPricePerBed || 0, // Price Per Bed
      parsed.monthsBilled || 0, // Months Billed
      parsed.freeMonths || 0, // Free Months
      formatLocation(parsed.bookingLocation || ''), // Booking Location
      parsed.mode || 'physical', // Mode (Physical/Virtual)
      parsed.cisId || '', // CIS ID
      formatSlotWindow(parsed.slotWindow || ''), // Slot Window
      parsed.date || '', // Booking Date
      parsed.status || 'scheduled', // Status
      doc.status || 'Onboarding Started', // Onboarding Status
      parsed.bookingRef || '', // Booking Reference
      '', // Calendar Event ID (will be updated when calendar event is created)
      parsed.createdBy || '', // Created By
      doc.source || 'Onboarding Booking Form', // Source
      doc.preferences || '', // Preferences
      doc.notes || '', // Notes
      doc.moveInDate ? dayjs(doc.moveInDate).format('YYYY-MM-DD') : '', // Move In Date
      doc.attachmentUrl || '', // Attachment URL
      doc.cisId || parsed.cisId || '' // CIS ID (duplicate for compatibility)
    ];

    try {
      await appendToSheet({ spreadsheetId: DEALS_SHEET_ID, values });
      doc.sheetSynced = true;
      await doc.save();
    } catch (e) {
      console.error('[Sheets] Append failed:', e.message);
    }

    res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Invalid payload', details: err.flatten() });
    }
    next(err);
  }
});

// Create booking: calendar event + save to Mongo + append to Bookings sheet
app.post('/api/bookings', async (req, res, next) => {
  try {
    const parsed = bookingZ.parse(req.body);

    // Extract CIS email for impersonation
    const cisEmail = req.body.cisEmail;
    if (!cisEmail) {
      return res.status(400).json({ ok: false, error: 'cisEmail is required for impersonation' });
    }

    // Calendar
    const event = await createCalendarEvent({
      ...parsed,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      cisEmail, // pass CIS email for impersonation
    });

    // Mongo
    const booking = await Booking.create({
      ...parsed,
      startTime: new Date(parsed.startTime),
      endTime: new Date(parsed.endTime),
      calendarEventId: event.id,
    });

    // Sheets
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const values = [
      now,
      booking._id.toString(),
      event.id,
      parsed.fullName,
      parsed.email || '',
      parsed.phone || '',
      parsed.propertyId || '',
      parsed.propertyName || '',
      dayjs(parsed.startTime).format('YYYY-MM-DD HH:mm'),
      dayjs(parsed.endTime).format('YYYY-MM-DD HH:mm'),
      parsed.summary || '',
      parsed.location || '',
      event.htmlLink || '',
    ];

    try {
      await appendToSheet({ spreadsheetId: BOOKINGS_SHEET_ID, values });
      booking.sheetSynced = true;
      await booking.save();
    } catch (e) {
      console.error('[Sheets] Append failed:', e.message);
    }

    // Update the onboarding record with calendar event details
    try {
      // Find the onboarding record that was created for this booking
      const onboardingRecord = await Onboarding.findOne({ 
        propertyId: parsed.propertyId,
        name: parsed.fullName 
      }).sort({ createdAt: -1 });

      if (onboardingRecord) {
        // Update the onboarding record with calendar event ID
        onboardingRecord.calendarEventId = event.id;
        await onboardingRecord.save();

        // Update the sheets with calendar event link
        const sheets = google.sheets({ version: 'v4', auth: sheetsClient });
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: DEALS_SHEET_ID,
          range: `${SHEET_TAB_NAME}!A:Z`,
        });

        const rows = response.data.values || [];
        const headerRow = rows[0];
        const idColumnIndex = headerRow.findIndex(col => col.toLowerCase().includes('id'));

        if (idColumnIndex !== -1) {
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][idColumnIndex] === onboardingRecord._id.toString()) {
              // Update the calendar event ID column
              const calendarEventColumnIndex = headerRow.findIndex(col => 
                col.toLowerCase().includes('calendar') || col.toLowerCase().includes('event')
              );
              
              if (calendarEventColumnIndex !== -1) {
                await sheets.spreadsheets.values.update({
                  spreadsheetId: DEALS_SHEET_ID,
                  range: `${SHEET_TAB_NAME}!${String.fromCharCode(65 + calendarEventColumnIndex)}${i + 1}`,
                  valueInputOption: 'RAW',
                  requestBody: {
                    values: [[event.htmlLink || event.id]]
                  }
                });
              }
              break;
            }
          }
        }
      }
    } catch (calendarUpdateError) {
      console.error('Failed to update onboarding with calendar event:', calendarUpdateError);
      // Don't fail the booking creation if calendar update fails
    }

    res.status(201).json({ ok: true, data: { booking, eventLink: event.htmlLink } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Invalid payload', details: err.flatten() });
    }
    next(err);
  }
});

// ---- Free slots for a CIS on a date ----
// Query: ?email=<cis email>&date=YYYY-MM-DD&mode=physical|virtual
app.get('/api/free-slots', async (req, res, next) => {
  try {
    const { email, date, mode } = req.query;
    if (!email || !date || !mode) {
      return res.status(400).json({ ok: false, error: 'email, date, mode are required' });
    }

    // candidate slots (IST). We'll make them UTC ISO for Calendar API.
    function makeDate(hour, min = 0) {
      const [y, m, d] = date.split('-').map(Number);
      // local time for India (assume server in IST or you can force with toISOString)
      return new Date(y, m - 1, d, hour, min, 0, 0);
    }

    // Build candidate windows as per your rules
    let windows = [];
    if (mode === 'physical') {
      // 3-hour slots until 6 PM: 10–13, 14–17, then 1-hour 18–19
      windows = [
        { start: makeDate(10), end: makeDate(13), label: '10 AM – 1 PM (3h)' },
        { start: makeDate(14), end: makeDate(17), label: '2 PM – 5 PM (3h)' },
        { start: makeDate(18), end: makeDate(19), label: '6 PM – 7 PM (1h)' },
      ];
    } else {
      // virtual: 2-hour slots 10–12, 12–14; 2-hour 15–17; then 1-hour 18–19
      windows = [
        { start: makeDate(10), end: makeDate(12), label: '10 AM – 12 PM (2h)' },
        { start: makeDate(12), end: makeDate(14), label: '12 PM – 2 PM (2h)' },
        { start: makeDate(15), end: makeDate(17), label: '3 PM – 5 PM (2h)' },
        { start: makeDate(18), end: makeDate(19), label: '6 PM – 7 PM (1h)' },
      ];
    }

    // check conflicts on the CIS calendar using FreeBusy
    const timeMin = new Date(date + 'T00:00:00');
    const timeMax = new Date(date + 'T23:59:59');

    const fb = await calendarClient.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: email }],
      },
    });

    const busy = (fb.data.calendars?.[email]?.busy || []).map(b => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }));

    const isFree = (slot) => {
      const s = slot.start.getTime();
      const e = slot.end.getTime();
      return !busy.some(b => Math.max(b.start, s) < Math.min(b.end, e));
    };

    const available = windows
      .filter(isFree)
      .map(w => ({
        startISO: w.start.toISOString(),
        endISO: w.end.toISOString(),
        label: w.label,
      }));

    res.json({ ok: true, data: available });
  } catch (e) {
    next(e);
  }
});

// Quick list routes (optional helpers)
app.get('/api/onboarding', async (_req, res, next) => {
  try {
    const rows = await Onboarding.find().sort({ createdAt: -1 }).limit(100);
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
});

app.get('/api/bookings', async (_req, res, next) => {
  try {
    const rows = await Booking.find().sort({ createdAt: -1 }).limit(100);
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
});

// --- super simple sanity route (no Google) ---
app.get('/debug/ping', (req, res) => {
    res.json({ ok: true, from: __dirname });
  });
  
  // --- Google auth debug route ---
  app.get('/debug/google', async (req, res) => {
    try {
      const keyPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_SHEET_CREDENTIALS_PATH;
  
      // which key are we using?
      const saEmail = require(keyPath).client_email;
  
      // list a few calendars this service account can see
      const { data } = await calendarClient.calendarList.list({ maxResults: 5 });
      const calendars = (data.items || []).map(c => ({ id: c.id, summary: c.summary }));
  
      // optional: check we can read your Deals sheet metadata
      let sheetTitle = null;
      if (process.env.DEALS_SHEET_ID && sheetsClient) {
        const meta = await sheetsClient.spreadsheets.get({
          spreadsheetId: process.env.DEALS_SHEET_ID,
        });
        sheetTitle = meta.data.properties?.title || null;
      }
  
      res.json({
        ok: true,
        serviceAccount: saEmail,
        calendars,
        dealsSheetTitle: sheetTitle,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });  

// Endpoint: list onboarding items for a CIS
app.get('/api/onboarding/cis/:cisId', async (req, res, next) => {
  try {
    const { cisId } = req.params;
    const rows = await Booking.find({ cisId }).sort({ createdAt: -1 });
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/onboarding/:id/status { status, note }
app.patch('/api/onboarding/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const now = new Date().toISOString();

    const update = {
      $set: { onboardingStatus: status, updatedAt: now },
      $push: { statusHistory: { status, at: now, note } }
    };

    await Booking.updateOne({ id }, update);
    res.json({ ok: true });
  } catch (e) { 
    next(e); 
  }
});

// POST /api/onboarding/:id/attachment (form-data file: "photo")
app.post('/api/onboarding/:id/attachment', upload.single('photo'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' });

    // local file path => serve as static
    const publicUrl = `/uploads/${req.file.filename}`;

    const now = new Date().toISOString();

    await Booking.updateOne(
      { id },
      {
        $set: { attachmentUrl: publicUrl, updatedAt: now },
        $push: { statusHistory: { status: 'Onboarding Done', at: now, attachmentUrl: publicUrl } }
      }
    );

    res.json({ ok: true, url: publicUrl });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/onboarding/:id - Update onboarding details
app.patch('/api/onboarding/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    console.log('PATCH /api/onboarding/:id - Received updates:', updates);

    // Map frontend booking fields to backend onboarding fields
    const mappedUpdates = {
      name: updates.ownerName,
      phone: updates.ownerPhone,
      email: updates.ownerEmail,
      propertyId: updates.rentokId,
      budget: updates.totalAmount,
      updatedAt: now
    };

    // Remove undefined values
    Object.keys(mappedUpdates).forEach(key => {
      if (mappedUpdates[key] === undefined) {
        delete mappedUpdates[key];
      }
    });

    console.log('Mapped updates:', mappedUpdates);

    // Update the onboarding record
    const updatedOnboarding = await Onboarding.findOneAndUpdate(
      { _id: id },
      { 
        $set: mappedUpdates
      },
      { new: true }
    );

    if (!updatedOnboarding) {
      return res.status(404).json({ ok: false, error: 'Onboarding not found' });
    }

    console.log('Updated onboarding:', updatedOnboarding);

    // Update Google Sheets with comprehensive booking details
    try {
      const sheets = google.sheets({ version: 'v4', auth: sheetsClient });
      const spreadsheetId = DEALS_SHEET_ID;
      
      if (spreadsheetId) {
        // Find the row with this onboarding ID and update it
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${SHEET_TAB_NAME}!A:Z`,
        });

        const rows = response.data.values || [];
        const headerRow = rows[0];
        const idColumnIndex = headerRow.findIndex(col => col.toLowerCase().includes('id') || col.toLowerCase().includes('booking'));

        if (idColumnIndex !== -1) {
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][idColumnIndex] === id) {
              // Get the corresponding booking data from the request
              const bookingData = req.body;
              
              // Format slot window for display
              const formatSlotWindow = (slotWindow) => {
                switch (slotWindow) {
                  case '10_13': return '10 AM - 1 PM';
                  case '14_17': return '2 PM - 5 PM';
                  case '18_19': return '6 PM - 7 PM';
                  default: return slotWindow;
                }
              };

              // Format location for display
              const formatLocation = (location) => {
                return location.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              };

              // Calculate subscription summary
              const subscriptionSummary = `${bookingData.subscriptionType || 'Base'} · ${bookingData.noOfBeds || 0} beds · ${bookingData.monthsBilled || 0} months`;

              // Update this row with comprehensive data
              const updateData = [
                dayjs().format('YYYY-MM-DD HH:mm:ss'), // Timestamp
                id, // Onboarding ID
                updatedOnboarding.name || bookingData.ownerName || '', // Owner Name
                updatedOnboarding.phone || bookingData.ownerPhone || '', // Phone
                updatedOnboarding.email || bookingData.ownerEmail || '', // Email
                updatedOnboarding.city || formatLocation(bookingData.bookingLocation || ''), // City/Location
                updatedOnboarding.budget || bookingData.totalAmount || 0, // Budget/Total Amount
                updatedOnboarding.propertyId || bookingData.rentokId || '', // Property ID/RentOk ID
                updatedOnboarding.propertyName || '', // Property Name
                bookingData.portfolioManager || '', // Portfolio Manager
                bookingData.subscriptionStartDate || '', // Subscription Start Date
                subscriptionSummary, // Subscription Summary
                bookingData.noOfProperties || 0, // Number of Properties
                bookingData.noOfBeds || 0, // Number of Beds
                bookingData.subscriptionType || 'Base', // Subscription Type
                bookingData.soldPricePerBed || 0, // Price Per Bed
                bookingData.monthsBilled || 0, // Months Billed
                bookingData.freeMonths || 0, // Free Months
                formatLocation(bookingData.bookingLocation || ''), // Booking Location
                bookingData.mode || 'physical', // Mode (Physical/Virtual)
                bookingData.cisId || '', // CIS ID
                formatSlotWindow(bookingData.slotWindow || ''), // Slot Window
                bookingData.date || '', // Booking Date
                bookingData.status || 'scheduled', // Status
                updatedOnboarding.status || 'Onboarding Started', // Onboarding Status
                bookingData.bookingRef || '', // Booking Reference
                bookingData.calendarEventId || '', // Calendar Event ID
                bookingData.createdBy || '', // Created By
                updatedOnboarding.source || 'Onboarding Booking Form', // Source
                updatedOnboarding.preferences || subscriptionSummary, // Preferences
                updatedOnboarding.notes || '', // Notes
                updatedOnboarding.moveInDate ? dayjs(updatedOnboarding.moveInDate).format('YYYY-MM-DD') : '', // Move In Date
                updatedOnboarding.attachmentUrl || '', // Attachment URL
                updatedOnboarding.cisId || bookingData.cisId || '' // CIS ID (duplicate for compatibility)
              ];

              await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${SHEET_TAB_NAME}!A${i + 1}:AE${i + 1}`, // Extended range for all columns
                valueInputOption: 'RAW',
                requestBody: {
                  values: [updateData]
                }
              });
              break;
            }
          }
        }
      }
    } catch (sheetsError) {
      console.error('Sheets update error:', sheetsError);
      // Don't fail the request if sheets update fails
    }

    res.json({ ok: true, data: updatedOnboarding });
  } catch (e) {
    console.error('PATCH /api/onboarding/:id error:', e);
    next(e);
  }
});
  
// 12) Error handler (last)
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ ok: false, error: err.message || 'Server error' });
});

// ---- FREEBUSY: return available slots for a CIS email + date + mode ----
app.get('/api/freebusy', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim();
    const dateStr = String(req.query.date || '').trim(); // yyyy-mm-dd
    const mode = String(req.query.mode || 'physical').trim(); // 'physical' | 'virtual'

    if (!email || !dateStr) {
      return res.status(400).json({ ok: false, error: 'Missing email or date' });
    }

    // Build the slot templates (local time)
    // helper to create a Date in local TZ
    const mk = (h, m = 0) => new Date(
      Number(dateStr.slice(0,4)),
      Number(dateStr.slice(5,7)) - 1,
      Number(dateStr.slice(8,10)),
      h, m, 0, 0
    );

    let candidateSlots = [];
    if (mode === 'virtual') {
      // 2h: 10-12, 15-17; 1h: 18-19
      candidateSlots = [
        { start: mk(10), end: mk(12), label: '10 AM – 12 PM (2h)' },
        { start: mk(15), end: mk(17), label: '3 PM – 5 PM (2h)' },
        { start: mk(18), end: mk(19), label: '6 PM – 7 PM (1h)' },
      ];
    } else {
      // physical: 3h blocks till 6 PM, plus 1h 6–7
      candidateSlots = [
        { start: mk(10), end: mk(13), label: '10 AM – 1 PM (3h)' },
        { start: mk(13), end: mk(16), label: '1 PM – 4 PM (3h)' },
        { start: mk(14), end: mk(17), label: '2 PM – 5 PM (3h)' }, // extra option
        { start: mk(18), end: mk(19), label: '6 PM – 7 PM (1h)' },
      ];
    }

    // Auth with service account without impersonation
    let authConfig;
    
    // Check if GOOGLE_KEYFILE is a JSON string (for Render) or file path (for local)
    if (GOOGLE_KEYFILE.startsWith('{')) {
      // It's a JSON string (Render environment) - write to temp file
      const credentials = JSON.parse(GOOGLE_KEYFILE);
      const tempKeyFile = '/tmp/google-credentials-freebusy.json';
      fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
      authConfig = {
        keyFile: tempKeyFile,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      };
    } else {
      // It's a file path (local environment)
      authConfig = {
        keyFile: GOOGLE_KEYFILE,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      };
    }
    
    const auth = new google.auth.GoogleAuth(authConfig);
    const client = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: client });

    // Ask Google for busy periods on that date
    const timeMin = new Date(dateStr + 'T00:00:00');
    const timeMax = new Date(dateStr + 'T23:59:59');

    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: email }],
      },
    });

    const busy = (fb.data.calendars?.[email]?.busy || []).map(b => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));

    // helper: check overlap
    const overlaps = (a, b) => a.start < b.end && b.start < a.end;

    // Filter candidates that do NOT overlap with any busy interval
    const available = candidateSlots.filter(slot => {
      return !busy.some(b => overlaps(slot, b));
    });

    // Shape response
    const result = available.map((s, idx) => ({
      id: `${idx}_${s.start.toISOString()}`,
      label: s.label,
      startTime: s.start.toISOString(),
      endTime: s.end.toISOString(),
    }));

    res.json({ ok: true, data: result });
  } catch (e) {
    next(e);
  }
});

// 13) Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
