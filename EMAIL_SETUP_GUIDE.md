# Email Setup Guide for RentOk Onboarding Hub

## ✅ NEW: No App Passwords Needed!

The email system now uses **Gmail API with Domain-Wide Delegation** - the same authentication method used for Calendar and Sheets. This means:

- ✅ **No EMAIL_USER or EMAIL_PASS needed**
- ✅ **No app passwords required**
- ✅ **Emails are automatically sent from the assigned CIS user's email address**
- ✅ **Works for all users in your domain automatically**

## How It Works

When a booking is created:
1. The system identifies the assigned CIS person (e.g., Manish Arora)
2. Uses Domain-Wide Delegation to impersonate that user's email (manish.arora@eazyapp.tech)
3. Sends emails **from** that CIS user's email address **to**:
   - Portfolio Manager
   - Owner
   - CIS Person (themselves, as a notification)

## Setup Requirements

### 1. Google Workspace Domain-Wide Delegation

Make sure your Google Service Account has the **Gmail API scope** enabled:

1. Go to Google Admin Console: https://admin.google.com/
2. Navigate to **Security** → **API Controls** → **Domain-wide Delegation**
3. Find your service account (the one used for Calendar/Sheets)
4. Click **Edit** and add this scope:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```
5. Click **Save**

### 2. Verify Your Service Account

Your service account should already be configured (same one used for Calendar/Sheets):
- `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` file
- `GSUITE_IMPERSONATE_USER` in your `.env` file

### 3. That's It!

No additional setup needed. The system will automatically:
- Use the CIS user's email as the sender
- Send emails using Gmail API
- Work for all users in your domain

## Testing

Test the email functionality:

```bash
# Test email endpoint
curl "http://localhost:4000/api/test-email?to=your-email@example.com&from=cis-user@eazyapp.tech"
```

Or in browser:
```
http://localhost:4000/api/test-email?to=your-email@example.com&from=cis-user@eazyapp.tech
```

## What Emails Are Sent?

When a booking is created, emails are automatically sent:

1. **To Portfolio Manager** (from CIS user's email)
   - Subject: "New Onboarding Booking Created - RentOk"
   - Contains booking details

2. **To Owner** (from CIS user's email)
   - Subject: "Welcome to RentOk! Your Onboarding Details Inside 🚀"
   - Contains welcome message and onboarding details

3. **To CIS Person** (from their own email, as notification)
   - Subject: "Onboarding - [Brand Name]" or "Onboarding - [Owner Name]"
   - Contains session details and action items

## Troubleshooting

### Issue: "Email transporter not configured"
- **Solution**: This error shouldn't appear anymore. If it does, check that `GOOGLE_APPLICATION_CREDENTIALS` is set in your `.env` file

### Issue: "Gmail API scope not authorized"
- **Solution**: Make sure you've added `https://www.googleapis.com/auth/gmail.send` to your service account's Domain-Wide Delegation scopes in Google Admin Console

### Issue: "Authentication failed"
- **Solution**: Verify your service account credentials are correct
- **Solution**: Check that Domain-Wide Delegation is enabled for your service account

### Issue: Emails not being received
- **Solution**: Check your spam/junk folder
- **Solution**: Verify the recipient email address is correct
- **Solution**: Check backend logs for detailed error messages

## Benefits of This Approach

✅ **No per-user setup**: Works for all users automatically  
✅ **No app passwords**: Uses secure Domain-Wide Delegation  
✅ **Automatic sender**: Emails come from the assigned CIS user  
✅ **Consistent**: Uses same auth method as Calendar/Sheets  
✅ **Scalable**: Add new CIS users without any email setup  

## Migration Notes

If you previously had `EMAIL_USER` and `EMAIL_PASS` in your `.env` file:
- ✅ You can **remove them** - they're no longer needed
- ✅ The system will automatically use Gmail API instead
- ✅ No code changes needed on your end
