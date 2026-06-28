import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const envPath = path.resolve(process.cwd(), '.env');

// Read existing config or default
let currentConfig = {
  projectId: "",
  appId: "",
  apiKey: "",
  authDomain: "",
  firestoreDatabaseId: "",
  storageBucket: "",
  messagingSenderId: "",
  measurementId: ""
};

if (fs.existsSync(configPath)) {
  try {
    currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Error reading existing config:', err.message);
  }
}

// Ask question helper
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('==================================================');
  console.log('🔧 Ganga Maxx Firebase Configuration Tool');
  console.log('==================================================\n');

  // Check if CLI flags are passed
  const args = process.argv.slice(2);
  let passedFlags = {};
  args.forEach(val => {
    if (val.startsWith('--')) {
      const parts = val.split('=');
      const key = parts[0].substring(2);
      const value = parts[1] || "";
      passedFlags[key] = value;
    }
  });

  const getVal = async (name, displayName, defaultVal) => {
    if (passedFlags[name] !== undefined) {
      return passedFlags[name];
    }
    const response = await askQuestion(`${displayName} [${defaultVal}]: `);
    return response.trim() || defaultVal;
  };

  const projectId = await getVal('projectId', 'Firebase Project ID', currentConfig.projectId);
  const apiKey = await getVal('apiKey', 'Firebase API Key', currentConfig.apiKey);
  const firestoreDatabaseId = await getVal('firestoreDatabaseId', 'Firestore Database ID (Optional)', currentConfig.firestoreDatabaseId);
  const appId = await getVal('appId', 'Firebase App ID', currentConfig.appId);
  const authDomain = await getVal('authDomain', 'Firebase Auth Domain', `${projectId}.firebaseapp.com`);
  const storageBucket = await getVal('storageBucket', 'Firebase Storage Bucket', `${projectId}.firebasestorage.app`);
  const messagingSenderId = await getVal('messagingSenderId', 'Firebase Messaging Sender ID', currentConfig.messagingSenderId);
  
  rl.close();

  // Create new config object
  const newConfig = {
    projectId,
    appId,
    apiKey,
    authDomain,
    firestoreDatabaseId,
    storageBucket,
    messagingSenderId,
    measurementId: currentConfig.measurementId || ""
  };

  // 1. Write firebase-applet-config.json
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
  console.log(`\n💾 Saved updated config to firebase-applet-config.json`);

  // 2. Write or update .env file
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const updateEnvVar = (name, value) => {
    const regex = new RegExp(`^${name}=.*$`, 'm');
    const newAddition = `${name}="${value}"`;
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newAddition);
    } else {
      if (envContent.length > 0 && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${newAddition}\n`;
    }
  };

  updateEnvVar('FIREBASE_PROJECT_ID', projectId);
  updateEnvVar('FIREBASE_API_KEY', apiKey);
  if (firestoreDatabaseId) {
    updateEnvVar('FIREBASE_DATABASE_ID', firestoreDatabaseId);
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`📝 Updated .env configuration with Firebase credentials.`);

  console.log('\n✅ Configurations updated successfully. You can now run database seeding/deployment!');
}

main().catch(err => {
  console.error('An error occurred:', err);
  rl.close();
});
