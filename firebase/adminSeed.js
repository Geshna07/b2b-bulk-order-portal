import { admin, db, auth } from '../backend/utils/firebaseAdmin.js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

let projectId = 'startup-glass-23kpg';
let databaseId = 'ai-studio-b2bbulkorderport-a4a0694c-1e99-4e4c-b915-7c9a490b1e92';

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.projectId) projectId = config.projectId;
    if (config.firestoreDatabaseId) databaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  console.warn('Error reading firebase-applet-config.json:', e);
}

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

async function createAdminAccount() {
  console.log('Initiating Super Admin Setup...');
  
  const email = 'admin@gangamaxx.com';
  const password = 'password123';

  let userRecord = null;
  let uid = 'admin_gangamaxx_super_admin';
  try {
    // 1. Create User in Firebase Authentication
    userRecord = await auth.createUser({
      email: email,
      emailVerified: true,
      password: password,
      displayName: 'Ganga Maxx Super Admin',
      disabled: false
    });
    uid = userRecord.uid;

    console.log('\n======================================================');
    console.log('⚠️  SUPER ADMIN CREATED SUCCESSFULLY IN AUTHENTICATION ⚠️');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('NOTE: Save this password immediately. It will not be shown again.');
    console.log('======================================================\n');
  } catch (createErr) {
    if (createErr.code === 'auth/email-already-exists') {
      console.log(`⚠️ Admin account (${email}) already exists in Firebase Authentication.`);
      try {
        userRecord = await auth.getUserByEmail(email);
        uid = userRecord.uid;
      } catch (getErr) {
        console.warn('Could not get existing auth user by email, using fallback ID', getErr);
      }
    } else {
      console.warn('⚠️ Firebase Authentication is not available or enabled. Skipping Auth user creation and setting up Firestore profile directly.', createErr.message || createErr);
    }
  }

  // 2. Create/Update User Profile in Firestore 'users' collection
  const adminUserData = {
    uid: uid,
    name: 'Ganga Maxx Super Admin',
    email: email,
    password: password,
    phone: '+919999999999',
    role: 'admin',
    subRole: null,
    institutionName: 'Ganga Maxx HQ',
    institutionType: 'Wholesaler',
    address: {
      street: 'Ganga Maxx Plaza, Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301'
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    whatsappNumber: '+919999999999',
    _securityNote: 'Save this password immediately'
  };

  await db.collection('users').doc(uid).set(adminUserData);
  console.log(`Successfully mapped admin user ${uid} to Firestore users collection!`);
}

// Run the script
createAdminAccount().catch(err => {
  console.error('⚠️ Critical error in admin seeding script:', err);
});
