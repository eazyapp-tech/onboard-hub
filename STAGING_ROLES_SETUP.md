# Staging Backend - Role Assignments Setup

## Issue
The staging backend doesn't have role assignments in the database, which causes the user access API to return empty scopes.

## Fix Applied
- ✅ Added 10-second timeout to user access API call
- ✅ Added 15-second maximum timeout to loading state
- ✅ Frontend will show all dashboards as fallback if userAccess is null
- ✅ **Added `/api/seed-roles` endpoint** for easy role seeding

## To Fix Role Assignments on Staging

### ✅ Option 1: Use Seed Endpoint (Recommended - Easiest)

Simply call the seed endpoint on your staging backend:

```bash
curl -X POST https://onboard-hub-backend-staging.onrender.com/api/seed-roles
```

**Response:**
```json
{
  "ok": true,
  "message": "Roles seeded successfully",
  "summary": {
    "totalUsers": 21,
    "superAdmins": 3,
    "managers": 3
  }
}
```

**Security:**
- ✅ Works automatically in staging/local environments
- ✅ For production, requires `SEED_ROLES_TOKEN` environment variable
- ✅ You can also pass token in header: `x-seed-token: YOUR_TOKEN`

### Option 2: Run Seed Script on Staging Backend

1. **SSH into Render staging service** (if available) or use Render Shell
2. **Run the seed script**:
   ```bash
   cd backend
   node scripts/seed-roles.js
   ```

### Option 3: Use Same Database (Quick Fix)

If staging and production use the same MongoDB database, roles are already there and just need to be accessible.

---

## Current Status

- ✅ Frontend timeout fix deployed
- ⚠️ Staging backend needs role assignments seeded
- ✅ UI will work (shows all dashboards as fallback) even without roles

---

## Quick Test

After seeding roles, test with:
```bash
curl "https://onboard-hub-backend-staging.onrender.com/api/user-access?email=aditya@eazyapp.tech"
```

Should return role data instead of empty scopes.

