require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'test';

// Role Assignment Schema
const RoleAssignmentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    scopes: [{
      scope: { type: String, enum: ['sales', 'onboarding', 'addon'], required: true },
      role: { type: String, enum: ['super_admin', 'manager', 'team_member'], required: true },
      teamName: String,
      managerEmail: String,
    }],
    teamMembers: [String],
  },
  { timestamps: true }
);

const RoleAssignment = mongoose.model('RoleAssignment', RoleAssignmentSchema);

async function seedRoles() {
  try {
    await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
    console.log('[SEED] Connected to MongoDB');

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
    process.exit(0);
  } catch (error) {
    console.error('[SEED] Error seeding roles:', error);
    process.exit(1);
  }
}

seedRoles();

