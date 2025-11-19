# Preview Deployment Guide

This guide explains how to set up preview/staging deployments so you can test changes before deploying to production.

## Overview

- **Frontend (Vercel)**: Automatic preview deployments for branches/PRs
- **Backend (Render)**: Create a separate staging service or use branch deployments

---

## Frontend: Vercel Preview Deployments

Vercel automatically creates preview deployments for:
- Every push to a branch (not main)
- Every Pull Request

### Setup Steps:

1. **Connect Repository to Vercel** (if not already done)
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

2. **Configure Branch Deployments**
   - In Vercel dashboard → Project Settings → Git
   - Ensure "Production Branch" is set to `main` (or `master`)
   - Preview deployments are enabled by default

3. **Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add variables for:
     - **Production**: Used for `main` branch
     - **Preview**: Used for all other branches
     - **Development**: Used for local development

   **Important**: Set `BACKEND_URL` differently for preview:
   ```
   Production: https://onboard-hub.onrender.com
   Preview: https://onboard-hub-staging.onrender.com (or your staging backend)
   ```

4. **How It Works**
   - Push to any branch (e.g., `feature/new-feature`)
   - Vercel automatically builds and deploys
   - You get a preview URL like: `https://onboard-hub-abc123.vercel.app`
   - Share this URL with your team for testing

5. **Pull Request Integration**
   - Create a PR from your branch to `main`
   - Vercel adds a comment with preview link
   - Preview updates automatically on each push

---

## Backend: Render Staging Service

Render doesn't have automatic preview deployments, but you can create a separate staging service.

### Option 1: Separate Staging Service (Recommended)

1. **Create a New Service**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect the same repository
   - Name it: `onboard-hub-staging` (or similar)

2. **Configure Staging Service**
   - **Branch**: Set to `develop` or `staging` (create this branch)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

3. **Environment Variables**
   - Copy all production env vars
   - Update if needed:
     - Use a separate MongoDB database (optional)
     - Use the same Google credentials (or separate test credentials)
     - Use the same sheet ID (or a test sheet)

4. **Get Staging URL**
   - Render provides: `https://onboard-hub-staging.onrender.com`
   - Update frontend preview env var to point here

### Option 2: Branch-Based Deployments (Manual)

1. **Create a Staging Branch**
   ```bash
   git checkout -b staging
   git push origin staging
   ```

2. **Create Render Service for Staging Branch**
   - Same as Option 1, but set branch to `staging`

3. **Deploy to Staging First**
   ```bash
   git checkout staging
   git merge feature/your-feature
   git push origin staging
   # Render auto-deploys staging branch
   ```

4. **After Testing, Merge to Main**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   # Production auto-deploys
   ```

---

## Workflow Example

### 1. Create Feature Branch
```bash
git checkout -b feature/new-role-system
# Make your changes
git add .
git commit -m "Add new role system"
git push origin feature/new-role-system
```

### 2. Frontend Preview (Automatic)
- Vercel automatically creates: `https://onboard-hub-feature-new-role-system.vercel.app`
- Share this link with your team

### 3. Backend Preview (If using staging service)
```bash
# Merge to staging branch
git checkout staging
git merge feature/new-role-system
git push origin staging
# Render deploys to: https://onboard-hub-staging.onrender.com
```

### 4. Test Preview
- Frontend preview URL points to staging backend
- Test all functionality
- Get team feedback

### 5. Deploy to Production
```bash
# After testing, merge to main
git checkout main
git merge feature/new-role-system
git push origin main
# Both Vercel and Render deploy to production
```

---

## Environment Variables Setup

### Frontend (Vercel)

**Production Environment:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
BACKEND_URL=https://onboard-hub.onrender.com
```

**Preview Environment:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... (or same as prod)
CLERK_SECRET_KEY=sk_test_... (or same as prod)
BACKEND_URL=https://onboard-hub-staging.onrender.com
```

### Backend (Render)

**Production Service:**
- All production env vars
- Branch: `main`

**Staging Service:**
- Same env vars (or test versions)
- Branch: `staging` or `develop`
- Can use separate MongoDB (optional)

---

## Quick Commands

### Create and Deploy Preview
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add new feature"
git push origin feature/my-feature

# Vercel automatically creates preview
# Check Vercel dashboard for preview URL
```

### Deploy to Staging (Backend)
```bash
git checkout staging
git merge feature/my-feature
git push origin staging
# Render auto-deploys
```

### Deploy to Production
```bash
git checkout main
git merge feature/my-feature
git push origin main
# Both services auto-deploy
```

---

## Tips

1. **Always test in preview first** before merging to main
2. **Use different Clerk keys** for preview if you want to test auth separately
3. **Keep staging backend running** so preview frontend always works
4. **Monitor preview deployments** in Vercel dashboard
5. **Delete old preview deployments** periodically to save resources

---

## Troubleshooting

### Preview Frontend Can't Connect to Backend
- Check `BACKEND_URL` in Vercel preview environment variables
- Ensure staging backend is running
- Check CORS settings in backend

### Preview Backend Not Updating
- Check Render service logs
- Verify branch is set correctly
- Ensure build is successful

### Environment Variables Not Working
- Verify variables are set for "Preview" environment in Vercel
- Check variable names match exactly
- Redeploy after changing env vars

---

## Summary

✅ **Frontend (Vercel)**: Automatic previews for every branch/PR  
✅ **Backend (Render)**: Create separate staging service  
✅ **Workflow**: Feature branch → Preview → Test → Merge to main → Production

This setup allows you to test everything before deploying to production!

