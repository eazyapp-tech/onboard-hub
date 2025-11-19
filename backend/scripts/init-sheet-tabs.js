#!/usr/bin/env node
/**
 * Initializes the unified Google Sheet with the required tabs + headers.
 * Usage: node scripts/init-sheet-tabs.js
 */

const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const dotenv = require('dotenv');

const possibleEnvFiles = [
  path.join(__dirname, '..', '..', '.env'),
  path.join(__dirname, '..', '.env')
];

for (const envPath of possibleEnvFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const SHEET_ID = process.env.UNIVERSAL_SHEET_ID
  || '1FfAG2BJc9aK8cmnxoc6O90ArNNJw9_FIlhgHVDY6SWA';

if (!SHEET_ID) {
  console.error('❌ No sheet ID configured. Set UNIVERSAL_SHEET_ID or related env var.');
  process.exit(1);
}

const SALES_TAB_NAME = 'Sales';
const ONBOARDING_TAB_NAME = 'Onboarding';
const REFERRAL_TAB_NAME = 'Referral';
const ADDON_TAB_NAME = 'Add-on';
const TRAINING_TAB_NAME = 'Training';

const SALES_HEADERS = [
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

const ONBOARDING_HEADERS = [
  'Timestamp', 'Onboarding ID', 'Owner Name', 'Phone', 'Email', 'Brand Name',
  'City/Location', 'Budget/Total Amount', 'Property ID/RentOk ID', 'Property Name',
  'Portfolio Manager', 'Subscription Start Date', 'Subscription Summary',
  'Number of Properties', 'Number of Beds', 'Subscription Type', 'Price Per Bed',
  'Months Billed', 'Free Months', 'Booking Location', 'Mode (Physical/Virtual)',
  'CIS ID', 'Slot Window', 'Booking Date', 'Status', 'Onboarding Status',
  'Booking Reference', 'Calendar Event ID', 'Created By', 'Source', 'Preferences',
  'Notes', 'Move In Date', 'Attachment URL', 'CIS ID (Duplicate)'
];

const REFERRAL_HEADERS = [
  'Timestamp',
  'Referral ID',
  'Context',
  'Team Member Name',
  'Referrer Name',
  'Referrer Phone',
  'Referrer RentOk ID',
  'Referred Client Name',
  'Referred Client Phone',
  'Notes',
  'Created By'
];

const ADDON_HEADERS = [
  'Timestamp',
  'Sale ID',
  'Booking ID',
  'Booking Reference',
  'Customer Name',
  'Customer Phone',
  'Source',
  'Add-on Type',
  'Unit Price',
  'Quantity',
  'Subtotal',
  'Notes',
  'Total Amount',
  'Created By'
];

const TRAINING_HEADERS = [
  'Timestamp',
  'Training ID',
  'Booking Ref',
  'Owner Name',
  'Training Type',
  'Training Date',
  'Training Time',
  'Trainer Name',
  'Trainer Email',
  'Status',
  'Notes',
  'Created By'
];

function columnIndexToLetter(index) {
  let dividend = index;
  let columnName = '';
  
  while (dividend > 0) {
    let modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  
  return columnName;
}

async function ensureSheetTabExists(sheets, spreadsheetId, tabName) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitles = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || [];

  if (!sheetTitles.includes(tabName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: tabName }
          }
        }]
      }
    });
    console.log(`✅ Created tab: ${tabName}`);
  } else {
    console.log(`ℹ️ Tab already exists: ${tabName}`);
  }
}

async function ensureSheetHeaders(sheets, spreadsheetId, tabName, headers) {
  const lastColumn = columnIndexToLetter(headers.length);
  const headerRange = `${tabName}!A1:${lastColumn}1`;
  const existingHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: headerRange,
  });

  if (!existingHeaders.data.values || existingHeaders.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] }
    });
    console.log(`✅ Wrote headers for tab: ${tabName}`);
  } else {
    console.log(`ℹ️ Headers already present for tab: ${tabName}`);
  }
}

async function main() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS_PATH;
  const subject = process.env.GSUITE_IMPERSONATE_USER;

  if (!keyFile || !subject) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS (or GOOGLE_SHEET_CREDENTIALS_PATH) and GSUITE_IMPERSONATE_USER must be set');
    process.exit(1);
  }

  let authConfig;
  if (keyFile.startsWith('{')) {
    const credentials = JSON.parse(keyFile);
    const tempKeyFile = path.join(__dirname, '..', '..', 'tmp-google-credentials.json');
    fs.writeFileSync(tempKeyFile, JSON.stringify(credentials));
    authConfig = {
      keyFile: tempKeyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      subject,
    };
  } else {
    authConfig = {
      keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      subject,
    };
  }

  const auth = new google.auth.JWT(authConfig);
  await auth.authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`🔧 Initializing sheet ${SHEET_ID}`);

  await ensureSheetTabExists(sheets, SHEET_ID, SALES_TAB_NAME);
  await ensureSheetHeaders(sheets, SHEET_ID, SALES_TAB_NAME, SALES_HEADERS);

  await ensureSheetTabExists(sheets, SHEET_ID, ONBOARDING_TAB_NAME);
  await ensureSheetHeaders(sheets, SHEET_ID, ONBOARDING_TAB_NAME, ONBOARDING_HEADERS);

  await ensureSheetTabExists(sheets, SHEET_ID, REFERRAL_TAB_NAME);
  await ensureSheetHeaders(sheets, SHEET_ID, REFERRAL_TAB_NAME, REFERRAL_HEADERS);

  await ensureSheetTabExists(sheets, SHEET_ID, ADDON_TAB_NAME);
  await ensureSheetHeaders(sheets, SHEET_ID, ADDON_TAB_NAME, ADDON_HEADERS);

  await ensureSheetTabExists(sheets, SHEET_ID, TRAINING_TAB_NAME);
  await ensureSheetHeaders(sheets, SHEET_ID, TRAINING_TAB_NAME, TRAINING_HEADERS);

  console.log('🎉 Sheet tabs and headers are ready!');
}

main().catch(err => {
  console.error('❌ Failed to initialize sheet:', err);
  process.exit(1);
});

