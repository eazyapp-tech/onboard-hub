# Vercel Project Settings Verification Checklist

Use this checklist to verify and configure your Vercel project for staging/preview deployments.

## 📍 Access Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Sign in with your account
3. Find your project (likely named `onboard-hub` or similar)

---

## ✅ Step 1: Verify Project Connection

### In Vercel Dashboard → Your Project → Settings → Git

Check the following:

- [ ] **Repository**: Should show `eazyapp-tech/onboard-hub` (or your repo)
- [ ] **Production Branch**: Should be `main` (or `master`)
- [ ] **Framework Preset**: Should be `Next.js` (auto-detected)
- [ ] **Root Directory**: Should be `frontend` (if your Next.js app is in frontend folder)
- [ ] **Build Command**: Should be `npm run build` or `next build`
- [ ] **Output Directory**: Should be `.next` (default for Next.js)
- [ ] **Install Command**: Should be `npm install`

**If Root Directory is wrong:**
- Click "Edit"
- Set Root Directory to: `frontend`
- Save

---

## ✅ Step 2: Verify Environment Variables

### In Vercel Dashboard → Your Project → Settings → Environment Variables

Check if these variables exist and are configured correctly:

### Required Variables:

#### For Production:
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Environment: **Production**
  - Value: Your production Clerk key (starts with `pk_live_...`)

- [ ] `CLERK_SECRET_KEY`
  - Environment: **Production**
  - Value: Your production Clerk secret (starts with `sk_live_...`)

- [ ] `BACKEND_URL` (if used in next.config.js)
  - Environment: **Production**
  - Value: `https://onboard-hub.onrender.com` (or your production backend URL)

#### For Preview (Staging):
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Environment: **Preview** ⚠️
  - Value: Same as production (or test key if you want separate)

- [ ] `CLERK_SECRET_KEY`
  - Environment: **Preview** ⚠️
  - Value: Same as production (or test key if you want separate)

- [ ] `BACKEND_URL` (if used in next.config.js)
  - Environment: **Preview** ⚠️
  - Value: `https://onboard-hub-backend-staging.onrender.com` (staging backend)

- [ ] `NEXT_PUBLIC_API_BASE_URL` (optional, if you want to override config.ts)
  - Environment: **Preview** ⚠️
  - Value: `https://onboard-hub-backend-staging.onrender.com`

#### For Development (Local):
- [ ] Same variables as Preview (optional, for local testing)

### How to Add/Edit Variables:

1. Click **"Add New"** or click on existing variable
2. Enter **Name** (e.g., `BACKEND_URL`)
3. Enter **Value** (e.g., `https://onboard-hub-backend-staging.onrender.com`)
4. Select **Environment(s)**:
   - ✅ **Production** - for main branch
   - ✅ **Preview** - for all other branches/PRs
   - ✅ **Development** - for local development (optional)
5. Click **"Save"**

---

## ✅ Step 3: Verify Build Settings

### In Vercel Dashboard → Your Project → Settings → General

Check:

- [ ] **Framework**: Next.js
- [ ] **Node.js Version**: 18.x or 20.x (recommended)
- [ ] **Build Command**: `npm run build` or `next build`
- [ ] **Output Directory**: `.next` (default)
- [ ] **Install Command**: `npm install`

### If Root Directory is `frontend`:

- [ ] **Root Directory**: `frontend` (should be set if Next.js is in frontend folder)

---

## ✅ Step 4: Verify Deployment Settings

### In Vercel Dashboard → Your Project → Settings → Git

Check:

- [ ] **Auto-Deploy**: Should be **Enabled**
- [ ] **Preview Deployments**: Should be **Enabled** (default)
- [ ] **Production Branch**: `main` (or `master`)

### Preview Deployment Settings:

- [ ] **Automatic Preview Deployments**: Enabled
  - This creates preview URLs for every branch/PR

---

## ✅ Step 5: Check Recent Deployments

### In Vercel Dashboard → Your Project → Deployments

Look for:

- [ ] Recent deployments from `main` branch (production)
- [ ] Any preview deployments from other branches
- [ ] Deployment status should be "Ready" (green)

### Test Preview Deployment:

1. Create a test branch:
   ```bash
   git checkout -b test-preview
   git push origin test-preview
   ```

2. Check Vercel dashboard:
   - [ ] New deployment should appear
   - [ ] Should show branch name: `test-preview`
   - [ ] Should have a preview URL like: `https://onboard-hub-abc123.vercel.app`

3. Click on the preview deployment:
   - [ ] Should show "Ready" status
   - [ ] Click "Visit" to open preview URL
   - [ ] Verify it loads correctly

---

## ✅ Step 6: Verify API Configuration

### Check if API calls work:

1. Open preview URL in browser
2. Open browser DevTools (F12) → Network tab
3. Use the app (try logging in or making an API call)
4. Check network requests:
   - [ ] API calls should go to: `https://onboard-hub-backend-staging.onrender.com`
   - [ ] Not to production backend
   - [ ] Not to localhost

### If API calls fail:

- Check CORS settings in staging backend
- Verify `BACKEND_URL` or `NEXT_PUBLIC_API_BASE_URL` is set for Preview
- Check browser console for errors

---

## ✅ Step 7: Verify Environment Detection

The frontend code should automatically detect the environment:

### Check `frontend/src/lib/config.ts`:

```typescript
// Should detect:
// - Production: uses production backend
// - Preview: uses staging backend  
// - Local: uses localhost
```

### Test in Preview:

1. Open preview URL
2. Open browser console
3. Check if API calls go to staging backend
4. Verify no errors in console

---

## 🔧 Common Issues & Fixes

### Issue: Preview uses production backend
**Fix**: 
- Set `BACKEND_URL` or `NEXT_PUBLIC_API_BASE_URL` for **Preview** environment
- Value should be: `https://onboard-hub-backend-staging.onrender.com`

### Issue: Root Directory error
**Fix**:
- Go to Settings → General
- Set Root Directory to: `frontend`

### Issue: Build fails
**Fix**:
- Check build logs in Vercel
- Verify Node.js version (18+)
- Check if all dependencies are in package.json

### Issue: Environment variables not working
**Fix**:
- Verify variable names match exactly (case-sensitive)
- Check environment is set correctly (Production/Preview/Development)
- Redeploy after changing env vars

---

## 📝 Current Configuration Summary

Based on your code:

### Frontend Config (`frontend/src/lib/config.ts`):
- ✅ Automatically detects Vercel environment
- ✅ Production → `https://onboard-hub.onrender.com`
- ✅ Preview → `https://onboard-hub-backend-staging.onrender.com`
- ✅ Local → `http://localhost:4000`

### Next.js Config (`frontend/next.config.js`):
- Uses `BACKEND_URL` env var for API rewrites
- Defaults to: `https://onboard-hun-backend-1.onrender.com`

### What You Need in Vercel:

1. **For Production**:
   - `BACKEND_URL` = `https://onboard-hub.onrender.com` (or your production URL)

2. **For Preview**:
   - `BACKEND_URL` = `https://onboard-hub-backend-staging.onrender.com`

---

## ✅ Final Verification

After completing all steps:

- [ ] Production deployments use production backend
- [ ] Preview deployments use staging backend
- [ ] Preview URLs are automatically created for branches
- [ ] API calls work correctly in preview
- [ ] No CORS errors
- [ ] Authentication works in preview

---

## 🎯 Quick Test

Run this to test the setup:

```bash
# 1. Create test branch
git checkout -b test-preview-setup
git push origin test-preview-setup

# 2. Check Vercel dashboard for preview deployment
# 3. Open preview URL
# 4. Test the app
# 5. Check browser console for API calls
```

---

**Once all items are checked, your frontend staging is ready! 🎉**

