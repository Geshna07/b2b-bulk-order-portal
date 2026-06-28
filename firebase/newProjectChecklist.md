# Fresh Firebase Project Setup Checklist

Follow these steps to deploy and configure a new Firebase project instance for the B2B Bulk Order Portal.

---

## 📋 Pre-requisites
- [ ] Install [Node.js](https://nodejs.org/) (v18+ recommended).
- [ ] Install the [Firebase CLI](https://firebase.google.com/docs/cli) globally:
  ```bash
  npm install -g firebase-tools
  ```
- [ ] Log in to your Firebase Account:
  ```bash
  firebase login
  ```

---

## 1. Firebase Console Configuration
- [ ] **Create a New Project**: Go to [Firebase Console](https://console.firebase.google.com/), click "Add Project", and create a new project.
- [ ] **Enable Authentication**:
  - Go to **Build** > **Authentication** > **Get Started**.
  - Enable the **Email/Password** sign-in provider.
- [ ] **Enable Cloud Firestore**:
  - Go to **Build** > **Firestore Database** > **Create Database**.
  - Select a region near your target users and start in **Test Mode** (temporary/open access).
  - *(Optional)* If using multiple database IDs, specify your custom database ID.
- [ ] **Generate Web App Configuration**:
  - Go to **Project Settings** (gear icon) > **General**.
  - In the "Your apps" section, click the **Web icon `</>`** to register a new Web App.
  - Copy the generated `firebaseConfig` credentials.

---

## 2. Local Environment Setup
- [ ] **Configure the Local Environment**:
  - Run the interactive config utility script to set up configurations:
    ```bash
    node firebase/updateProjectConfig.js
    ```
  - Input your new Project ID, API Key, App ID, and other details copied from the console.
  - Verify that `firebase-applet-config.json` and `.env` have been created/updated correctly.
- [ ] **Export Service Account Key (Admin SDK)**:
  - In Firebase Console, go to **Project Settings** > **Service Accounts**.
  - Click **Generate New Private Key**.
  - Download the JSON file and save it as `serviceAccountKey.json` in the root folder of this project (which is ignored by Git).

---

## 3. Firestore Rules & Indexes Deployment
- [ ] **Deploy Security Rules**:
  - Copy the contents of `firebase/firestoreRules.txt` to the **Firestore** > **Rules** tab in the Firebase Console and click **Publish**.
  - Alternatively, use the Firebase CLI to deploy rules directly:
    ```bash
    firebase deploy --only firestore:rules
    ```

---

## 4. Seeding Initial Database Collections
- [ ] **Populate Collections & Baseline Users**:
  - Run the baseline seeder script:
    ```bash
    node firebase/newProjectSeed.js
    ```
  - This initializes the 8 main collections (`users`, `products`, `orders`, `quotations`, `inventory`, `deliveries`, `creditAccounts`, `complianceRecords`) and registers baseline auth accounts.
- [ ] **Seed Administrator Access**:
  - Delete `firebase/.admin_seeded.flag` if it exists.
  - Run the admin seeder script to initialize primary and backup administrator accounts:
    ```bash
    node firebase/adminSeed.js
    ```
  - Retrieve seeded admin credentials from the gitignored `admin_credentials.json` file.

---

## 5. Launch & Verification
- [ ] **Start the Development Server**:
  - Launch the portal:
    ```bash
    npm run dev
    ```
- [ ] **Verify Authentication & Access**:
  - Go to the login screen and authenticate with one of the baseline credentials.
  - Navigate between dashboards to confirm Firestore read/write capabilities are working in line with the Firestore rules.
