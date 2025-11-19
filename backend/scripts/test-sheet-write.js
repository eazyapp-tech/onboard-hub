require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const UNIVERSAL_SHEET_ID = process.env.UNIVERSAL_SHEET_ID || '1FfAG2BJc9aK8cmnxoc6O90ArNNJw9_FIlhgHVDY6SWA';
const ONBOARDING_TAB_NAME = 'Onboarding';
const SALES_TAB_NAME = 'Sales';

async function testSheetWrite() {
  try {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS_PATH;
    const subject = process.env.GSUITE_IMPERSONATE_USER;

    if (!keyFile || !subject) {
      console.error('❌ GOOGLE_APPLICATION_CREDENTIALS and GSUITE_IMPERSONATE_USER must be set');
      process.exit(1);
    }

    let authConfig;
    if (keyFile.startsWith('{')) {
      const credentials = JSON.parse(keyFile);
      const tempKeyFile = '/tmp/test-google-credentials.json';
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

    console.log('✅ Authenticated with Google Sheets API');
    console.log(`📊 Testing sheet: ${UNIVERSAL_SHEET_ID}\n`);

    // Test 1: Check if tabs exist
    console.log('Test 1: Checking if tabs exist...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: UNIVERSAL_SHEET_ID });
    const sheetTitles = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || [];
    
    console.log(`Found tabs: ${sheetTitles.join(', ')}\n`);
    
    const requiredTabs = [ONBOARDING_TAB_NAME, SALES_TAB_NAME, 'Referral', 'Add-on', 'Training'];
    const missingTabs = requiredTabs.filter(tab => !sheetTitles.includes(tab));
    
    if (missingTabs.length > 0) {
      console.log(`⚠️  Missing tabs: ${missingTabs.join(', ')}`);
    } else {
      console.log('✅ All required tabs exist\n');
    }

    // Test 2: Check headers for Onboarding tab
    console.log('Test 2: Checking Onboarding tab headers...');
    try {
      const headersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: UNIVERSAL_SHEET_ID,
        range: `${ONBOARDING_TAB_NAME}!A1:Z1`,
      });
      const headers = headersResponse.data.values?.[0] || [];
      console.log(`Found ${headers.length} headers in Onboarding tab`);
      if (headers.length > 0) {
        console.log(`First 5 headers: ${headers.slice(0, 5).join(', ')}...`);
      }
      console.log('✅ Onboarding tab headers check passed\n');
    } catch (e) {
      console.error('❌ Error checking Onboarding tab:', e.message);
    }

    // Test 3: Check headers for Sales tab
    console.log('Test 3: Checking Sales tab headers...');
    try {
      const headersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: UNIVERSAL_SHEET_ID,
        range: `${SALES_TAB_NAME}!A1:Z1`,
      });
      const headers = headersResponse.data.values?.[0] || [];
      console.log(`Found ${headers.length} headers in Sales tab`);
      if (headers.length > 0) {
        console.log(`First 5 headers: ${headers.slice(0, 5).join(', ')}...`);
      }
      console.log('✅ Sales tab headers check passed\n');
    } catch (e) {
      console.error('❌ Error checking Sales tab:', e.message);
    }

    // Test 4: Try to append a test row (optional - comment out if you don't want test data)
    console.log('Test 4: Testing write operation (appending test row to Onboarding tab)...');
    const testRow = [
      new Date().toISOString(),
      'TEST-' + Date.now(),
      'Test Owner',
      '1234567890',
      'test@example.com',
      'Test Brand',
      'Test City',
      0,
      'TEST-RENTOK-ID',
      '',
      'Test Manager',
      '',
      '',
      0,
      0,
      'Base',
      0,
      0,
      0,
      '',
      'physical',
      '',
      '',
      '',
      'scheduled',
      'Onboarding Started',
      'TEST-REF',
      '',
      'Test User',
      'Test Source',
      '',
      'Test Notes',
      '',
      '',
      ''
    ];

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: UNIVERSAL_SHEET_ID,
        range: `${ONBOARDING_TAB_NAME}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [testRow] }
      });
      console.log('✅ Successfully appended test row to Onboarding tab');
      console.log('⚠️  Note: A test row was added. You may want to delete it manually.\n');
    } catch (e) {
      console.error('❌ Error appending test row:', e.message);
      console.error('   This might indicate a permissions issue or incorrect sheet ID\n');
    }

    console.log('🎉 Sheet write test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

testSheetWrite();

