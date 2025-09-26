# Render Environment Variables Setup

Based on the backend code analysis, here are the required environment variables that need to be configured on Render:

## Required Environment Variables

### Database Configuration
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name (default: test)

### Google Services Configuration
- `GOOGLE_APPLICATION_CREDENTIALS` - Google service account credentials (JSON string for Render)
- `GSUITE_IMPERSONATE_USER` - Email address to impersonate (e.g., your-email@your-domain.com)
- `DEALS_SHEET_ID` - Google Sheets ID for deals
- `BOOKINGS_SHEET_ID` - Google Sheets ID for bookings
- `SHEET_TAB_NAME` - Sheet tab name (default: Sheet1)
- `CALENDAR_ID` - Google Calendar ID

### Server Configuration
- `PORT` - Server port (Render will set this automatically)
- `NODE_ENV` - Environment (should be "production" for Render)
- `TIMEZONE` - Timezone (default: Asia/Kolkata)

## Critical Notes for Production

1. **GOOGLE_APPLICATION_CREDENTIALS**: On Render, this should be the entire JSON content of the service account key file as a string, not a file path.

2. **CORS Configuration**: The backend is already configured to allow `start.rentok.com` as an origin.

3. **502 Errors**: These are likely caused by:
   - Missing or incorrect `GOOGLE_APPLICATION_CREDENTIALS`
   - Missing `GSUITE_IMPERSONATE_USER`
   - Invalid Google service account permissions
   - Missing Google Sheets/Calendar IDs

## Verification Steps

1. Check that all environment variables are set in Render dashboard
2. Verify Google service account has proper permissions
3. Test the `/health` endpoint first
4. Test the `/api/freebusy` endpoint with valid parameters

## Example Values Format
```
MONGO_URL=mongodb+srv://[USERNAME]:[PASSWORD]@[CLUSTER].mongodb.net/?retryWrites=true&w=majority&appName=[APP_NAME]
DB_NAME=[YOUR_DATABASE_NAME]
GSUITE_IMPERSONATE_USER=[YOUR_EMAIL]@[YOUR_DOMAIN]
DEALS_SHEET_ID=[YOUR_GOOGLE_SHEET_ID]
BOOKINGS_SHEET_ID=[YOUR_GOOGLE_SHEET_ID]
SHEET_TAB_NAME=Sheet1
```

**⚠️ SECURITY NOTE**: Never commit actual credentials to version control. Use placeholder values only.

Additional variables:
```
CALENDAR_ID=[YOUR_GOOGLE_CALENDAR_ID]
NODE_ENV=production
TIMEZONE=Asia/Kolkata
```