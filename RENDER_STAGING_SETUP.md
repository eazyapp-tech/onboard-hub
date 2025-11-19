# Setting Up Staging Backend on Render

This guide walks you through creating a staging/preview backend service on Render when you already have a production backend.

## Prerequisites

- Existing Render account with production backend service
- GitHub repository connected to Render
- Access to Render dashboard

---

## Step-by-Step Guide

### Step 1: Create a Staging Branch

First, create a `staging` branch in your repository:

```bash
# Make sure you're on main and it's up to date
git checkout main
git pull origin main

# Create and switch to staging branch
git checkout -b staging

# Push staging branch to GitHub
git push origin staging
```

---

### Step 2: Create New Render Service

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - You should see your existing "onboard hub backend" service

2. **Create New Web Service**
   - Click the **"New +"** button (top right)
   - Select **"Web Service"**

3. **Connect Repository**
   - If your repo is already connected, select it from the list
   - If not, click "Connect account" and authorize Render to access your GitHub

4. **Select Repository**
   - Choose your `Onboard-hub` repository
   - Click **"Connect"**

---

### Step 3: Configure Staging Service

Fill in the service configuration:

#### Basic Settings:
- **Name**: `onboard-hub-backend-staging` (or similar)
- **Region**: Same as production (for consistency)
- **Branch**: `staging` ⚠️ **Important: Change from `main` to `staging`**
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

#### Advanced Settings (Click "Advanced"):
- **Auto-Deploy**: `Yes` (deploys automatically on push to staging branch)
- **Health Check Path**: `/health`

Click **"Create Web Service"**

---

### Step 4: Configure Environment Variables

After the service is created, go to **Environment** tab:

1. **Copy from Production Service**
   - Go to your production service → Environment tab
   - Copy all environment variables
   - Return to staging service → Environment tab
   - Add each variable

2. **Key Environment Variables to Set:**
   ```
   MONGO_URL=<same as production or separate staging DB>
   DB_NAME=onboard-hub-staging (or same as production)
   PORT=10000 (Render auto-assigns, but you can set)
   NODE_ENV=staging
   
   GOOGLE_APPLICATION_CREDENTIALS=<same as production>
   GSUITE_IMPERSONATE_USER=<same as production>
   UNIVERSAL_SHEET_ID=<same sheet or test sheet>
   
   CLERK_SECRET_KEY=<same as production>
   ```

3. **Optional: Use Separate Resources**
   - **MongoDB**: You can use the same database or create a separate staging database
   - **Google Sheet**: You can use the same sheet or a test sheet
   - **Clerk**: Usually same keys work for both

4. **Add Staging-Specific Variables** (optional):
   ```
   ENVIRONMENT=staging
   LOG_LEVEL=debug
   ```

Click **"Save Changes"** - Render will automatically redeploy

---

### Step 5: Wait for First Deployment

1. **Monitor Build Logs**
   - Go to the **"Logs"** tab
   - Watch the build process
   - Should complete in 2-5 minutes

2. **Check Service Status**
   - Wait for status to show **"Live"** (green)
   - Service URL will be: `https://onboard-hub-backend-staging.onrender.com`

3. **Test Health Endpoint**
   - Visit: `https://onboard-hub-backend-staging.onrender.com/health`
   - Should return: `{"ok":true,"env":"staging"}`

---

### Step 6: Update Frontend Preview Environment

Now update your Vercel frontend to use staging backend for previews:

1. **Go to Vercel Dashboard**
   - Select your frontend project
   - Go to **Settings** → **Environment Variables**

2. **Update Preview Environment**
   - Find `BACKEND_URL` or `NEXT_PUBLIC_API_BASE_URL`
   - For **Preview** environment, set value to:
     ```
     https://onboard-hub-backend-staging.onrender.com
     ```
   - Keep **Production** environment pointing to production backend

3. **Redeploy Preview**
   - Any new preview deployment will now use staging backend

---

### Step 7: Test the Setup

1. **Test Staging Backend Directly**
   ```bash
   curl https://onboard-hub-backend-staging.onrender.com/health
   ```

2. **Test from Preview Frontend**
   - Create a feature branch
   - Push to GitHub
   - Vercel creates preview
   - Preview frontend should connect to staging backend

3. **Verify API Calls**
   - Open browser console in preview frontend
   - Check network tab
   - API calls should go to staging backend URL

---

## Workflow Going Forward

### Development Workflow:

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# 3. Frontend preview auto-deploys (Vercel)
# 4. To test backend changes, merge to staging:
git checkout staging
git merge feature/new-feature
git push origin staging
# Staging backend auto-deploys

# 5. Test everything in preview
# 6. After approval, merge to main:
git checkout main
git merge feature/new-feature
git push origin main
# Production deploys
```

---

## Service Comparison

| Setting | Production | Staging |
|---------|-----------|---------|
| **Name** | `onboard-hub-backend` | `onboard-hub-backend-staging` |
| **Branch** | `main` | `staging` |
| **URL** | `onboard-hub.onrender.com` | `onboard-hub-backend-staging.onrender.com` |
| **Database** | Production DB | Same or separate staging DB |
| **Sheet** | Production Sheet | Same or test sheet |
| **Auto-Deploy** | Yes (on main push) | Yes (on staging push) |

---

## Important Notes

### 1. **CORS Configuration**
Make sure your backend CORS allows your preview frontend domains:
- Add `*.vercel.app` to allowed origins
- Or add specific preview URLs

### 2. **Database Considerations**
- **Option A**: Use same MongoDB (simpler, but test data mixes with production)
- **Option B**: Use separate staging MongoDB (cleaner, but requires setup)

### 3. **Google Sheet**
- **Option A**: Use same sheet (simpler, but test data in production sheet)
- **Option B**: Create test sheet (cleaner, update `UNIVERSAL_SHEET_ID` in staging)

### 4. **Cost**
- Render free tier: Both services can run on free tier
- Each service gets 750 hours/month free
- After that, services sleep after 15 min inactivity

### 5. **Service Sleep**
- Free tier services sleep after 15 min inactivity
- First request after sleep takes ~30 seconds (cold start)
- Consider upgrading if you need always-on staging

---

## Troubleshooting

### Staging Service Won't Start
- Check build logs for errors
- Verify `package.json` has correct scripts
- Ensure `server.js` is in `backend/` directory

### Environment Variables Not Working
- Verify variables are saved (check for typos)
- Redeploy after changing env vars
- Check variable names match exactly (case-sensitive)

### CORS Errors in Preview
- Update backend CORS to allow `*.vercel.app`
- Or add specific preview domain to allowed origins

### Staging Backend Not Updating
- Verify branch is set to `staging` in Render
- Check if you pushed to correct branch
- Look at deployment logs

### Can't Connect to Staging Backend
- Check service is "Live" (not sleeping)
- Verify URL is correct
- Test health endpoint directly
- Check firewall/network settings

---

## Quick Reference Commands

```bash
# Create staging branch
git checkout -b staging
git push origin staging

# Deploy to staging
git checkout staging
git merge feature/your-feature
git push origin staging

# Deploy to production
git checkout main
git merge staging  # or merge feature directly
git push origin main
```

---

## Summary

✅ **Created staging branch**  
✅ **Created staging service on Render**  
✅ **Configured environment variables**  
✅ **Updated frontend preview to use staging backend**  
✅ **Tested the setup**  

Now you can:
- Test backend changes in staging before production
- Share preview links with team
- Deploy confidently to production after testing

Your staging backend URL: `https://onboard-hub-backend-staging.onrender.com`

