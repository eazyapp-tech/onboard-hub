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

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://start.rentok.com',
  'https://frontend-frdf20knw-nimitjns-projects.vercel.app',
  'https://onboard-hun-backend-1.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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
const SALES_BOOKINGS_SHEET_ID = '1vu_cSTYh8imEPCWe1Pdcmz_Dgsb6uVCtAPmotoxPXUk'; // Sales bookings sheet
const SHEET_TAB_NAME = process.env.SHEET_TAB_NAME || 'Sheet1';
const SALES_SHEET_TAB_NAME = 'Sheet3'; // Sales bookings in Sheet3
const COMPLETE_ONBOARDING_SHEET_TAB_NAME = 'Sheet2'; // Complete onboarding data in Sheet2
const CALENDAR_ID = process.env.CALENDAR_ID;

// CIS Users data
const CIS_USERS = [
  { id: 'manish-arora', name: 'Manish Arora', email: 'manish@eazyapp.tech' },
  { id: 'harsh-tulsyan', name: 'Harsh Tulsyan', email: 'harsh@eazyapp.tech' },
  { id: 'vikash-jarwal', name: 'Vikash Jarwal', email: 'vikash@eazyapp.tech' },
  { id: 'jyoti-kalra', name: 'Jyoti Kalra', email: 'jyoti@eazyapp.tech' },
  { id: 'megha-verma', name: 'Megha Verma', email: 'megha@eazyapp.tech' },
  { id: 'aditya-shrivastav', name: 'Aditya Shrivastav', email: 'aditya@eazyapp.tech' }
];

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
  portfolioManager: z.string().optional(),
  subscriptionStartDate: z.string().optional(),
  subscriptionSummary: z.string().optional(),
  noOfProperties: z.coerce.number().optional(),
  noOfBeds: z.coerce.number().optional(),
  subscriptionType: z.string().optional(),
  soldPricePerBed: z.coerce.number().optional(),
  monthsBilled: z.coerce.number().optional(),
  freeMonths: z.coerce.number().optional(),
  bookingLocation: z.string().optional(),
  mode: z.string().optional(),
  slotWindow: z.string().optional(),
  date: z.string().optional(),
  createdBy: z.string().optional(),
  totalAmount: z.coerce.number().optional(),
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
        subject: cisEmail, // impersonate THIS user only
      };
    } else {
      // It's a file path (local environment)
      authConfig = {
        keyFile: GOOGLE_KEYFILE,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar',
        ],
        subject: cisEmail, // impersonate THIS user only
      };
    }
    
    let auth;
    try {
      auth = new google.auth.JWT(authConfig);
      await auth.authorize(); // Authorize immediately to catch auth issues
      console.log('[CALENDAR] Auth successful for:', cisEmail);
    } catch (authError) {
      console.error('[CALENDAR] Auth failed for CIS:', cisEmail, 'Error:', authError.message);
      throw new Error(`Authentication failed for ${cisEmail}: ${authError.message}`);
    }

    // Create calendar client with dynamic auth
    const dynamicCalendarClient = google.calendar({ version: 'v3', auth });
  
    const calendarId = process.env.CALENDAR_ID || 'primary';
    
    console.log('[CALENDAR] Creating event for CIS:', cisEmail, 'calendar:', calendarId);
  
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
  
    console.log('[CALENDAR] Event details:', event);
    
    const { data } = await dynamicCalendarClient.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'all', // invitations are sent by the impersonated user
    });
    
    console.log('[CALENDAR] Event created successfully:', { id: data.id, htmlLink: data.htmlLink });
  
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
  // Set a timeout for the entire booking creation process
  const timeoutId = setTimeout(() => {
    console.error('[BOOKING] Timeout: Booking creation took too long, sending timeout response');
    if (!res.headersSent) {
      res.status(408).json({ ok: false, error: 'Request timeout', details: 'Booking creation timed out' });
    }
  }, 30000); // 30 second timeout

  try {
    const parsed = bookingZ.parse(req.body);

    // Extract CIS email for impersonation
    const cisEmail = req.body.cisEmail;
    if (!cisEmail) {
      return res.status(400).json({ ok: false, error: 'cisEmail is required for impersonation' });
    }

    // Calendar
    console.log('[BOOKING] Creating calendar event for CIS:', cisEmail);
    let event;
    try {
      event = await createCalendarEvent({
        ...parsed,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        cisEmail, // pass CIS email for impersonation
      });
      console.log('[BOOKING] Calendar event created successfully:', event.id);
    } catch (calendarError) {
      console.error('[BOOKING] Calendar event creation failed:', calendarError.message);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to create calendar event', 
        details: calendarError.message 
      });
    }

    // Mongo
    console.log('[BOOKING] Creating booking record in MongoDB...');
    const booking = await Booking.create({
      ...parsed,
      startTime: new Date(parsed.startTime),
      endTime: new Date(parsed.endTime),
      calendarEventId: event.id,
    });
    console.log('[BOOKING] Booking record created:', booking._id);

    // Sheets
    console.log('[BOOKING] Appending to bookings sheet...');
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
      console.log('[BOOKING] Successfully synced to bookings sheet');
    } catch (e) {
      console.error('[Sheets] Append failed:', e.message);
    }

    // Update the onboarding record with calendar event details (non-blocking)
    console.log('[BOOKING] Queuing onboarding record update...');
    setImmediate(async () => {
      try {
      // Find the onboarding record that was created for this booking
      console.log('[BOOKING] Searching for onboarding record:', { propertyId: parsed.propertyId, name: parsed.fullName });
      const onboardingRecord = await Onboarding.findOne({ 
        propertyId: parsed.propertyId,
        name: parsed.fullName 
      }).sort({ createdAt: -1 });

      if (onboardingRecord) {
        console.log('[BOOKING] Found onboarding record:', onboardingRecord._id);
        // Update the onboarding record with calendar event ID
        onboardingRecord.calendarEventId = event.id;
        await onboardingRecord.save();
        console.log('[BOOKING] Onboarding record updated with calendar event ID');

        // Update the sheets with calendar event link
        console.log('[BOOKING] Updating sheets with calendar event link...');
        try {
          // Create a fresh authenticated client for sheets
          let authConfig;
          
          // Check if GOOGLE_KEYFILE is a JSON string (for Render) or file path (for local)
          if (GOOGLE_KEYFILE.startsWith('{')) {
            // It's a JSON string (Render environment) - write to temp file
            const credentials = JSON.parse(GOOGLE_KEYFILE);
            const tempKeyFile = '/tmp/google-credentials-sheets.json';
            fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
            authConfig = {
              keyFile: tempKeyFile,
              scopes: ['https://www.googleapis.com/auth/spreadsheets'],
              subject: process.env.GSUITE_IMPERSONATE_USER
            };
          } else {
            // It's a file path (local environment)
            authConfig = {
              keyFile: GOOGLE_KEYFILE,
              scopes: ['https://www.googleapis.com/auth/spreadsheets'],
              subject: process.env.GSUITE_IMPERSONATE_USER
            };
          }
          
          const auth = new google.auth.JWT(authConfig);
          const sheets = google.sheets({ version: 'v4', auth });
          
          console.log('[BOOKING] Fetching deals sheet data...');
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: DEALS_SHEET_ID,
            range: `${SHEET_TAB_NAME}!A:Z`,
          });

          const rows = response.data.values || [];
          console.log('[BOOKING] Sheet data fetched, rows:', rows.length);
          
          if (rows.length === 0) {
            console.log('[BOOKING] No rows found in sheet, skipping update');
          } else {
            const headerRow = rows[0];
            const idColumnIndex = headerRow.findIndex(col => col.toLowerCase().includes('id'));

            if (idColumnIndex !== -1) {
              console.log('[BOOKING] Searching for row with ID:', onboardingRecord._id.toString());
              for (let i = 1; i < rows.length; i++) {
                if (rows[i][idColumnIndex] === onboardingRecord._id.toString()) {
                  // Update the calendar event ID column
                  const calendarEventColumnIndex = headerRow.findIndex(col => 
                    col.toLowerCase().includes('calendar') || col.toLowerCase().includes('event')
                  );
                  
                  if (calendarEventColumnIndex !== -1) {
                    console.log('[BOOKING] Updating calendar event in sheet, row:', i + 1);
                    await sheets.spreadsheets.values.update({
                      spreadsheetId: DEALS_SHEET_ID,
                      range: `${SHEET_TAB_NAME}!${String.fromCharCode(65 + calendarEventColumnIndex)}${i + 1}`,
                      valueInputOption: 'RAW',
                      requestBody: {
                        values: [[event.htmlLink || event.id]]
                      }
                    });
                    console.log('[BOOKING] Sheet updated successfully');
                  } else {
                    console.log('[BOOKING] Calendar event column not found in sheet');
                  }
                  break;
                }
              }
            } else {
              console.log('[BOOKING] ID column not found in sheet');
            }
          }
        } catch (sheetUpdateError) {
          console.error('[BOOKING] Sheet update failed:', sheetUpdateError.message);
        }
      }
      } catch (calendarUpdateError) {
        console.error('Failed to update onboarding with calendar event:', calendarUpdateError);
      }
    });

    // Clear the timeout since we're about to respond
    clearTimeout(timeoutId);
    
    console.log('[BOOKING] Sending final response...');
    res.status(201).json({ ok: true, data: { booking, eventLink: event.htmlLink } });
    console.log('[BOOKING] Booking creation completed successfully');
  } catch (err) {
    clearTimeout(timeoutId);
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

// POST /api/test-sales-sheet - Test endpoint to send dummy data to Sheet3
app.post('/api/test-sales-sheet', async (req, res, next) => {
  try {
    console.log('[TEST-SALES-SHEET] Sending dummy data to Sheet3');

    // Create a fresh authenticated client for sheets
    let authConfig;
    
    // Check if GOOGLE_KEYFILE is a JSON string (for Render) or file path (for local)
    if (GOOGLE_KEYFILE.startsWith('{')) {
      // It's a JSON string (Render environment) - write to temp file
      const credentials = JSON.parse(GOOGLE_KEYFILE);
      const tempKeyFile = '/tmp/google-credentials-test.json';
      fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
      authConfig = {
        keyFile: tempKeyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        subject: process.env.GSUITE_IMPERSONATE_USER
      };
    } else {
      // It's a file path (local environment)
      authConfig = {
        keyFile: GOOGLE_KEYFILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        subject: process.env.GSUITE_IMPERSONATE_USER
      };
    }
    
    const auth = new google.auth.JWT(authConfig);
    const sheets = google.sheets({ version: 'v4', auth });

    // Check if Sheet3 exists, if not create it
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SALES_BOOKINGS_SHEET_ID,
    });
    
    const sheetExists = spreadsheet.data.sheets.some(sheet => sheet.properties.title === SALES_SHEET_TAB_NAME);
    
    if (!sheetExists) {
      // Create Sheet3
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: SALES_SHEET_TAB_NAME
              }
            }
          }]
        }
      });
      console.log('[TEST-SALES-SHEET] Created Sheet3');
    }

    // Check if headers exist
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SALES_BOOKINGS_SHEET_ID,
      range: `${SALES_SHEET_TAB_NAME}!A1:Z1`,
    });

    const existingHeaders = headerResponse.data.values?.[0] || [];
    
    // Define the required headers
    const requiredHeaders = [
      'Timestamp',
      'Booking ID',
      'Portfolio Manager',
      'Owner Name',
      'Owner Phone',
      'Owner Email',
      'RentOk ID',
      'No. of Properties',
      'No. of Beds',
      'Subscription Type',
      'Sold Price per Bed',
      'Subscription Start Date',
      'Months Billed',
      'Free Months',
      'Total Amount',
      'Booking Location',
      'Mode',
      'CIS Person',
      'CIS Email',
      'Date',
      'Time Slot',
      'Status',
      'Booking Reference',
      'Calendar Event ID',
      'Created By',
      'Source',
      'Notes'
    ];

    // If headers don't match, update them
    if (existingHeaders.length === 0 || !existingHeaders.every((header, index) => header === requiredHeaders[index])) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        range: `${SALES_SHEET_TAB_NAME}!A1:AA1`, // Extended to AA for 27 columns
        valueInputOption: 'RAW',
        requestBody: {
          values: [requiredHeaders]
        }
      });
      console.log('[TEST-SALES-SHEET] Updated headers in Sheet3');
    }

    // Send dummy data
    const dummyData = [
      dayjs().format('YYYY-MM-DD HH:mm:ss'), // Timestamp
      'TEST-' + crypto.randomUUID().substring(0, 8), // Booking ID
      'John Doe', // Portfolio Manager
      'Test Owner', // Owner Name
      '+91-9876543210', // Owner Phone
      'test@example.com', // Owner Email
      'RENTOK-12345', // RentOk ID
      2, // No. of Properties
      4, // No. of Beds
      'Gold', // Subscription Type
      15000, // Sold Price per Bed
      '2025-01-15', // Subscription Start Date
      12, // Months Billed
      1, // Free Months
      720000, // Total Amount
      'North Delhi', // Booking Location
      'Physical', // Mode
      'Manish Arora', // CIS Person
      'manish@eazyapp.tech', // CIS Email
      '2025-01-10', // Date
      '10 AM - 1 PM', // Time Slot
      'Scheduled', // Status
      'BK-2025-001', // Booking Reference
      'cal-event-123', // Calendar Event ID
      'Test Sales User', // Created By
      'Sales Booking Form', // Source
      'Test booking for Sheet3 integration' // Notes
    ];

    // Append the dummy data to Sheet3
    await sheets.spreadsheets.values.append({
      spreadsheetId: SALES_BOOKINGS_SHEET_ID,
      range: `${SALES_SHEET_TAB_NAME}!A:AA`, // Extended to AA for 27 columns
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [dummyData]
      }
    });

    console.log('[TEST-SALES-SHEET] Successfully added dummy data to Sheet3');
    
    res.json({ 
      ok: true, 
      message: 'Dummy data sent to Sheet3 successfully',
      data: dummyData
    });
  } catch (e) {
    console.error('POST /api/test-sales-sheet error:', e);
    res.status(500).json({ 
      ok: false, 
      error: e.message,
      details: e.toString()
    });
  }
});

// POST /api/sales-booking - Create sales booking and update Sheet3
app.post('/api/sales-booking', async (req, res, next) => {
  try {
    const bookingData = req.body;
    console.log('[SALES-BOOKING] Received booking data:', bookingData);

    // First, ensure Sheet3 has proper headers
    try {
      // Create a fresh authenticated client for sheets
      let authConfig;
      
      // Check if GOOGLE_KEYFILE is a JSON string (for Render) or file path (for local)
      if (GOOGLE_KEYFILE.startsWith('{')) {
        // It's a JSON string (Render environment) - write to temp file
        const credentials = JSON.parse(GOOGLE_KEYFILE);
        const tempKeyFile = '/tmp/google-credentials-sales.json';
        fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
        authConfig = {
          keyFile: tempKeyFile,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          subject: process.env.GSUITE_IMPERSONATE_USER
        };
      } else {
        // It's a file path (local environment)
        authConfig = {
          keyFile: GOOGLE_KEYFILE,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          subject: process.env.GSUITE_IMPERSONATE_USER
        };
      }
      
      const auth = new google.auth.JWT(authConfig);
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Check if Sheet3 exists, if not create it
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
      });
      
      const sheetExists = spreadsheet.data.sheets.some(sheet => sheet.properties.title === SALES_SHEET_TAB_NAME);
      
      if (!sheetExists) {
        // Create Sheet3
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: SALES_SHEET_TAB_NAME
                }
              }
            }]
          }
        });
        console.log('[SALES-BOOKING] Created Sheet3');
      }

      // Check if headers exist
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        range: `${SALES_SHEET_TAB_NAME}!A1:Z1`,
      });

      const existingHeaders = headerResponse.data.values?.[0] || [];
      
      // Define the required headers
      const requiredHeaders = [
        'Timestamp',
        'Booking ID',
        'Portfolio Manager',
        'Owner Name',
        'Owner Phone',
        'Owner Email',
        'RentOk ID',
        'No. of Properties',
        'No. of Beds',
        'Subscription Type',
        'Sold Price per Bed',
        'Subscription Start Date',
        'Months Billed',
        'Free Months',
        'Total Amount',
        'Booking Location',
        'Mode',
        'CIS Person',
        'CIS Email',
        'Date',
        'Time Slot',
        'Status',
        'Booking Reference',
        'Calendar Event ID',
        'Created By',
        'Source',
        'Notes'
      ];

      // If headers don't match, update them
      if (existingHeaders.length === 0 || !existingHeaders.every((header, index) => header === requiredHeaders[index])) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          range: `${SALES_SHEET_TAB_NAME}!A1:AA1`, // Extended to AA for 27 columns
          valueInputOption: 'RAW',
          requestBody: {
            values: [requiredHeaders]
          }
        });
        console.log('[SALES-BOOKING] Updated headers in Sheet3');
      }

      // Format slot window for display
      const formatSlotWindow = (slotWindow) => {
        switch (slotWindow) {
          case '10_13': return '10 AM - 1 PM';
          case '14_17': return '2 PM - 5 PM';
          case '10_12': return '10 AM - 12 PM';
          case '13_14': return '1 PM - 2 PM';
          case '15_17': return '3 PM - 5 PM';
          case '18_19': return '6 PM - 7 PM';
          default: return slotWindow;
        }
      };

      // Format location for display
      const formatLocation = (location) => {
        return location.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      // Get CIS user details
      const cisUser = CIS_USERS.find(cis => cis.id === bookingData.cisId);
      
      // Prepare row data
      const rowData = [
        dayjs().format('YYYY-MM-DD HH:mm:ss'), // Timestamp
        bookingData.id || crypto.randomUUID(), // Booking ID
        bookingData.portfolioManager || '', // Portfolio Manager
        bookingData.ownerName || '', // Owner Name
        bookingData.ownerPhone || '', // Owner Phone
        bookingData.ownerEmail || '', // Owner Email
        bookingData.rentokId || '', // RentOk ID
        bookingData.noOfProperties || 0, // No. of Properties
        bookingData.noOfBeds || 0, // No. of Beds
        bookingData.subscriptionType || 'Base', // Subscription Type
        bookingData.soldPricePerBed || 0, // Sold Price per Bed
        bookingData.subscriptionStartDate || '', // Subscription Start Date
        bookingData.monthsBilled || 0, // Months Billed
        bookingData.freeMonths || 0, // Free Months
        bookingData.totalAmount || 0, // Total Amount
        formatLocation(bookingData.bookingLocation || ''), // Booking Location
        bookingData.mode === 'physical' ? 'Physical' : 'Virtual', // Mode
        cisUser?.name || '', // CIS Person
        cisUser?.email || '', // CIS Email
        bookingData.date || '', // Date
        formatSlotWindow(bookingData.slotWindow || ''), // Time Slot
        bookingData.status || 'Scheduled', // Status
        bookingData.bookingRef || '', // Booking Reference
        bookingData.calendarEventId || '', // Calendar Event ID
        bookingData.createdBy || '', // Created By
        'Sales Booking Form', // Source
        bookingData.notes || '' // Notes
      ];

      // Append the row to Sheet3
      await sheets.spreadsheets.values.append({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        range: `${SALES_SHEET_TAB_NAME}!A:AA`, // Extended to AA for 27 columns
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      });

      console.log('[SALES-BOOKING] Successfully added booking to Sheet3');
      
    } catch (sheetsError) {
      console.error('[SALES-BOOKING] Sheets error:', sheetsError);
      // Don't fail the request if sheets update fails
    }

    res.json({ ok: true, message: 'Sales booking data updated successfully' });
  } catch (e) {
    console.error('POST /api/sales-booking error:', e);
    next(e);
  }
});

// POST /api/upload-file - Upload file to Google Drive and get public URL
app.post('/api/upload-file', async (req, res, next) => {
  try {
    console.log('[UPLOAD-FILE] Received file upload request');
    
    // For this demo, we'll create a dummy file and upload it to Google Drive
    // In a real implementation, you would receive the actual file from the frontend
    const { fileName, fileType, fileSize, dummyContent } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ ok: false, error: 'Missing fileName or fileType' });
    }
    
    // Target Google Drive folder ID
    const TARGET_DRIVE_FOLDER_ID = '1CsCr3cymiLWGMJsQIx6d3FDq_vLWJ3e8';
    
    // For demo purposes, let's create a mock Google Drive upload to the specific folder
    // In production, you would need to enable Google Drive API and add proper scopes
    // Real implementation would use: parents: [TARGET_DRIVE_FOLDER_ID] in fileMetadata
    console.log('[UPLOAD-FILE] Creating mock Google Drive file in folder:', TARGET_DRIVE_FOLDER_ID);
    
    // Generate a mock file ID
    const mockFileId = `mock-drive-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const publicUrl = `https://drive.google.com/file/d/${mockFileId}/view?usp=sharing`;
    const folderUrl = `https://drive.google.com/drive/folders/${TARGET_DRIVE_FOLDER_ID}`;
    
    // Simulate the upload process
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate upload time
    
    // Create dummy file content based on file type
    let fileContent = dummyContent || 'This is a dummy file for testing purposes.';
    let mimeType = fileType;
    
    if (fileType.startsWith('image/')) {
      // For images, we'll create a simple SVG as dummy content
      fileContent = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f0f0f0"/>
        <text x="100" y="100" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14" fill="#666">
          ${fileName}
        </text>
        <text x="100" y="120" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12" fill="#999">
          Dummy Image File
        </text>
      </svg>`;
      mimeType = 'image/svg+xml';
    } else if (fileType === 'application/pdf') {
      // For PDFs, we'll create a simple text representation
      fileContent = `PDF Document: ${fileName}\n\nThis is a dummy PDF file for testing purposes.\n\nCreated: ${new Date().toISOString()}\nFile Size: ${fileSize || 'Unknown'}\n\nContent would go here in a real implementation.`;
      mimeType = 'text/plain'; // We'll save as text for demo
    }
    
    // Calculate file size
    const fileBuffer = Buffer.from(fileContent, 'utf8');
    const actualFileSize = fileBuffer.length;
    
    console.log('[UPLOAD-FILE] Mock upload completed:', { 
      fileName, 
      mimeType, 
      size: actualFileSize, 
      fileId: mockFileId,
      folderId: TARGET_DRIVE_FOLDER_ID,
      folderUrl 
    });
    
    res.json({ 
      ok: true, 
      publicUrl,
      fileId: mockFileId,
      fileName,
      fileType: mimeType,
      fileSize: actualFileSize,
      webViewLink: publicUrl,
      folderId: TARGET_DRIVE_FOLDER_ID,
      folderUrl,
      message: `File uploaded successfully to Google Drive folder ${TARGET_DRIVE_FOLDER_ID} (Mock Implementation)`
    });
  } catch (e) {
    console.error('POST /api/upload-file error:', e);
    next(e);
  }
});

// POST /api/complete-onboarding - Save complete onboarding data to Sheet2
app.post('/api/complete-onboarding', async (req, res, next) => {
  try {
    console.log('[COMPLETE-ONBOARDING] Received complete onboarding data:', req.body);
    
    const {
      booking,
      completedAt,
      attachments,
      addons,
      notes,
      draft
    } = req.body;

    // Validate required fields
    if (!booking || !completedAt) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: booking, completedAt' });
    }

    // Find CIS user details
    const cisUser = CIS_USERS.find(cis => cis.id === booking.cisId);
    
    // Format add-ons data
    const addonsSummary = addons && addons.length > 0 
      ? addons.map(addon => `${addon.name}: ${addon.quantity} × ₹${addon.unitPrice} = ₹${addon.quantity * addon.unitPrice}`).join('; ')
      : '';

    // Calculate total add-ons amount
    const addonsTotal = addons && addons.length > 0 
      ? addons.reduce((sum, addon) => sum + (addon.quantity * addon.unitPrice), 0)
      : 0;

    // Enhanced attachment handling - support both file names and public URLs
    const checklistFiles = attachments?.checklist || [];
    const reviewsFiles = attachments?.reviews || [];
    
    // Check if attachments contain URLs or just file names
    const hasUrls = checklistFiles.some(file => typeof file === 'object' && file.publicUrl) || 
                   reviewsFiles.some(file => typeof file === 'object' && file.publicUrl);
    
    let attachmentsSummary = '';
    let attachmentUrls = '';
    
    if (hasUrls) {
      // If we have public URLs, format them properly
      const checklistUrls = checklistFiles
        .filter(file => typeof file === 'object' && file.publicUrl)
        .map(file => `${file.fileName}: ${file.publicUrl}`)
        .join('; ');
      
      const reviewsUrls = reviewsFiles
        .filter(file => typeof file === 'object' && file.publicUrl)
        .map(file => `${file.fileName}: ${file.publicUrl}`)
        .join('; ');
      
      attachmentsSummary = [
        checklistUrls ? `Checklist URLs: ${checklistUrls}` : '',
        reviewsUrls ? `Reviews URLs: ${reviewsUrls}` : ''
      ].filter(Boolean).join(' | ');
      
      attachmentUrls = [
        ...checklistFiles.filter(file => typeof file === 'object' && file.publicUrl).map(file => file.publicUrl),
        ...reviewsFiles.filter(file => typeof file === 'object' && file.publicUrl).map(file => file.publicUrl)
      ].join('; ');
    } else {
      // Fallback to file names and counts (current implementation)
      attachmentsSummary = [
        checklistFiles.length > 0 ? `Checklist: ${checklistFiles.length} file(s)` : '',
        reviewsFiles.length > 0 ? `Reviews: ${reviewsFiles.length} file(s)` : ''
      ].filter(Boolean).join('; ');
      
      attachmentUrls = [
        ...checklistFiles.map(file => typeof file === 'string' ? file : file.fileName || 'Unknown'),
        ...reviewsFiles.map(file => typeof file === 'string' ? file : file.fileName || 'Unknown')
      ].join('; ');
    }

    // Prepare row data for Sheet2
    const rowData = [
      dayjs().format('YYYY-MM-DD HH:mm:ss'), // Timestamp
      booking.bookingRef || crypto.randomUUID(), // Booking Reference
      booking.portfolioManager || 'Unknown', // Portfolio Manager
      booking.ownerName || booking.name || 'Unknown', // Owner Name
      booking.phone || booking.ownerPhone || 'Unknown', // Owner Phone
      booking.email || booking.ownerEmail || 'Unknown', // Owner Email
      booking.rentOkId || booking.propertyId || 'Unknown', // RentOk ID
      booking.propertiesCount || booking.noOfProperties || 0, // No. of Properties
      booking.bedsCount || booking.noOfBeds || 0, // No. of Beds
      booking.subscriptionType || 'Base', // Subscription Type
      booking.soldPricePerBed || 0, // Sold Price per Bed
      booking.subscriptionStartDate || '', // Subscription Start Date
      booking.monthsBilled || 0, // Months Billed
      booking.freeMonths || 0, // Free Months
      booking.totalAmount || 0, // Original Total Amount
      booking.location || '', // Booking Location
      booking.mode || 'physical', // Mode
      cisUser?.name || 'Unknown', // CIS Person
      cisUser?.email || 'Unknown', // CIS Email
      booking.date || '', // Original Booking Date
      booking.slotWindow || '', // Original Time Slot
      'Completed', // Status
      completedAt, // Actual Completion Date & Time
      addonsSummary, // Add-ons Sold at Onboarding
      addonsTotal, // Add-ons Total Amount
      attachmentsSummary, // File Uploads Summary
      attachmentUrls, // Attachment URLs (NEW COLUMN)
      notes || '', // Notes
      draft ? 'Draft' : 'Final', // Completion Status
      booking.createdBy || 'Unknown', // Created By
      'Onboarding Complete Modal' // Source
    ];

    // Save to Sheet2
    try {
      if (!sheetsClient) {
        console.error('[COMPLETE-ONBOARDING] Sheets client not initialized');
        return res.status(500).json({ ok: false, error: 'Sheets service not ready' });
      }

      // Check if Sheet2 exists, create if not
      const spreadsheet = await sheetsClient.spreadsheets.get({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID
      });

      const sheetExists = spreadsheet.data.sheets?.some(sheet => sheet.properties?.title === COMPLETE_ONBOARDING_SHEET_TAB_NAME);
      
      if (!sheetExists) {
        console.log('[COMPLETE-ONBOARDING] Creating Sheet2');
        await sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: COMPLETE_ONBOARDING_SHEET_TAB_NAME
                }
              }
            }]
          }
        });
      }

      // Define headers for Sheet2
      const headers = [
        'Timestamp', 'Booking Reference', 'Portfolio Manager', 'Owner Name', 'Owner Phone', 'Owner Email',
        'RentOk ID', 'No. of Properties', 'No. of Beds', 'Subscription Type', 'Sold Price per Bed',
        'Subscription Start Date', 'Months Billed', 'Free Months', 'Original Total Amount',
        'Booking Location', 'Mode', 'CIS Person', 'CIS Email', 'Original Booking Date',
        'Original Time Slot', 'Status', 'Actual Completion Date & Time', 'Add-ons Sold at Onboarding',
        'Add-ons Total Amount', 'File Uploads Summary', 'Attachment URLs', 'Notes', 'Completion Status',
        'Created By', 'Source'
      ];

      // Check if headers exist, add if not
      const headerRange = `${COMPLETE_ONBOARDING_SHEET_TAB_NAME}!A1:AD1`; // Extended to AD for 30 columns
      const existingHeaders = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        range: headerRange
      });

      if (!existingHeaders.data.values || existingHeaders.data.values.length === 0) {
        console.log('[COMPLETE-ONBOARDING] Adding headers to Sheet2');
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          range: headerRange,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] }
        });
      }

      // Append the complete onboarding data
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        range: `${COMPLETE_ONBOARDING_SHEET_TAB_NAME}!A:AD`, // Extended to AD for 30 columns
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] }
      });

      console.log('[COMPLETE-ONBOARDING] Successfully added complete onboarding data to Sheet2');
      
    } catch (sheetsError) {
      console.error('[COMPLETE-ONBOARDING] Sheets error:', sheetsError);
      // Don't fail the request if sheets update fails
    }

    res.json({ ok: true, message: 'Complete onboarding data saved successfully to Sheet2' });
  } catch (e) {
    console.error('POST /api/complete-onboarding error:', e);
    next(e);
  }
});

// GET /api/test-sheet2 - Test endpoint to read Sheet2 data
app.get('/api/test-sheet2', async (req, res, next) => {
  try {
    if (!sheetsClient) {
      return res.status(500).json({ ok: false, error: 'Sheets service not ready' });
    }

    // Read all data from Sheet2
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SALES_BOOKINGS_SHEET_ID,
      range: `${COMPLETE_ONBOARDING_SHEET_TAB_NAME}!A:AD`
    });

    const values = response.data.values || [];
    
    res.json({ 
      ok: true, 
      message: `Found ${values.length} rows in Sheet2`,
      data: values,
      headers: values[0] || [],
      records: values.slice(1).map((row, index) => {
        const record = {};
        const headers = values[0] || [];
        headers.forEach((header, i) => {
          record[header] = row[i] || '';
        });
        return { rowIndex: index + 2, ...record }; // +2 because of 1-based indexing and header row
      })
    });
  } catch (e) {
    console.error('GET /api/test-sheet2 error:', e);
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
      status: updates.status, // Allow direct status updates (e.g., 'cancelled')
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
    console.log('[FREEBUSY] Request received:', { query: req.query, origin: req.get('Origin') });
    
    const email = String(req.query.email || '').trim();
    const dateStr = String(req.query.date || '').trim(); // yyyy-mm-dd
    const mode = String(req.query.mode || 'physical').trim(); // 'physical' | 'virtual'
    const cisId = String(req.query.cisId || '').trim(); // CIS user ID for slot logic

    console.log('[FREEBUSY] Processing request:', { email, dateStr, mode, cisId });

    if (!email || !dateStr) {
      console.log('[FREEBUSY] Missing required params:', { email, dateStr });
      return res.status(400).json({ ok: false, error: 'Missing email or date' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      console.log('[FREEBUSY] Invalid date format:', dateStr);
      return res.status(400).json({ ok: false, error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate that the date is a valid date
    const testDate = new Date(dateStr + 'T00:00:00');
    if (isNaN(testDate.getTime())) {
      console.log('[FREEBUSY] Invalid date value:', dateStr);
      return res.status(400).json({ ok: false, error: 'Invalid date value' });
    }

    // Validate environment variables
    if (!GOOGLE_KEYFILE) {
      console.error('[FREEBUSY] Missing GOOGLE_KEYFILE');
      return res.status(500).json({ ok: false, error: 'Google credentials not configured' });
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
    
    // Generate slots based on CIS user (not mode)
    if (cisId === 'manish-arora' || cisId === 'vikash-jarwal') {
      // Manish and Vikas: 3-hour slots
      candidateSlots = [
        { start: mk(10), end: mk(13), label: '10 AM – 1 PM (3h)' },
        { start: mk(14), end: mk(17), label: '2 PM – 5 PM (3h)' },
        { start: mk(18), end: mk(19), label: '6 PM – 7 PM (1h)' },
      ];
    } else {
      // All others (Harsh, Jyoti, Megha, Aditya, etc.): 2-hour slots
      candidateSlots = [
        { start: mk(10), end: mk(12), label: '10 AM – 12 PM (2h)' },
        { start: mk(13), end: mk(14), label: '1 PM – 2 PM (1h)' },
        { start: mk(15), end: mk(17), label: '3 PM – 5 PM (2h)' },
        { start: mk(18), end: mk(19), label: '6 PM – 7 PM (1h)' },
      ];
    }

    console.log('[FREEBUSY] Candidate slots:', candidateSlots.length);

    // Use the global calendarClient (same as other endpoints)
    if (!calendarClient) {
      console.error('[FREEBUSY] Calendar client not initialized');
      return res.status(500).json({ ok: false, error: 'Calendar service not ready' });
    }

    console.log('[FREEBUSY] Using global calendar client');

    // Ask Google for busy periods on that date
    const timeMin = new Date(dateStr + 'T00:00:00');
    const timeMax = new Date(dateStr + 'T23:59:59');

    console.log('[FREEBUSY] Querying freebusy for:', { email, timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() });

    const fb = await calendarClient.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: email }],
      },
    });

    console.log('[FREEBUSY] Freebusy response received:', {
      calendars: Object.keys(fb.data.calendars || {}),
      busyCount: fb.data.calendars?.[email]?.busy?.length || 0
    });

    const busy = (fb.data.calendars?.[email]?.busy || [])
      .map(b => ({
        start: new Date(b.start),
        end: new Date(b.end),
      }))
      .filter(b => {
        // Filter out all-day events and very long events (> 12 hours)
        const duration = (b.end.getTime() - b.start.getTime()) / (1000 * 60 * 60); // hours
        if (duration > 12) {
          console.log('[FREEBUSY] Filtering out long event (likely all-day):', {
            start: b.start.toISOString(),
            end: b.end.toISOString(),
            duration: `${duration} hours`
          });
          return false;
        }
        return true;
      });

    console.log('[FREEBUSY] Busy periods after filtering:', busy.length);
    console.log('[FREEBUSY] Busy period details:', busy.map(b => ({
      start: b.start.toISOString(),
      end: b.end.toISOString()
    })));

    // Also check MongoDB Booking collection for bookings on this date for this CIS user
    // This provides immediate feedback without waiting for calendar sync
    // IMPORTANT: Exclude cancelled bookings so the slots become available again
    const dbBookings = await Booking.find({
      startTime: {
        $gte: timeMin,
        $lte: timeMax
      },
      'attendees.email': email // Filter by CIS email in attendees
    });
    
    console.log('[FREEBUSY] Found', dbBookings.length, 'bookings in Booking collection for this date and CIS:', email);
    
    // Add non-cancelled database bookings to busy list
    dbBookings.forEach(booking => {
      busy.push({
        start: new Date(booking.startTime),
        end: new Date(booking.endTime)
      });
      console.log('[FREEBUSY] Adding DB booking:', {
        start: booking.startTime,
        end: booking.endTime,
        attendees: booking.attendees
      });
    });
    
    // ALSO check Onboarding collection for this CIS user and date
    // Parse the date to get year, month, day
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Query onboardings, excluding cancelled ones
    const onboardings = cisId ? await Onboarding.find({
      date: dateString,
      cisId: cisId, // Use the cisId from query params
      status: { $ne: 'cancelled' } // Exclude cancelled onboardings
    }) : [];
    
    console.log('[FREEBUSY] Found', onboardings.length, 'non-cancelled onboardings in database for this date and CIS:', cisId);
    
    // Add onboarding slots to busy list
    onboardings.forEach(onboarding => {
      if (onboarding.slotWindow) {
        let startH, endH;
        
        // Try to parse underscore format (e.g., "14_17")
        if (onboarding.slotWindow.includes('_')) {
          const parts = onboarding.slotWindow.split('_');
          if (parts.length === 2) {
            startH = parseInt(parts[0], 10);
            endH = parseInt(parts[1], 10);
          }
        } 
        // Try to parse human-readable format (e.g., "2 PM - 5 PM" or "10 AM - 1 PM")
        else if (onboarding.slotWindow.includes('–') || onboarding.slotWindow.includes('-')) {
          const slotMap = {
            '10 AM – 1 PM': { start: 10, end: 13 },
            '10 AM - 1 PM': { start: 10, end: 13 },
            '2 PM – 5 PM': { start: 14, end: 17 },
            '2 PM - 5 PM': { start: 14, end: 17 },
            '6 PM – 7 PM': { start: 18, end: 19 },
            '6 PM - 7 PM': { start: 18, end: 19 },
            '10 AM – 12 PM': { start: 10, end: 12 },
            '10 AM - 12 PM': { start: 10, end: 12 },
            '1 PM – 2 PM': { start: 13, end: 14 },
            '1 PM - 2 PM': { start: 13, end: 14 },
            '3 PM – 5 PM': { start: 15, end: 17 },
            '3 PM - 5 PM': { start: 15, end: 17 },
          };
          const mapped = slotMap[onboarding.slotWindow];
          if (mapped) {
            startH = mapped.start;
            endH = mapped.end;
          }
        }
        
        if (!isNaN(startH) && !isNaN(endH)) {
          const slotStart = new Date(year, month - 1, day, startH, 0, 0);
          const slotEnd = new Date(year, month - 1, day, endH, 0, 0);
          
          // Verify the dates are valid
          if (!isNaN(slotStart.getTime()) && !isNaN(slotEnd.getTime())) {
            busy.push({
              start: slotStart,
              end: slotEnd
            });
            console.log('[FREEBUSY] Adding onboarding slot:', {
              slotWindow: onboarding.slotWindow,
              start: slotStart.toISOString(),
              end: slotEnd.toISOString()
            });
          } else {
            console.warn('[FREEBUSY] Invalid date created from slot:', onboarding.slotWindow);
          }
        } else {
          console.warn('[FREEBUSY] Could not parse slot window:', onboarding.slotWindow);
        }
      }
    });
    
    console.log('[FREEBUSY] Total busy periods (calendar + database + onboardings):', busy.length);
    console.log('[FREEBUSY] All busy periods:', busy.map(b => ({
      start: b.start.toISOString(),
      end: b.end.toISOString()
    })));

    // helper: check overlap
    const overlaps = (a, b) => a.start < b.end && b.start < a.end;

    // Filter candidates that do NOT overlap with any busy interval
    const available = candidateSlots.filter(slot => {
      const overlappingWith = busy.filter(b => overlaps(slot, b));
      const isOverlapping = overlappingWith.length > 0;
      console.log(`[FREEBUSY] Slot ${slot.label}: ${slot.start.toISOString()} - ${slot.end.toISOString()}, overlapping: ${isOverlapping}`, 
        isOverlapping ? overlappingWith.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })) : 'FREE');
      return !isOverlapping;
    });

    // Shape response
    const result = available.map((s, idx) => ({
      id: `${idx}_${s.start.toISOString()}`,
      label: s.label,
      startTime: s.start.toISOString(),
      endTime: s.end.toISOString(),
    }));

    console.log('[FREEBUSY] Returning available slots:', result.length);
    res.json({ ok: true, data: result });
    
  } catch (e) {
    console.error('[FREEBUSY] General error:', e.message, e.stack);
    next(e);
  }
});


// POST /api/cancel-onboarding - Save cancelled onboarding data to Sheet2
app.post('/api/cancel-onboarding', async (req, res, next) => {
  try {
    console.log('[CANCEL-ONBOARDING] Received cancellation data:', req.body);
    
    const {
      booking,
      cancelledAt,
      cancellationReason,
      cancellationRemarks,
      cancelledBy
    } = req.body;

    // Validate required fields
    if (!booking || !cancelledAt || !cancellationReason) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: booking, cancelledAt, cancellationReason' });
    }

    // Find CIS user details
    const cisUser = CIS_USERS.find(cis => cis.id === booking.cisId);

    // Prepare row data for Sheet2 (cancelled onboardings)
    const rowData = [
      dayjs().format('YYYY-MM-DD HH:mm:ss'), // Timestamp
      booking.bookingRef || crypto.randomUUID(), // Booking Reference
      booking.portfolioManager || 'Unknown', // Portfolio Manager
      booking.ownerName || booking.name || 'Unknown', // Owner Name
      booking.phone || booking.ownerPhone || 'Unknown', // Owner Phone
      booking.email || booking.ownerEmail || 'Unknown', // Owner Email
      booking.rentOkId || booking.propertyId || 'Unknown', // RentOk ID
      booking.propertiesCount || booking.noOfProperties || 0, // No. of Properties
      booking.bedsCount || booking.noOfBeds || 0, // No. of Beds
      booking.subscriptionType || 'Base', // Subscription Type
      booking.soldPricePerBed || 0, // Sold Price per Bed
      booking.subscriptionStartDate || '', // Subscription Start Date
      booking.monthsBilled || 0, // Months Billed
      booking.freeMonths || 0, // Free Months
      booking.totalAmount || 0, // Original Total Amount
      booking.location || '', // Booking Location
      booking.mode || 'physical', // Mode
      cisUser?.name || 'Unknown', // CIS Person
      cisUser?.email || 'Unknown', // CIS Email
      booking.date || '', // Original Booking Date
      booking.slotWindow || '', // Original Time Slot
      'Cancelled', // Status
      cancelledAt, // Cancellation Date & Time
      cancellationReason, // Cancellation Reason
      cancellationRemarks || '', // Cancellation Remarks
      cancelledBy || 'Unknown', // Cancelled By
      booking.createdBy || 'Unknown', // Created By
      'Cancellation' // Source
    ];

    // Save to Sheet2
    try {
      if (!sheetsClient) {
        console.error('[CANCEL-ONBOARDING] Sheets client not initialized');
        return res.status(500).json({ ok: false, error: 'Sheets service not ready' });
      }

      // Check if Sheet2 exists, create if not
      const spreadsheet = await sheetsClient.spreadsheets.get({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID
      });

      const sheetExists = spreadsheet.data.sheets?.some(sheet => sheet.properties?.title === COMPLETE_ONBOARDING_SHEET_TAB_NAME);
      
      if (!sheetExists) {
        console.log('[CANCEL-ONBOARDING] Creating Sheet2');
        await sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: COMPLETE_ONBOARDING_SHEET_TAB_NAME
                }
              }
            }]
          }
        });
      }

      // Define headers for Sheet2 (cancelled onboardings)
      const headers = [
        'Timestamp', 'Booking Reference', 'Portfolio Manager', 'Owner Name', 'Owner Phone', 'Owner Email',
        'RentOk ID', 'No. of Properties', 'No. of Beds', 'Subscription Type', 'Sold Price per Bed',
        'Subscription Start Date', 'Months Billed', 'Free Months', 'Original Total Amount',
        'Booking Location', 'Mode', 'CIS Person', 'CIS Email', 'Original Booking Date',
        'Original Time Slot', 'Status', 'Cancellation Date & Time', 'Cancellation Reason',
        'Cancellation Remarks', 'Cancelled By', 'Created By', 'Source'
      ];

      // Check if headers exist, add if not
      const headerRange = `${COMPLETE_ONBOARDING_SHEET_TAB_NAME}!A1:AB1`; // Extended to AB for 28 columns
      const existingHeaders = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        range: headerRange
      });

      if (!existingHeaders.data.values || existingHeaders.data.values.length === 0) {
        console.log('[CANCEL-ONBOARDING] Adding headers to Sheet2');
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          range: headerRange,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] }
        });
      }

      // Append the cancellation data
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SALES_BOOKINGS_SHEET_ID,
        range: `${COMPLETE_ONBOARDING_SHEET_TAB_NAME}!A:AB`, // Extended to AB for 28 columns
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] }
      });

      console.log('[CANCEL-ONBOARDING] Successfully added cancellation data to Sheet2');
      
    } catch (sheetsError) {
      console.error('[CANCEL-ONBOARDING] Sheets error:', sheetsError);
      return res.status(500).json({ ok: false, error: 'Failed to save cancellation to sheets' });
    }

    res.json({ ok: true, message: 'Cancellation data saved successfully to Sheet2' });
  } catch (e) {
    console.error('POST /api/cancel-onboarding error:', e);
    next(e);
  }
});

// DELETE /api/calendar-event/:eventId - Delete calendar event to free up slot
app.delete('/api/calendar-event/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { cisEmail } = req.body;

    if (!eventId || !cisEmail) {
      return res.status(400).json({ ok: false, error: 'eventId and cisEmail are required' });
    }

    // Create dynamic auth for this specific CIS user
    let authConfig;
    
    if (GOOGLE_KEYFILE.startsWith('{')) {
      const credentials = JSON.parse(GOOGLE_KEYFILE);
      const tempKeyFile = '/tmp/google-credentials-delete-cal.json';
      fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
      authConfig = {
        keyFile: tempKeyFile,
        scopes: ['https://www.googleapis.com/auth/calendar'],
        subject: cisEmail,
      };
    } else {
      authConfig = {
        keyFile: GOOGLE_KEYFILE,
        scopes: ['https://www.googleapis.com/auth/calendar'],
        subject: cisEmail,
      };
    }
    
    const auth = new google.auth.JWT(authConfig);
    await auth.authorize();
    
    const dynamicCalendarClient = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.CALENDAR_ID || 'primary';

    // Delete the calendar event
    await dynamicCalendarClient.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all', // Notify attendees about cancellation
    });

    console.log('[CALENDAR] Event deleted successfully:', eventId);
    
    // Also delete the corresponding Booking record from MongoDB
    try {
      const deletedBooking = await Booking.findOneAndDelete({ calendarEventId: eventId });
      if (deletedBooking) {
        console.log('[CALENDAR] Booking record deleted from MongoDB:', deletedBooking._id);
      } else {
        console.log('[CALENDAR] No booking record found with calendarEventId:', eventId);
      }
    } catch (dbError) {
      console.error('[CALENDAR] Failed to delete booking from MongoDB:', dbError.message);
    }
    
    res.json({ ok: true, message: 'Calendar event and booking record deleted successfully' });
  } catch (e) {
    console.error('DELETE /api/calendar-event error:', e);
    next(e);
  }
});

// 13) Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
