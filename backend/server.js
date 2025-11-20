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
const nodemailer = require('nodemailer');

// 3) Basic app setup
const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

// simple local uploads (dev)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const upload = multer({ dest: uploadsDir }); // Disk storage for legacy endpoints

// Memory storage for MongoDB Buffer storage (onboarding files)
const uploadMemory = multer({ storage: multer.memoryStorage() });

// 4) Middlewares
app.use(helmet());

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'https://start.rentok.com',
  'https://frontend-frdf20knw-nimitjns-projects.vercel.app',
  'https://onboard-hun-backend-1.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any Vercel domain
    if (origin && origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
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
      'PATCH /api/onboarding/:id',
      'POST /api/sales-booking',
      'POST /api/referrals',
      'GET /api/referrals',
      'POST /api/sell-addon',
      'GET /api/trainings',
      'POST /api/trainings',
      'PATCH /api/trainings/:id',
      'GET /api/user-access',
      'GET /api/users-by-scope',
      'POST /api/seed-roles'
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
    // Completion data
    actualOnboardingDate: String,
    actualOnboardingTime: String,
    onboardingAddons: [{
      name: String,
      quantity: Number,
      unitPrice: Number
    }],
    attachmentUrls: {
      checklist: [{ 
        fileId: String, // MongoDB File document ID
        fileName: String, 
        publicUrl: String // Download URL: /api/file/{fileId}
      }],
      reviews: [{ 
        fileId: String, // MongoDB File document ID
        fileName: String, 
        publicUrl: String // Download URL: /api/file/{fileId}
      }]
    },
    // Cancellation data
    cancellationReason: String,
    cancellationRemarks: String,
    cancelledAt: String,
    cancelledBy: String,
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
    status: { type: String, default: 'scheduled', enum: ['scheduled', 'cancelled', 'completed'] }, // Add status field
  },
  { timestamps: true }
);

// File schema for storing PDFs as Buffer in MongoDB
const FileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    data: { type: Buffer, required: true }, // Binary data (PDF)
    contentType: { type: String, required: true }, // e.g., "application/pdf"
    fileSize: Number, // Size in bytes
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Onboarding = mongoose.model('Onboarding', OnboardingSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const File = mongoose.model('File', FileSchema);

const TrainingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true },
    bookingRef: String,
    ownerName: String,
    ownerPhone: String,
    trainingType: { type: String, enum: ['staff', 'redemo'], default: 'staff' },
    trainingDate: String,
    trainingTime: String,
    trainerId: String,
    trainerName: String,
    trainerEmail: String,
    status: { type: String, enum: ['scheduled', 'ongoing', 'completed', 'cancelled'], default: 'scheduled' },
    notes: String,
    createdBy: String,
  },
  { timestamps: true }
);

const Training = mongoose.model('Training', TrainingSchema);

// Role Assignment Schema for hierarchical access control
const RoleAssignmentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    scopes: [{
      scope: { type: String, enum: ['sales', 'onboarding', 'addon'], required: true },
      role: { type: String, enum: ['super_admin', 'manager', 'team_member'], required: true },
      teamName: String, // e.g., 'siddhant-team', 'ayush-team', 'onboarding-team'
      managerEmail: String, // For team members, who is their manager
    }],
    teamMembers: [String], // Array of email addresses of team members (for managers)
  },
  { timestamps: true }
);

const RoleAssignment = mongoose.model('RoleAssignment', RoleAssignmentSchema);

// 8) Google clients (Sheets + Calendar)
const GOOGLE_KEYFILE =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.GOOGLE_SHEET_CREDENTIALS_PATH;
// Unified Sheet ID - all operations use this single sheet
const UNIVERSAL_SHEET_ID = process.env.UNIVERSAL_SHEET_ID || '1FfAG2BJc9aK8cmnxoc6O90ArNNJw9_FIlhgHVDY6SWA';

// Tab names for the unified sheet
const SALES_TAB_NAME = 'Sales';
const ONBOARDING_TAB_NAME = 'Onboarding';
const REFERRAL_TAB_NAME = 'Referral';
const ADDON_TAB_NAME = 'Add-on';
const TRAINING_TAB_NAME = 'Training';

// Legacy sheet IDs (kept for backward compatibility if needed)
const DEALS_SHEET_ID = process.env.DEALS_SHEET_ID;
const BOOKINGS_SHEET_ID = process.env.BOOKINGS_SHEET_ID;
const SALES_BOOKINGS_SHEET_ID = '1vu_cSTYh8imEPCWe1Pdcmz_Dgsb6uVCtAPmotoxPXUk'; // Sales bookings sheet
const SHEET_TAB_NAME = process.env.SHEET_TAB_NAME || 'Sheet1';
const CLEAN_ONBOARDING_SHEET_TAB_NAME = 'Sheet4'; // Clean onboarding data in Sheet4
const SALES_SHEET_TAB_NAME = 'Sheet3'; // Sales bookings in Sheet3
const COMPLETE_ONBOARDING_SHEET_TAB_NAME = 'Sheet2'; // Complete onboarding data in Sheet2
const CALENDAR_ID = process.env.CALENDAR_ID;
const CLEAN_ONBOARDING_HEADERS = [
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
  'Add-ons Sold (Price, Quantity, Notes, Total Amount)'
];

// CIS Users data
const CIS_USERS = [
  { id: 'manish-arora', name: 'Manish Arora', email: 'manish.arora@eazyapp.tech' },
  { id: 'harsh-tulsyan', name: 'Harsh Tulsyan', email: 'harsh@eazyapp.tech' },
  { id: 'vikash-jarwal', name: 'Vikash Jarwal', email: 'vikash@eazyapp.tech' },
  { id: 'jyoti-kalra', name: 'Jyoti Kalra', email: 'jyoti@eazyapp.tech' },
  { id: 'megha-verma', name: 'Megha Verma', email: 'megha@eazyapp.tech' },
  { id: 'aditya-shrivastav', name: 'Aditya Shrivastav', email: 'aditya@eazyapp.tech' },
  { id: 'chandan-mishra', name: 'Chandan Mishra', email: 'chandan.m@eazyapp.tech' }
];

let sheetsClient, calendarClient;

// Email configuration
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // Your Gmail app password
  }
};

// Create email transporter
let emailTransporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransporter(EMAIL_CONFIG);
  console.log('[EMAIL] Gmail SMTP configured');
} else {
  console.warn('[EMAIL] Email credentials not configured - emails will not be sent');
}

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

// Email helper functions
async function sendEmail(to, subject, html) {
  if (!emailTransporter) {
    console.warn('[EMAIL] Email transporter not configured, skipping email to:', to);
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('[EMAIL] Email sent successfully to:', to, 'Message ID:', result.messageId);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send email to:', to, 'Error:', error.message);
    return false;
  }
}

function formatSlotWindow(slotWindow) {
  switch (slotWindow) {
    case '10_13': return '10 AM - 1 PM';
    case '14_17': return '2 PM - 5 PM';
    case '18_19': return '6 PM - 7 PM';
    default: return slotWindow;
  }
}

// Role Service Functions
async function getUserRoles(email) {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    const roleAssignment = await RoleAssignment.findOne({ email: normalizedEmail });
    return roleAssignment;
  } catch (error) {
    console.error('[ROLE] Error fetching user roles:', error);
    return null;
  }
}

async function getUserAccess(email) {
  if (!email) {
    return {
      scopes: [],
      teams: {},
      isSuperAdmin: false
    };
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const roleAssignment = await getUserRoles(normalizedEmail);
  
  if (!roleAssignment) {
    return {
      scopes: [],
      teams: {},
      isSuperAdmin: false
    };
  }
  
  const scopes = {};
  const teams = {};
  let isSuperAdmin = false;
  
  // Process each scope assignment
  for (const scopeAssignment of roleAssignment.scopes || []) {
    const { scope, role, teamName, managerEmail } = scopeAssignment;
    
    if (role === 'super_admin') {
      isSuperAdmin = true;
      // Super admin has access to all scopes
      scopes.sales = { level: 'super_admin', canAccess: true };
      scopes.onboarding = { level: 'super_admin', canAccess: true };
      scopes.addon = { level: 'super_admin', canAccess: true };
    } else {
      scopes[scope] = {
        level: role,
        canAccess: true,
        teamName: teamName,
        managerEmail: managerEmail
      };
      
      // If manager, include team members
      if (role === 'manager' && roleAssignment.teamMembers && roleAssignment.teamMembers.length > 0) {
        teams[scope] = roleAssignment.teamMembers;
      }
    }
  }
  
  // Add-on is always accessible
  if (!scopes.addon) {
    scopes.addon = { level: 'team_member', canAccess: true };
  }
  
  return {
    scopes,
    teams,
    isSuperAdmin,
    email: normalizedEmail
  };
}

async function getTeamMembersForManager(email, scope) {
  const normalizedEmail = email.toLowerCase().trim();
  const roleAssignment = await getUserRoles(normalizedEmail);
  
  if (!roleAssignment) return [];
  
  // Check if user is a manager for this scope
  const scopeAssignment = roleAssignment.scopes?.find(
    s => s.scope === scope && s.role === 'manager'
  );
  
  if (scopeAssignment && roleAssignment.teamMembers) {
    return roleAssignment.teamMembers;
  }
  
  return [];
}

function generatePortfolioManagerEmail(bookingData) {
  const cisUser = CIS_USERS.find(cis => cis.id === bookingData.cisId);
  const formattedSlot = formatSlotWindow(bookingData.slotWindow);
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Onboarding Booking Created</h2>
      
      <p>Hello ${bookingData.portfolioManager},</p>
      
      <p>A new onboarding has been scheduled for your client. Here are the details:</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">Booking Details</h3>
        <p><strong>Owner Name:</strong> ${bookingData.ownerName}</p>
        <p><strong>Owner Email:</strong> ${bookingData.ownerEmail}</p>
        <p><strong>Owner Phone:</strong> ${bookingData.ownerPhone}</p>
        <p><strong>RentOk ID:</strong> ${bookingData.rentokId}</p>
        <p><strong>Properties:</strong> ${bookingData.noOfProperties}</p>
        <p><strong>Beds:</strong> ${bookingData.noOfBeds}</p>
        <p><strong>Subscription:</strong> ${bookingData.subscriptionType}</p>
        <p><strong>Date:</strong> ${bookingData.date}</p>
        <p><strong>Time Slot:</strong> ${formattedSlot}</p>
        <p><strong>Location:</strong> ${bookingData.bookingLocation.replace('_', ' ')}</p>
        <p><strong>Mode:</strong> ${bookingData.mode}</p>
        <p><strong>Onboarding Person:</strong> ${cisUser?.name || 'TBD'}</p>
      </div>
      
      <p>Please ensure all necessary preparations are made for the onboarding session.</p>
      
      <p>Best regards,<br>RentOk Team</p>
    </div>
  `;
}

function generateOwnerEmail(bookingData) {
  const cisUser = CIS_USERS.find(cis => cis.id === bookingData.cisId);
  const formattedSlot = formatSlotWindow(bookingData.slotWindow);
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to RentOk! Your Onboarding Details Inside 🚀</h2>
      
      <p>Dear ${bookingData.ownerName},</p>
      
      <p>Welcome to RentOk! We're excited to have you on board. To ensure a smooth and efficient onboarding experience, please find all the details you need below to get started:</p>
      
      <h3 style="color: #1e40af;">Step 1: Download the RentOk App</h3>
      <p>Access RentOk on your mobile device for quick and easy property management.</p>
      <ul>
        <li><a href="https://play.google.com/store/apps/details?id=net.eazypg.eazypgmanager" style="color: #2563eb;">Playstore</a></li>
        <li><a href="https://apps.apple.com/in/app/rentok-manager/id6553993616" style="color: #2563eb;">Appstore</a></li>
      </ul>
      
      <h3 style="color: #1e40af;">Step 2: Add Your Property</h3>
      <p>Watch this helpful video to learn how to add your property to RentOk:</p>
      <p><a href="https://youtu.be/gMEb6L9OEDs?si=xAZo_0jFdkgN_8TM" style="color: #2563eb;">Property Addition Guide</a></p>
      
      <h3 style="color: #1e40af;">Step 3: Prepare Key Property Details</h3>
      <p>To make the onboarding process smoother, please have the following details ready for each of your properties:</p>
      <ol>
        <li>Tenant Name</li>
        <li>Phone Number</li>
        <li>Rent Amount</li>
        <li>Security Deposit</li>
        <li>Room Number</li>
        <li>Tenant Sharing (if applicable)</li>
      </ol>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">Your Onboarding Details:</h3>
        <p><strong>Onboarding Scheduled Time Slot:</strong> ${formattedSlot}</p>
        <p><strong>Onboarding Person:</strong> ${cisUser?.name || 'TBD'}</p>
        <p><strong>Portfolio Manager Name:</strong> ${bookingData.portfolioManager}</p>
        <p><strong>Number of Properties to Onboard:</strong> ${bookingData.noOfProperties}</p>
        <p><strong>Number of Beds to Onboard:</strong> ${bookingData.noOfBeds}</p>
        <p><strong>Date:</strong> ${bookingData.date}</p>
        <p><strong>Location:</strong> ${bookingData.bookingLocation.replace('_', ' ')}</p>
        <p><strong>Mode:</strong> ${bookingData.mode}</p>
      </div>
      
      <p>We're excited to help you get started with RentOk! If you have any questions or need assistance, feel free to reach out. We're here to make property management easier and more efficient for you.</p>
      
      <p>Welcome aboard,<br>The RentOk Team</p>
    </div>
  `;
}

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

const trainingZ = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
  bookingRef: z.string().optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  trainingType: z.enum(['staff', 'redemo']),
  trainingDate: z.string().min(1, 'trainingDate is required'),
  trainingTime: z.string().min(1, 'trainingTime is required'),
  trainerId: z.string().min(1, 'trainerId is required'),
  trainerName: z.string().min(1, 'trainerName is required'),
  trainerEmail: z.string().email(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
});

// 10) Helpers
async function appendToSheet({ spreadsheetId, tabName, values }) {
  if (!sheetsClient) throw new Error('Sheets client not ready');
  if (!spreadsheetId) throw new Error('Spreadsheet ID missing');
  const range = tabName ? `${tabName}!A:Z` : `${SHEET_TAB_NAME}!A:Z`;
  return sheetsClient.spreadsheets.values.append({
    spreadsheetId,
    range,
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
  
    // Always use 'primary' calendar for the impersonated CIS user
    // This ensures events are created on the correct user's calendar, not a hardcoded calendar
    const calendarId = 'primary';
    
    console.log('[CALENDAR] Creating event for CIS:', cisEmail, 'calendar:', calendarId);
    console.log('[CALENDAR] Impersonating user:', cisEmail, 'Calendar ID will be:', calendarId);
    console.log('[CALENDAR] Auth subject (impersonated user):', authConfig.subject);
  
    // Build attendees list, excluding the CIS user (organizer) to avoid duplicate entries
    const allAttendees = [
      ...(payload.attendees || []).map(a => ({ email: a.email, displayName: a.displayName })),
      ...(payload.email ? [{ email: payload.email, displayName: payload.fullName }] : []),
    ];
    
    // Filter out the CIS user from attendees since they're the organizer
    const filteredAttendees = allAttendees.filter(attendee => 
      attendee.email.toLowerCase() !== cisEmail.toLowerCase()
    );
  
    const event = {
      summary: payload.summary || `Visit/Call with ${payload.fullName}`,
      description: payload.description || '',
      start: { dateTime: payload.startTime, timeZone: TIMEZONE },
      end: { dateTime: payload.endTime, timeZone: TIMEZONE },
      location: payload.location || '',
      attendees: filteredAttendees.length > 0 ? filteredAttendees : undefined,
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
      parsed.brandName || '', // Brand Name
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
      await appendToSheet({ 
        spreadsheetId: UNIVERSAL_SHEET_ID, 
        tabName: ONBOARDING_TAB_NAME,
        values 
      });
      doc.sheetSynced = true;
      await doc.save();
      console.log('[Sheets] Successfully appended to Onboarding tab');
    } catch (e) {
      console.error('[Sheets] Append failed:', e.message);
    }

    // Send emails after successful creation
    try {
      const bookingData = {
        portfolioManager: parsed.portfolioManager,
        ownerName: doc.name,
        ownerEmail: doc.email,
        ownerPhone: doc.phone,
        rentokId: doc.propertyId,
        noOfProperties: parsed.noOfProperties,
        noOfBeds: parsed.noOfBeds,
        subscriptionType: parsed.subscriptionType,
        date: parsed.date,
        slotWindow: parsed.slotWindow,
        bookingLocation: parsed.bookingLocation,
        mode: parsed.mode,
        cisId: parsed.cisId
      };

      // Send email to portfolio manager
      if (parsed.portfolioManager && parsed.portfolioManager !== 'System') {
        const portfolioManagerEmail = `${parsed.portfolioManager.toLowerCase().replace(/\s+/g, '.')}@eazyapp.tech`;
        await sendEmail(
          portfolioManagerEmail,
          'New Onboarding Booking Created - RentOk',
          generatePortfolioManagerEmail(bookingData)
        );
      }

      // Send email to owner
      if (doc.email) {
        await sendEmail(
          doc.email,
          'Welcome to RentOk! Your Onboarding Details Inside 🚀',
          generateOwnerEmail(bookingData)
        );
      }
    } catch (emailError) {
      console.error('[EMAIL] Failed to send onboarding emails:', emailError.message);
      // Don't fail the request if emails fail
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
      
      // Convert IST hour to UTC hour
      // IST is UTC+5:30, so we need to subtract 5:30 from IST to get UTC
      let utcHour = hour - 5;
      let utcMinute = min - 30;
      
      // Handle minute underflow
      if (utcMinute < 0) {
        utcMinute += 60;
        utcHour -= 1;
      }
      
      // Handle hour underflow (crosses to previous day)
      let utcDay = d;
      let utcMonth = m - 1;
      let utcYear = y;
      if (utcHour < 0) {
        utcHour += 24;
        utcDay -= 1;
        if (utcDay < 1) {
          utcMonth -= 1;
          if (utcMonth < 0) {
            utcMonth = 11;
            utcYear -= 1;
          }
          // Get last day of previous month
          utcDay = new Date(utcYear, utcMonth + 1, 0).getDate();
        }
      }
      
      return new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHour, utcMinute, 0, 0));
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

    // check conflicts on the CIS calendar using FreeBusy (in IST)
    const timeMin = makeDate(0, 0); // 00:00 IST
    const timeMax = makeDate(23, 59); // 23:59 IST

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

// GET /api/onboarding/:id - Get a single onboarding record
app.get('/api/onboarding/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const onboarding = await Onboarding.findById(id);
    if (!onboarding) {
      return res.status(404).json({ ok: false, error: 'Onboarding not found' });
    }
    res.json({ ok: true, data: onboarding });
  } catch (e) {
    next(e);
  }
});

// GET /api/user-access - Get user's access permissions and available dashboards
app.get('/api/user-access', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email parameter is required' });
    }
    
    const access = await getUserAccess(email);
    res.json({ ok: true, data: access });
  } catch (e) {
    console.error('[API] Error fetching user access:', e);
    next(e);
  }
});

// GET /api/users-by-scope - Get all users for a specific scope (for super admins)
app.get('/api/users-by-scope', async (req, res, next) => {
  try {
    const { scope } = req.query;
    if (!scope || !['sales', 'onboarding', 'addon'].includes(scope)) {
      return res.status(400).json({ ok: false, error: 'Valid scope parameter is required (sales, onboarding, or addon)' });
    }
    
    const users = await RoleAssignment.find({
      'scopes.scope': scope
    }).select('email scopes');
    
    const userList = users.map(u => ({
      email: u.email,
      role: u.scopes.find(s => s.scope === scope)?.role || 'team_member',
      teamName: u.scopes.find(s => s.scope === scope)?.teamName
    }));
    
    res.json({ ok: true, data: userList });
  } catch (e) {
    console.error('[API] Error fetching users by scope:', e);
    next(e);
  }
});

// POST /api/seed-roles - Seed role assignments (staging/local only)
app.post('/api/seed-roles', async (req, res, next) => {
  try {
    // Security: Only allow in staging or local, or with secret token
    const isStaging = NODE_ENV === 'staging' || process.env.RENDER_SERVICE_NAME?.includes('staging');
    const isLocal = NODE_ENV === 'development' || NODE_ENV === 'test';
    const providedToken = req.headers['x-seed-token'] || req.body?.token;
    const expectedToken = process.env.SEED_ROLES_TOKEN;
    
    if (!isStaging && !isLocal && providedToken !== expectedToken) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Seed endpoint is only available in staging/local environments or with valid token' 
      });
    }

    console.log('[SEED] Starting role seeding...');

    // Clear existing roles (optional - comment out if you want to preserve existing)
    await RoleAssignment.deleteMany({});
    console.log('[SEED] Cleared existing role assignments');

    // Super Admins - All dashboards visible
    const superAdmins = [
      { email: 'pankaj@eazyapp.tech', name: 'Pankaj Arora' },
      { email: 'aditya@eazyapp.tech', name: 'Aditya Shrivastav' },
      { email: 'jiya@eazyapp.tech', name: 'Jiya' },
    ];

    for (const admin of superAdmins) {
      await RoleAssignment.findOneAndUpdate(
        { email: admin.email.toLowerCase() },
        {
          email: admin.email.toLowerCase(),
          scopes: [
            { scope: 'sales', role: 'super_admin' },
            { scope: 'onboarding', role: 'super_admin' },
            { scope: 'addon', role: 'super_admin' }
          ],
          teamMembers: []
        },
        { upsert: true, new: true }
      );
      console.log(`[SEED] Created super admin: ${admin.email}`);
    }

    // Siddhant's Sales Team
    const siddhantTeam = [
      'prashant@eazyapp.tech',
      'abhishek.wadia@eazyapp.tech',
      'aditis@eazyapp.tech',
      'meghav@eazyapp.tech'
    ];

    // Siddhant - Sales Manager
    await RoleAssignment.findOneAndUpdate(
      { email: 'siddhant.goswami@eazyapp.tech' },
      {
        email: 'siddhant.goswami@eazyapp.tech',
        scopes: [
          { scope: 'sales', role: 'manager', teamName: 'siddhant-team' },
          { scope: 'addon', role: 'team_member' }
        ],
        teamMembers: siddhantTeam
      },
      { upsert: true, new: true }
    );
    console.log('[SEED] Created Siddhant (Sales Manager)');

    // Siddhant's team members
    for (const memberEmail of siddhantTeam) {
      await RoleAssignment.findOneAndUpdate(
        { email: memberEmail.toLowerCase() },
        {
          email: memberEmail.toLowerCase(),
          scopes: [
            { scope: 'sales', role: 'team_member', teamName: 'siddhant-team', managerEmail: 'siddhant.goswami@eazyapp.tech' },
            { scope: 'addon', role: 'team_member' }
          ],
          teamMembers: []
        },
        { upsert: true, new: true }
      );
      console.log(`[SEED] Created team member: ${memberEmail}`);
    }

    // Ayush's Sales Team
    const ayushTeam = [
      'harsh@eazyapp.tech',
      'somesh.g@eazyapp.tech',
      'shradda.s@eazyapp.tech',
      'akash.k@eazyapp.tech',
      'sanjeev@eazyapp.tech'
    ];

    // Ayush - Sales Manager
    await RoleAssignment.findOneAndUpdate(
      { email: 'ayush@eazyapp.tech' },
      {
        email: 'ayush@eazyapp.tech',
        scopes: [
          { scope: 'sales', role: 'manager', teamName: 'ayush-team' },
          { scope: 'addon', role: 'team_member' }
        ],
        teamMembers: ayushTeam
      },
      { upsert: true, new: true }
    );
    console.log('[SEED] Created Ayush (Sales Manager)');

    // Ayush's team members
    for (const memberEmail of ayushTeam) {
      await RoleAssignment.findOneAndUpdate(
        { email: memberEmail.toLowerCase() },
        {
          email: memberEmail.toLowerCase(),
          scopes: [
            { scope: 'sales', role: 'team_member', teamName: 'ayush-team', managerEmail: 'ayush@eazyapp.tech' },
            { scope: 'addon', role: 'team_member' }
          ],
          teamMembers: []
        },
        { upsert: true, new: true }
      );
      console.log(`[SEED] Created team member: ${memberEmail}`);
    }

    // Onboarding Team
    const onboardingTeam = [
      'harsh@eazyapp.tech',
      'vikash.b@eazyapp.tech',
      'jyoti.k@eazyapp.tech',
      'meghav@eazyapp.tech',
      'aditya@eazyapp.tech',
      'chandan.m@eazyapp.tech'
    ];

    // Manish - Onboarding Manager
    await RoleAssignment.findOneAndUpdate(
      { email: 'manish.arora@eazyapp.tech' },
      {
        email: 'manish.arora@eazyapp.tech',
        scopes: [
          { scope: 'onboarding', role: 'manager', teamName: 'onboarding-team' },
          { scope: 'addon', role: 'team_member' }
        ],
        teamMembers: onboardingTeam
      },
      { upsert: true, new: true }
    );
    console.log('[SEED] Created Manish (Onboarding Manager)');

    // Onboarding team members
    for (const memberEmail of onboardingTeam) {
      // Check if user already has sales role (e.g., Harsh, Megha, Aditya)
      const existing = await RoleAssignment.findOne({ email: memberEmail.toLowerCase() });
      
      if (existing) {
        // Add onboarding scope to existing record
        const hasOnboarding = existing.scopes.some(s => s.scope === 'onboarding');
        if (!hasOnboarding) {
          existing.scopes.push({
            scope: 'onboarding',
            role: 'team_member',
            teamName: 'onboarding-team',
            managerEmail: 'manish.arora@eazyapp.tech'
          });
          await existing.save();
          console.log(`[SEED] Added onboarding role to existing user: ${memberEmail}`);
        }
      } else {
        // Create new record
        await RoleAssignment.findOneAndUpdate(
          { email: memberEmail.toLowerCase() },
          {
            email: memberEmail.toLowerCase(),
            scopes: [
              { scope: 'onboarding', role: 'team_member', teamName: 'onboarding-team', managerEmail: 'manish.arora@eazyapp.tech' },
              { scope: 'addon', role: 'team_member' }
            ],
            teamMembers: []
          },
          { upsert: true, new: true }
        );
        console.log(`[SEED] Created onboarding team member: ${memberEmail}`);
      }
    }

    // Additional sales users (if any)
    const additionalSalesUsers = [
      'amit@eazyapp.tech',
      'bharat.k@eazyapp.tech',
      'kamalkant.u@eazyapp.tech'
    ];

    for (const memberEmail of additionalSalesUsers) {
      const existing = await RoleAssignment.findOne({ email: memberEmail.toLowerCase() });
      if (!existing) {
        await RoleAssignment.findOneAndUpdate(
          { email: memberEmail.toLowerCase() },
          {
            email: memberEmail.toLowerCase(),
            scopes: [
              { scope: 'sales', role: 'team_member' },
              { scope: 'addon', role: 'team_member' }
            ],
            teamMembers: []
          },
          { upsert: true, new: true }
        );
        console.log(`[SEED] Created additional sales user: ${memberEmail}`);
      }
    }

    console.log('[SEED] Role seeding completed successfully!');
    
    // Get summary
    const totalRoles = await RoleAssignment.countDocuments();
    const superAdminCount = await RoleAssignment.countDocuments({ 'scopes.role': 'super_admin' });
    const managerCount = await RoleAssignment.countDocuments({ 'scopes.role': 'manager' });
    
    res.json({ 
      ok: true, 
      message: 'Roles seeded successfully',
      summary: {
        totalUsers: totalRoles,
        superAdmins: superAdminCount,
        managers: managerCount
      }
    });
  } catch (e) {
    console.error('[SEED] Error seeding roles:', e);
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

// POST /api/upload-onboarding-files - Upload multiple files for onboarding completion
// Accepts: checklist[] and reviews[] as file arrays via FormData
// Stores files as Buffer in MongoDB instead of filesystem
app.post('/api/upload-onboarding-files', uploadMemory.fields([
  { name: 'checklist', maxCount: 10 },
  { name: 'reviews', maxCount: 10 }
]), async (req, res, next) => {
  try {
    console.log('[UPLOAD-ONBOARDING-FILES] Received file upload request');
    
    const checklistFiles = req.files?.checklist || [];
    const reviewsFiles = req.files?.reviews || [];
    
    if (checklistFiles.length === 0 && reviewsFiles.length === 0) {
      return res.status(400).json({ ok: false, error: 'No files provided' });
    }

    // Store checklist files in MongoDB as Buffer
    const checklistFilesData = await Promise.all(
      checklistFiles.map(async (file) => {
        const fileDoc = new File({
          fileName: file.originalname,
          data: file.buffer, // Store binary data as Buffer
          contentType: file.mimetype || 'application/pdf',
          fileSize: file.size
        });
        await fileDoc.save();
        return {
          fileId: fileDoc._id.toString(),
          fileName: fileDoc.fileName,
          publicUrl: `/api/file/${fileDoc._id}` // Use MongoDB ID for download
        };
      })
    );

    // Store reviews files in MongoDB as Buffer
    const reviewsFilesData = await Promise.all(
      reviewsFiles.map(async (file) => {
        const fileDoc = new File({
          fileName: file.originalname,
          data: file.buffer, // Store binary data as Buffer
          contentType: file.mimetype || 'application/pdf',
          fileSize: file.size
        });
        await fileDoc.save();
        return {
          fileId: fileDoc._id.toString(),
          fileName: fileDoc.fileName,
          publicUrl: `/api/file/${fileDoc._id}` // Use MongoDB ID for download
        };
      })
    );

    console.log('[UPLOAD-ONBOARDING-FILES] Files stored in MongoDB:', {
      checklist: checklistFilesData.length,
      reviews: reviewsFilesData.length
    });

    res.json({
      ok: true,
      attachments: {
        checklist: checklistFilesData,
        reviews: reviewsFilesData
      }
    });
  } catch (e) {
    console.error('[UPLOAD-ONBOARDING-FILES] Error:', e);
    next(e);
  }
});

// GET /api/file/:id - Download file from MongoDB by ID
app.get('/api/file/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid file ID' });
    }

    const file = await File.findById(id);
    
    if (!file) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }

    // Set appropriate headers for file download
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${file.fileName}"`,
      'Content-Length': file.data.length
    });

    // Send the file buffer
    res.send(file.data);
  } catch (e) {
    console.error('[GET-FILE] Error:', e);
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

    try {
      let authConfig;

      if (GOOGLE_KEYFILE.startsWith('{')) {
        const credentials = JSON.parse(GOOGLE_KEYFILE);
        const tempKeyFile = '/tmp/google-credentials-sales.json';
        fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
        authConfig = {
          keyFile: tempKeyFile,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          subject: process.env.GSUITE_IMPERSONATE_USER
        };
      } else {
        authConfig = {
          keyFile: GOOGLE_KEYFILE,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          subject: process.env.GSUITE_IMPERSONATE_USER
        };
      }

      const auth = new google.auth.JWT(authConfig);
      const sheets = google.sheets({ version: 'v4', auth });

      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: UNIVERSAL_SHEET_ID,
      });

      const sheetTitles = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || [];

      if (!sheetTitles.includes(SALES_TAB_NAME)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: UNIVERSAL_SHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: SALES_TAB_NAME
                }
              }
            }]
          }
        });
        console.log('[SALES-BOOKING] Created Sales tab');
      }

      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: UNIVERSAL_SHEET_ID,
        range: `${SALES_TAB_NAME}!A1:Z1`,
      });

      const existingHeaders = headerResponse.data.values?.[0] || [];

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

      const headersMatch = existingHeaders.length === requiredHeaders.length &&
        requiredHeaders.every((header, index) => existingHeaders[index] === header);

      if (!headersMatch) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: UNIVERSAL_SHEET_ID,
          range: `${SALES_TAB_NAME}!A1:AA1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [requiredHeaders]
          }
        });
        console.log('[SALES-BOOKING] Updated headers in Sales tab');
      }

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

      const formatLocation = (location) => {
        return location.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      const cisUser = CIS_USERS.find(cis => cis.id === bookingData.cisId);

      const rowData = [
        dayjs().format('YYYY-MM-DD HH:mm:ss'),
        bookingData.id || crypto.randomUUID(),
        bookingData.portfolioManager || '',
        bookingData.ownerName || '',
        bookingData.ownerPhone || '',
        bookingData.ownerEmail || '',
        bookingData.rentokId || '',
        bookingData.noOfProperties || 0,
        bookingData.noOfBeds || 0,
        bookingData.subscriptionType || 'Base',
        bookingData.soldPricePerBed || 0,
        bookingData.subscriptionStartDate || '',
        bookingData.monthsBilled || 0,
        bookingData.freeMonths || 0,
        bookingData.totalAmount || 0,
        formatLocation(bookingData.bookingLocation || ''),
        bookingData.mode === 'physical' ? 'Physical' : 'Virtual',
        cisUser?.name || '',
        cisUser?.email || '',
        bookingData.date || '',
        formatSlotWindow(bookingData.slotWindow || ''),
        bookingData.status || 'Scheduled',
        bookingData.bookingRef || '',
        bookingData.calendarEventId || '',
        bookingData.createdBy || '',
        'Sales Booking Form',
        bookingData.notes || ''
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: UNIVERSAL_SHEET_ID,
        range: `${SALES_TAB_NAME}!A:AA`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      });

      console.log('[SALES-BOOKING] Successfully added booking to Sales tab');

    } catch (sheetsError) {
      console.error('[SALES-BOOKING] Sheets error:', sheetsError);
    }

    res.json({ ok: true, message: 'Sales booking data updated successfully' });
  } catch (e) {
    console.error('POST /api/sales-booking error:', e);
    next(e);
  }
});

// Training endpoints
app.get('/api/trainings', async (req, res, next) => {
  try {
    const { createdBy } = req.query;
    const query = {};
    if (createdBy) {
      query.createdBy = createdBy;
    }
    const trainings = await Training.find(query).sort({ createdAt: -1 });
    res.json({ ok: true, data: trainings });
  } catch (e) {
    console.error('GET /api/trainings error:', e);
    next(e);
  }
});

app.post('/api/trainings', async (req, res, next) => {
  try {
    const parsed = trainingZ.parse(req.body);

    let ownerName = parsed.ownerName;
    let ownerPhone = parsed.ownerPhone;
    let bookingRef = parsed.bookingRef;

    if (!ownerName || !ownerPhone || !bookingRef) {
      const onboarding = await Onboarding.findById(parsed.bookingId);
      if (onboarding) {
        ownerName = onboarding.name || ownerName;
        ownerPhone = onboarding.phone || ownerPhone;
        bookingRef = onboarding.propertyId || bookingRef;
      }
    }

    const training = await Training.create({
      bookingId: parsed.bookingId,
      bookingRef,
      ownerName,
      ownerPhone,
      trainingType: parsed.trainingType,
      trainingDate: parsed.trainingDate,
      trainingTime: parsed.trainingTime,
      trainerId: parsed.trainerId,
      trainerName: parsed.trainerName,
      trainerEmail: parsed.trainerEmail,
      status: parsed.status || 'scheduled',
      notes: parsed.notes,
      createdBy: parsed.createdBy || 'System',
    });

    res.status(201).json({ ok: true, data: training });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Invalid payload', details: e.flatten() });
    }
    console.error('POST /api/trainings error:', e);
    next(e);
  }
});

app.patch('/api/trainings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const allowedFields = [
      'trainingType',
      'trainingDate',
      'trainingTime',
      'trainerId',
      'trainerName',
      'trainerEmail',
      'status',
      'notes',
    ];

    const sanitizedUpdates = {};
    allowedFields.forEach((field) => {
      if (typeof updates[field] !== 'undefined') {
        sanitizedUpdates[field] = updates[field];
      }
    });

    sanitizedUpdates.updatedAt = new Date();

    const updated = await Training.findByIdAndUpdate(id, sanitizedUpdates, { new: true });
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Training not found' });
    }

    res.json({ ok: true, data: updated });
  } catch (e) {
    console.error('PATCH /api/trainings/:id error:', e);
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
        console.log('sheetsClient', sheetsClient);
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

      try {
        const cleanSheetExists = spreadsheet.data.sheets?.some(sheet => sheet.properties?.title === CLEAN_ONBOARDING_SHEET_TAB_NAME);

        if (!cleanSheetExists) {
          console.log('[COMPLETE-ONBOARDING] Creating Clean Onboarding Sheet tab');
          await sheetsClient.spreadsheets.batchUpdate({
            spreadsheetId: SALES_BOOKINGS_SHEET_ID,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: CLEAN_ONBOARDING_SHEET_TAB_NAME
                  }
                }
              }]
            }
          });
        }

        const cleanHeaderResponse = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          range: `${CLEAN_ONBOARDING_SHEET_TAB_NAME}!A1:O1`,
        });

        const existingCleanHeaders = cleanHeaderResponse.data.values?.[0] || [];
        const cleanHeadersMatch = existingCleanHeaders.length === CLEAN_ONBOARDING_HEADERS.length &&
          CLEAN_ONBOARDING_HEADERS.every((header, index) => existingCleanHeaders[index] === header);

        if (!cleanHeadersMatch) {
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SALES_BOOKINGS_SHEET_ID,
            range: `${CLEAN_ONBOARDING_SHEET_TAB_NAME}!A1:O1`,
            valueInputOption: 'RAW',
            requestBody: { values: [CLEAN_ONBOARDING_HEADERS] }
          });
          console.log('[COMPLETE-ONBOARDING] Updated headers in Clean Onboarding Sheet tab');
        }

        const normalizedAddons = Array.isArray(addons)
          ? addons.map((addon, idx) => {
              const unitPrice = Number(addon?.unitPrice) || 0;
              const quantity = Number(addon?.quantity) && Number(addon.quantity) > 0 ? Number(addon.quantity) : 0;
              const notes = addon?.notes || '';
              return {
                name: addon?.name || `Add-on ${idx + 1}`,
                unitPrice,
                quantity,
                notes,
                total: unitPrice * quantity
              };
            })
          : [];

        const addonsDetail = normalizedAddons.length
          ? normalizedAddons
              .map((addon, idx) => `#${idx + 1}: ${addon.name} | Price: ₹${addon.unitPrice} | Qty: ${addon.quantity} | Notes: ${addon.notes || 'NA'} | Total: ₹${addon.total}`)
              .join(' ; ')
          : '';

        const addonsTotalAmount = normalizedAddons.reduce((sum, addon) => sum + addon.total, 0);

        const cleanRowData = [
          booking.id || booking.bookingRef || crypto.randomUUID(),
          booking.portfolioManager || '',
          booking.ownerName || booking.name || '',
          booking.ownerPhone || booking.phone || '',
          booking.ownerEmail || booking.email || '',
          booking.rentOkId || booking.propertyId || '',
          booking.noOfProperties || booking.propertiesCount || 0,
          booking.noOfBeds || booking.bedsCount || 0,
          booking.subscriptionType || 'Base',
          booking.soldPricePerBed || 0,
          booking.subscriptionStartDate || '',
          booking.monthsBilled || 0,
          booking.freeMonths || 0,
          booking.totalAmount || 0,
          normalizedAddons.length
            ? `${addonsDetail}${addonsTotalAmount ? ` | Total Add-ons: ₹${addonsTotalAmount}` : ''}`
            : ''
        ];

        await sheetsClient.spreadsheets.values.append({
          spreadsheetId: SALES_BOOKINGS_SHEET_ID,
          range: `${CLEAN_ONBOARDING_SHEET_TAB_NAME}!A:O`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [cleanRowData] }
        });

        console.log('[COMPLETE-ONBOARDING] Added booking to Clean Onboarding Sheet tab');
      } catch (cleanSheetError) {
        console.error('[COMPLETE-ONBOARDING] Clean sheet update error:', cleanSheetError);
      }

    } catch (sheetsError) {
      console.error('[COMPLETE-ONBOARDING] Sheets error:', sheetsError);
      console.error('[COMPLETE-ONBOARDING] Sheets error details:', sheetsError.message, sheetsError.stack);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to save to Sheet2: ' + sheetsError.message,
        details: sheetsError.toString()
      });
    }

    // Also save completion data to MongoDB
    try {
      // Process attachment URLs - support both object format {fileId, fileName, publicUrl} and any other format
      const processAttachmentFiles = (files) => {
        if (!files || !Array.isArray(files)) return [];
        return files
          .filter(file => file && typeof file === 'object' && file.publicUrl)
          .map(file => ({
            fileId: file.fileId || file._id || null, // MongoDB File document ID
            fileName: file.fileName || file.originalname || 'unknown',
            publicUrl: file.publicUrl // Download URL: /api/file/{fileId}
          }));
      };

      const checklistUrls = processAttachmentFiles(checklistFiles);
      const reviewsUrls = processAttachmentFiles(reviewsFiles);

      console.log('[COMPLETE-ONBOARDING] Processing attachments for MongoDB:', {
        checklistCount: checklistUrls.length,
        reviewsCount: reviewsUrls.length,
        checklist: checklistUrls,
        reviews: reviewsUrls
      });

      const completionData = {
        status: 'completed',
        actualOnboardingDate: completedAt.split('T')[0], // Extract date
        actualOnboardingTime: completedAt.split('T')[1]?.split('.')[0] || '', // Extract time
        onboardingAddons: addons || [],
        attachmentUrls: {
          checklist: checklistUrls,
          reviews: reviewsUrls
        },
        notes: notes || booking.notes || ''
      };

      if (booking.id) {
        const updated = await Onboarding.findByIdAndUpdate(booking.id, completionData, { new: true });
        if (updated) {
          console.log('[COMPLETE-ONBOARDING] Updated MongoDB with completion data for:', booking.id);
          console.log('[COMPLETE-ONBOARDING] MongoDB attachment URLs stored:', {
            checklist: updated.attachmentUrls?.checklist?.length || 0,
            reviews: updated.attachmentUrls?.reviews?.length || 0
          });
        } else {
          console.warn('[COMPLETE-ONBOARDING] MongoDB document not found with ID:', booking.id);
        }
      } else {
        console.warn('[COMPLETE-ONBOARDING] No booking.id provided, skipping MongoDB update');
      }
    } catch (mongoError) {
      console.error('[COMPLETE-ONBOARDING] MongoDB update error:', mongoError);
      console.error('[COMPLETE-ONBOARDING] MongoDB error details:', mongoError.message, mongoError.stack);
      // Log but don't fail if only MongoDB fails
    }

    res.json({ ok: true, message: 'Complete onboarding data saved successfully to Sheet2 and MongoDB' });
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

    // Build the slot templates (IST timezone)
    // helper to create a Date in IST (UTC+5:30)
    const mk = (h, m = 0) => {
      const year = Number(dateStr.slice(0,4));
      const month = Number(dateStr.slice(5,7)) - 1;
      const day = Number(dateStr.slice(8,10));
      
      // Convert IST hour to UTC hour
      // IST is UTC+5:30, so we need to subtract 5:30 from IST to get UTC
      let utcHour = h - 5;
      let utcMinute = m - 30;
      
      // Handle minute underflow
      if (utcMinute < 0) {
        utcMinute += 60;
        utcHour -= 1;
      }
      
      // Handle hour underflow (crosses to previous day)
      let utcDay = day;
      let utcMonth = month;
      let utcYear = year;
      if (utcHour < 0) {
        utcHour += 24;
        utcDay -= 1;
        if (utcDay < 1) {
          utcMonth -= 1;
          if (utcMonth < 0) {
            utcMonth = 11;
            utcYear -= 1;
          }
          // Get last day of previous month
          utcDay = new Date(utcYear, utcMonth + 1, 0).getDate();
        }
      }
      
      return new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHour, utcMinute, 0, 0));
    };

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
        { start: mk(12), end: mk(14), label: '12 PM – 2 PM (2h)' },
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

    // Ask Google for busy periods on that date (in IST)
    const timeMin = mk(0, 0); // 00:00 IST
    const timeMax = mk(23, 59); // 23:59 IST

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
        
        // Only consider events on the requested date (not spanning multiple days)
        const startDate = b.start.toISOString().split('T')[0];
        const endDate = b.end.toISOString().split('T')[0];
        if (startDate !== dateStr && endDate !== dateStr) {
          console.log('[FREEBUSY] Filtering out event not on requested date:', {
            start: b.start.toISOString(),
            end: b.end.toISOString(),
            requestedDate: dateStr
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
      'attendees.email': email, // Filter by CIS email in attendees
      status: { $ne: 'cancelled' } // Exclude cancelled bookings
    });
    
    console.log('[FREEBUSY] Found', dbBookings.length, 'non-cancelled bookings in Booking collection for this date and CIS:', email);
    
    // Add non-cancelled database bookings to busy list
    dbBookings.forEach(booking => {
      busy.push({
        start: new Date(booking.startTime),
        end: new Date(booking.endTime)
      });
      console.log('[FREEBUSY] Adding DB booking:', {
        start: booking.startTime,
        end: booking.endTime,
        attendees: booking.attendees,
        status: booking.status
      });
    });
    
    // ALSO check Onboarding collection for this CIS user and date
    // Parse the date to get year, month, day
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Query onboardings, excluding cancelled ones (check for both 'cancelled' and 'Cancelled')
    const allOnboardings = cisId ? await Onboarding.find({
      date: dateString,
      cisId: cisId
    }) : [];
    
    const onboardings = allOnboardings.filter(o => {
      const status = (o.status || '').toLowerCase();
      return status !== 'cancelled';
    });
    
    console.log('[FREEBUSY] Found', allOnboardings.length, 'total onboardings for this date and CIS:', cisId);
    console.log('[FREEBUSY] Found', onboardings.length, 'non-cancelled onboardings after filtering');
    console.log('[FREEBUSY] Cancelled onboardings:', allOnboardings.filter(o => {
      const status = (o.status || '').toLowerCase();
      return status === 'cancelled';
    }).map(o => ({ _id: o._id, status: o.status, calendarEventId: o.calendarEventId })));
    
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
          // Use the mk helper to create dates in IST
          const slotStart = mk(startH);
          const slotEnd = mk(endH);
          
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
      console.error('[CANCEL-ONBOARDING] Sheets error details:', sheetsError.message, sheetsError.stack);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to save cancellation to Sheet2: ' + sheetsError.message,
        details: sheetsError.toString()
      });
    }

    // Also save cancellation data to MongoDB
    // Try to find Onboarding by _id first, then by propertyId and name
    let onboardingRecord = null;
    let calendarEventDeleted = false;
    let calendarEventId = null;
    
    try {
      
      // First try direct ID match (most reliable)
      if (booking.id) {
        try {
          onboardingRecord = await Onboarding.findById(booking.id);
          if (onboardingRecord) {
            console.log('[CANCEL-ONBOARDING] Found Onboarding record by ID:', booking.id);
          }
        } catch (idError) {
          console.warn('[CANCEL-ONBOARDING] Invalid ID format:', booking.id, idError.message);
        }
      }
      
      // If not found by ID, try propertyId + name
      if (!onboardingRecord) {
        const propertyId = booking.rentOkId || booking.propertyId;
        const ownerName = booking.ownerName;
        if (propertyId && ownerName) {
          onboardingRecord = await Onboarding.findOne({ 
            propertyId: propertyId,
            name: ownerName
          }).sort({ createdAt: -1 }); // Get the most recent one
          if (onboardingRecord) {
            console.log('[CANCEL-ONBOARDING] Found Onboarding record by propertyId + name:', propertyId, ownerName);
          }
        }
      }
      
      if (onboardingRecord) {
        console.log('[CANCEL-ONBOARDING] Found Onboarding record, updating to cancelled:', onboardingRecord._id);
        onboardingRecord.status = 'cancelled'; // Use lowercase consistently
        onboardingRecord.cancellationReason = cancellationReason;
        onboardingRecord.cancellationRemarks = cancellationRemarks || '';
        onboardingRecord.cancelledAt = cancelledAt;
        onboardingRecord.cancelledBy = cancelledBy || 'Unknown';
        
        // Add to status history
        if (!onboardingRecord.statusHistory) {
          onboardingRecord.statusHistory = [];
        }
        onboardingRecord.statusHistory.push({
          status: 'Cancelled',
          at: new Date(cancelledAt),
          note: `Cancelled: ${cancellationReason}${cancellationRemarks ? ` - ${cancellationRemarks}` : ''}`
        });
        
        await onboardingRecord.save();
        console.log('[CANCEL-ONBOARDING] Updated MongoDB Onboarding record with cancellation data:', {
          _id: onboardingRecord._id,
          status: onboardingRecord.status,
          calendarEventId: onboardingRecord.calendarEventId,
          cancelledAt: onboardingRecord.cancelledAt
        });
        
        // Delete calendar event if it exists
        calendarEventId = onboardingRecord.calendarEventId;
        
        if (calendarEventId) {
          try {
            const cisUser = CIS_USERS.find(cis => cis.id === booking.cisId);
            const cisEmail = cisUser?.email;
            
            if (cisEmail) {
              console.log('[CANCEL-ONBOARDING] Deleting calendar event:', calendarEventId, 'for CIS:', cisEmail);
              
              // Create dynamic auth for this specific CIS user
              let authConfig;
              
              if (GOOGLE_KEYFILE.startsWith('{')) {
                const credentials = JSON.parse(GOOGLE_KEYFILE);
                const tempKeyFile = '/tmp/google-credentials-cancel-cal.json';
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
              const calendarId = 'primary';
              
              // Delete the calendar event
              await dynamicCalendarClient.events.delete({
                calendarId,
                eventId: calendarEventId,
                sendUpdates: 'all',
              });
              
              calendarEventDeleted = true;
              console.log('[CANCEL-ONBOARDING] ✅ Calendar event deleted successfully:', calendarEventId);
              
              // Mark the corresponding Booking record as cancelled
              const cancelledBooking = await Booking.findOneAndUpdate(
                { calendarEventId: calendarEventId },
                { status: 'cancelled' },
                { new: true }
              );
              if (cancelledBooking) {
                console.log('[CANCEL-ONBOARDING] ✅ Booking record marked as cancelled:', cancelledBooking._id);
              } else {
                console.warn('[CANCEL-ONBOARDING] No Booking record found with calendarEventId:', calendarEventId);
              }
            } else {
              console.warn('[CANCEL-ONBOARDING] Could not find CIS email for:', booking.cisId);
            }
          } catch (calendarError) {
            console.error('[CANCEL-ONBOARDING] ❌ Failed to delete calendar event:', calendarError.message);
            console.error('[CANCEL-ONBOARDING] Calendar error details:', calendarError);
            // Don't fail the whole request if calendar deletion fails, but log it
          }
        } else {
          console.warn('[CANCEL-ONBOARDING] No calendarEventId found in Onboarding record. Record:', {
            _id: onboardingRecord._id,
            calendarEventId: onboardingRecord.calendarEventId,
            status: onboardingRecord.status
          });
        }
        
        // Store for response (already set above)
      } else {
        console.warn('[CANCEL-ONBOARDING] Could not find Onboarding record to update. Searched with:', {
          id: booking.id,
          propertyId: booking.rentOkId || booking.propertyId,
          name: booking.ownerName
        });
        
        // Fallback: Try to find and cancel the Booking record directly if we have calendarEventId
        // This can happen if the Onboarding record wasn't created or has a different ID
        try {
          const bookingRecord = await Booking.findOne({
            $or: [
              { _id: booking.id },
              { propertyId: booking.rentOkId || booking.propertyId }
            ]
          });
          
          if (bookingRecord && bookingRecord.calendarEventId) {
            console.log('[CANCEL-ONBOARDING] Found Booking record with calendarEventId, attempting to delete calendar event');
            const cisUser = CIS_USERS.find(cis => cis.id === booking.cisId);
            const cisEmail = cisUser?.email;
            
            if (cisEmail) {
              // Create dynamic auth for this specific CIS user
              let authConfig;
              
              if (GOOGLE_KEYFILE.startsWith('{')) {
                const credentials = JSON.parse(GOOGLE_KEYFILE);
                const tempKeyFile = '/tmp/google-credentials-cancel-cal-fallback.json';
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
              const calendarId = 'primary';
              
              // Delete the calendar event
              await dynamicCalendarClient.events.delete({
                calendarId,
                eventId: bookingRecord.calendarEventId,
                sendUpdates: 'all',
              });
              
              console.log('[CANCEL-ONBOARDING] Calendar event deleted via fallback:', bookingRecord.calendarEventId);
              
              // Mark Booking as cancelled
              bookingRecord.status = 'cancelled';
              await bookingRecord.save();
              console.log('[CANCEL-ONBOARDING] Booking record marked as cancelled via fallback');
            }
          }
        } catch (fallbackError) {
          console.error('[CANCEL-ONBOARDING] Fallback calendar deletion failed:', fallbackError.message);
        }
      }
    } catch (mongoError) {
      console.error('[CANCEL-ONBOARDING] MongoDB update error:', mongoError);
      console.error('[CANCEL-ONBOARDING] MongoDB error details:', mongoError.message, mongoError.stack);
      // Log but don't fail if only MongoDB fails
    }

    // Return detailed response about what was cancelled
    const responseData = {
      ok: true,
      message: 'Cancellation data saved successfully',
      cancelled: {
        onboardingFound: !!onboardingRecord,
        onboardingId: onboardingRecord?._id?.toString(),
        calendarEventDeleted: calendarEventDeleted,
        calendarEventId: calendarEventId,
        status: onboardingRecord?.status || 'unknown'
      }
    };
    
    console.log('[CANCEL-ONBOARDING] Final cancellation result:', responseData.cancelled);
    
    res.json(responseData);
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
    // Always use 'primary' calendar for the impersonated CIS user
    // This ensures we delete from the correct user's calendar where the event was created
    const calendarId = 'primary';

    // Delete the calendar event
    await dynamicCalendarClient.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all', // Notify attendees about cancellation
    });

    console.log('[CALENDAR] Event deleted successfully:', eventId);
    
    // Mark the corresponding Booking record as cancelled instead of deleting it
    try {
      const cancelledBooking = await Booking.findOneAndUpdate(
        { calendarEventId: eventId },
        { status: 'cancelled' },
        { new: true }
      );
      if (cancelledBooking) {
        console.log('[CALENDAR] Booking record marked as cancelled in MongoDB:', cancelledBooking._id);
      } else {
        console.log('[CALENDAR] No booking record found with calendarEventId:', eventId);
      }
    } catch (dbError) {
      console.error('[CALENDAR] Failed to update booking status in MongoDB:', dbError.message);
    }
    
    // Also mark the corresponding Onboarding record as cancelled if it exists
    try {
      const cancelledOnboarding = await Onboarding.findOneAndUpdate(
        { calendarEventId: eventId },
        { 
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        },
        { new: true }
      );
      if (cancelledOnboarding) {
        console.log('[CALENDAR] Onboarding record marked as cancelled in MongoDB:', cancelledOnboarding._id);
      } else {
        console.log('[CALENDAR] No onboarding record found with calendarEventId:', eventId);
      }
    } catch (dbError) {
      console.error('[CALENDAR] Failed to update onboarding status in MongoDB:', dbError.message);
    }
    
    res.json({ ok: true, message: 'Calendar event deleted and booking record marked as cancelled successfully' });
  } catch (e) {
    console.error('DELETE /api/calendar-event error:', e);
    next(e);
  }
});

// 13) Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
