import { admin, db, auth } from '../backend/utils/firebaseAdmin.js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const FLAG_FILE = path.join(process.cwd(), 'firebase', '.admin_seeded.flag');

// Helper to generate a strong 12-character random password
function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  // Ensure at least one lowercase, one uppercase, one number, and one symbol
  password += 'aBc1!';
  for (let i = 0; i < 7; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

async function createAdminAccounts() {
  if (fs.existsSync(FLAG_FILE)) {
    console.log('Admin accounts already seeded, skipping.');
    return;
  }

  console.log('Initiating Super Admin Setup...');
  
  const admins = [
    { email: 'admin@gangamaxx.com', name: 'Primary Admin', password: generatePassword() },
    { email: 'superadmin@gangamaxx.com', name: 'Backup Admin', password: generatePassword() }
  ];
  
  const credentials = {};

  for (const adminInfo of admins) {
    const password = adminInfo.password;
    credentials[adminInfo.email] = password;

    let userRecord = null;
    try {
      // 1. Create User in Firebase Authentication
      userRecord = await auth.createUser({
        email: adminInfo.email,
        emailVerified: true,
        password: password,
        displayName: adminInfo.name,
        disabled: false
      });
      
      const uid = userRecord.uid;

      // 2. Create User Profile in Firestore
      const adminUserData = {
        uid: uid,
        name: adminInfo.name,
        email: adminInfo.email,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await db.collection('users').doc(uid).set(adminUserData);
      console.log(`Successfully mapped admin user ${adminInfo.email} to Firestore!`);
    } catch (createErr) {
      if (createErr.code === 'auth/email-already-exists') {
        console.log(`⚠️ Admin account (${adminInfo.email}) already exists.`);
        // Try to update password if already exists
        const user = await auth.getUserByEmail(adminInfo.email);
        await auth.updateUser(user.uid, { password: password });
        console.log(`Updated password for existing admin ${adminInfo.email}.`);
      } else {
        console.error(`⚠️ Error creating admin ${adminInfo.email}:`, createErr.message);
      }
    }
  }

  // Save credentials to root admin_credentials.json (gitignored)
  const credPath = path.join(process.cwd(), 'admin_credentials.json');
  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2), 'utf-8');
  console.log(`🔐 Admin setup complete. Saved credentials to admin_credentials.json (gitignored).`);

  // Set flag file
  fs.writeFileSync(FLAG_FILE, 'seeded');
}

// Run the script
createAdminAccounts().catch(err => {
  console.error('⚠️ Critical error in admin seeding script:', err);
});
