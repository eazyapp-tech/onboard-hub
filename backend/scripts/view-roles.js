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

async function viewRoles() {
  try {
    await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
    console.log('[VIEW] Connected to MongoDB\n');

    // Get all role assignments
    const allRoles = await RoleAssignment.find().sort({ email: 1 });
    
    console.log('='.repeat(80));
    console.log('ROLE ASSIGNMENTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Users: ${allRoles.length}\n`);

    // Group by role type
    const superAdmins = [];
    const salesManagers = [];
    const salesMembers = [];
    const onboardingManagers = [];
    const onboardingMembers = [];
    const addonOnly = [];

    for (const role of allRoles) {
      const scopes = role.scopes || [];
      let isSuperAdmin = false;
      let hasSales = false;
      let hasOnboarding = false;
      let hasAddon = false;

      for (const scope of scopes) {
        if (scope.role === 'super_admin') {
          isSuperAdmin = true;
        }
        if (scope.scope === 'sales') {
          hasSales = true;
          if (scope.role === 'manager') salesManagers.push(role.email);
          if (scope.role === 'team_member') salesMembers.push(role.email);
        }
        if (scope.scope === 'onboarding') {
          hasOnboarding = true;
          if (scope.role === 'manager') onboardingManagers.push(role.email);
          if (scope.role === 'team_member') onboardingMembers.push(role.email);
        }
        if (scope.scope === 'addon') {
          hasAddon = true;
        }
      }

      if (isSuperAdmin) {
        superAdmins.push(role.email);
      } else if (!hasSales && !hasOnboarding && hasAddon) {
        addonOnly.push(role.email);
      }
    }

    // Print Super Admins
    console.log('🔴 SUPER ADMINS (All Dashboards):');
    console.log('-'.repeat(80));
    if (superAdmins.length > 0) {
      superAdmins.forEach(email => console.log(`  • ${email}`));
    } else {
      console.log('  (None)');
    }
    console.log('');

    // Print Sales Managers
    console.log('👔 SALES MANAGERS:');
    console.log('-'.repeat(80));
    if (salesManagers.length > 0) {
      for (const email of salesManagers) {
        const role = allRoles.find(r => r.email === email);
        const teamSize = role?.teamMembers?.length || 0;
        console.log(`  • ${email} (Team: ${teamSize} members)`);
        if (teamSize > 0) {
          role.teamMembers.forEach(member => {
            console.log(`    └─ ${member}`);
          });
        }
      }
    } else {
      console.log('  (None)');
    }
    console.log('');

    // Print Sales Team Members
    console.log('👤 SALES TEAM MEMBERS:');
    console.log('-'.repeat(80));
    if (salesMembers.length > 0) {
      salesMembers.forEach(email => console.log(`  • ${email}`));
    } else {
      console.log('  (None)');
    }
    console.log('');

    // Print Onboarding Managers
    console.log('🎯 ONBOARDING MANAGERS:');
    console.log('-'.repeat(80));
    if (onboardingManagers.length > 0) {
      for (const email of onboardingManagers) {
        const role = allRoles.find(r => r.email === email);
        const teamSize = role?.teamMembers?.length || 0;
        console.log(`  • ${email} (Team: ${teamSize} members)`);
        if (teamSize > 0) {
          role.teamMembers.forEach(member => {
            console.log(`    └─ ${member}`);
          });
        }
      }
    } else {
      console.log('  (None)');
    }
    console.log('');

    // Print Onboarding Team Members
    console.log('👥 ONBOARDING TEAM MEMBERS:');
    console.log('-'.repeat(80));
    if (onboardingMembers.length > 0) {
      onboardingMembers.forEach(email => console.log(`  • ${email}`));
    } else {
      console.log('  (None)');
    }
    console.log('');

    // Print Add-on Only Users
    console.log('➕ ADD-ON ONLY USERS:');
    console.log('-'.repeat(80));
    if (addonOnly.length > 0) {
      addonOnly.forEach(email => console.log(`  • ${email}`));
    } else {
      console.log('  (None)');
    }
    console.log('');

    // Detailed view for a specific user (optional)
    if (process.argv[2]) {
      const email = process.argv[2].toLowerCase();
      const userRole = await RoleAssignment.findOne({ email });
      if (userRole) {
        console.log('='.repeat(80));
        console.log(`DETAILED VIEW: ${email}`);
        console.log('='.repeat(80));
        console.log(JSON.stringify(userRole, null, 2));
      } else {
        console.log(`User ${email} not found in role assignments.`);
      }
    } else {
      // Show detailed user-by-user access
      console.log('='.repeat(80));
      console.log('DETAILED USER ACCESS (All Users)');
      console.log('='.repeat(80));
      console.log('');
      
      for (const role of allRoles.sort((a, b) => a.email.localeCompare(b.email))) {
        console.log(`📧 ${role.email}`);
        console.log('-'.repeat(80));
        
        const scopes = role.scopes || [];
        if (scopes.length === 0) {
          console.log('  No access assigned');
        } else {
          for (const scope of scopes) {
            const scopeName = scope.scope.toUpperCase();
            const roleName = scope.role.replace('_', ' ').toUpperCase();
            console.log(`  • ${scopeName}: ${roleName}`);
            if (scope.teamName) {
              console.log(`    └─ Team: ${scope.teamName}`);
            }
            if (scope.managerEmail) {
              console.log(`    └─ Manager: ${scope.managerEmail}`);
            }
          }
        }
        
        if (role.teamMembers && role.teamMembers.length > 0) {
          console.log(`  👥 Manages ${role.teamMembers.length} team member(s):`);
          role.teamMembers.forEach(member => {
            console.log(`    └─ ${member}`);
          });
        }
        
        console.log('');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('[VIEW] Error viewing roles:', error);
    process.exit(1);
  }
}

viewRoles();

