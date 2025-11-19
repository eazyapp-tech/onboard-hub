# Preview Deployment Status

## ✅ Setup Complete

### Backend Staging
- **URL**: https://onboard-hub-backend-staging.onrender.com
- **Status**: ✅ Running and accessible
- **Health Check**: ✅ Working (`{"ok":true,"env":"production"}`)

### Frontend Configuration
- ✅ `config.ts` updated to use staging backend for preview
- ✅ `next.config.js` updated to use staging backend for preview
- ✅ Test branch pushed: `preview-test-1763535141`

---

## 🚀 Preview Deployment

### What Happens Next:

1. **Vercel Auto-Deployment**
   - Vercel automatically detects the new branch
   - Starts building the preview deployment
   - Usually takes 2-5 minutes

2. **Check Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Find your project
   - Go to **"Deployments"** tab
   - Look for deployment from branch: `preview-test-1763535141`
   - Status will show: "Building" → "Ready"

3. **Get Preview URL**
   - Once deployment is "Ready" (green)
   - Click on the deployment
   - Click **"Visit"** button
   - Preview URL will be like: `https://onboard-hub-abc123.vercel.app`

---

## ✅ Verification Steps

### 1. Check Preview Deployment
- [ ] Go to Vercel dashboard
- [ ] Find deployment for `preview-test-1763535141`
- [ ] Status is "Ready" (green)
- [ ] Note the preview URL

### 2. Test Preview URL
- [ ] Open preview URL in browser
- [ ] App loads correctly
- [ ] No console errors

### 3. Verify Backend Connection
- [ ] Open browser DevTools (F12)
- [ ] Go to **Network** tab
- [ ] Use the app (try logging in or making an API call)
- [ ] Check API requests:
  - [ ] Should go to: `https://onboard-hub-backend-staging.onrender.com`
  - [ ] NOT to production backend
  - [ ] NOT to localhost

### 4. Test API Endpoints
- [ ] Try: `https://your-preview-url.vercel.app/health`
- [ ] Should proxy to staging backend
- [ ] Should return: `{"ok":true}`

---

## 🔧 Configuration Summary

### Frontend Config (`frontend/src/lib/config.ts`):
```typescript
// Automatically detects:
// - Production → https://onboard-hub.onrender.com
// - Preview → https://onboard-hub-backend-staging.onrender.com
// - Local → http://localhost:4000
```

### Next.js Config (`frontend/next.config.js`):
```javascript
// API rewrites automatically use:
// - BACKEND_URL env var (if set in Vercel)
// - Preview → staging backend
// - Production → production backend
// - Local → localhost
```

---

## 📋 Vercel Environment Variables Checklist

Make sure these are set in Vercel:

### For Preview Environment:
- [ ] `BACKEND_URL` = `https://onboard-hub-backend-staging.onrender.com`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = (your Clerk key)
- [ ] `CLERK_SECRET_KEY` = (your Clerk secret)

### For Production Environment:
- [ ] `BACKEND_URL` = `https://onboard-hub.onrender.com` (or your production URL)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = (your Clerk key)
- [ ] `CLERK_SECRET_KEY` = (your Clerk secret)

**Note**: If `BACKEND_URL` is not set, the code will automatically use staging backend for preview and production backend for production.

---

## 🎯 How to Use Going Forward

### Create Preview for Testing:
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "Your changes"
git push origin feature/your-feature-name

# 3. Vercel automatically creates preview
# 4. Check Vercel dashboard for preview URL
# 5. Share preview URL with team for testing
```

### Deploy to Staging Backend:
```bash
# Merge to staging branch to update staging backend
git checkout staging
git merge feature/your-feature-name
git push origin staging
# Render auto-deploys staging backend
```

### Deploy to Production:
```bash
# Merge to main for production
git checkout main
git merge feature/your-feature-name
git push origin main
# Both Vercel and Render deploy to production
```

---

## 🔗 Your URLs

- **Staging Backend**: https://onboard-hub-backend-staging.onrender.com
- **Production Backend**: https://onboard-hub.onrender.com (or your production URL)
- **Preview Frontend**: Check Vercel dashboard (auto-generated per branch)

---

## ✅ Success Criteria

Your preview deployment is working correctly if:

1. ✅ Preview URL loads without errors
2. ✅ API calls go to staging backend (`onboard-hub-backend-staging.onrender.com`)
3. ✅ Authentication works (Clerk login)
4. ✅ No CORS errors in console
5. ✅ App functionality works as expected

---

## 🐛 Troubleshooting

### Preview shows errors?
- Check Vercel build logs
- Verify environment variables are set
- Check browser console for errors

### API calls fail?
- Verify staging backend is running
- Check CORS settings in staging backend
- Verify `BACKEND_URL` is set for Preview in Vercel

### Preview uses wrong backend?
- Check Vercel environment variables
- Verify `BACKEND_URL` is set for Preview
- Check browser network tab to see which backend is being called

---

**Your preview deployment should be ready in 2-5 minutes! Check Vercel dashboard for the preview URL.** 🎉

