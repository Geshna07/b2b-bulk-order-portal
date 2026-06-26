# Deployment Guide: Ganga Maxx B2B Portal

This document outlines the steps to deploy the Ganga Maxx B2B Bulk Order Portal to production using Firebase (Frontend + Database) and Render (Backend).

## Prerequisites
- A Google Account
- A Render.com Account
- Node.js installed locally (for testing/seeding)

---

## Step 1: Firebase Setup (Database & Auth)

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project**. Name it \`ganga-maxx-b2b\`.
3. Disable Google Analytics (optional, for faster setup).
4. **Enable Authentication**:
   - Go to Build > Authentication > Get Started.
   - Go to the **Sign-in method** tab and enable **Email/Password**.
5. **Enable Firestore Database**:
   - Go to Build > Firestore Database > Create database.
   - Start in **Production mode** and choose a region close to your users (e.g., \`eur3\` or \`me-central1\`).
6. **Deploy Security Rules**:
   - Copy the contents of \`firestore.rules\` from this repository.
   - Paste them into the Rules tab of Firestore in the Firebase Console and click Publish.
7. **Get Config**:
   - Go to Project Settings (gear icon).
   - Scroll down to "Your apps", click the Web icon (\`</>\`).
   - Register app (e.g., "Ganga Maxx Web").
   - Copy the \`firebaseConfig\` object.
   - Update \`/frontend/firebase/firebaseConfig.js\` with these new credentials.

---

## Step 2: Set Environment Variables & Service Account

1. In Firebase Console > Project Settings > Service Accounts.
2. Click **Generate new private key**. This downloads a JSON file.
3. Keep this file safe. You will need its contents for the backend.
4. Set up your \`.env\` file for the backend based on \`.env.example\`:
   - \`PORT=3000\`
   - \`GEMINI_API_KEY=your_gemini_api_key\`
   - \`FIREBASE_SERVICE_ACCOUNT=stringified_json_content\` 
   *(Note: You can compress the JSON into a single string for Render environment variables)*

---

## Step 3: Seed the Admin Account

1. Open a terminal in the project root.
2. Run \`npm install\` to install dependencies.
3. Run \`npm run start\` locally. 
4. The system will automatically run \`/firebase/seedDatabase.js\` and create the default admin account:
   - **Email:** admin@gangamaxx.com
   - **Password:** Admin@123!
5. *Security Note: Change this password immediately after first login in production.*

---

## Step 4: Deploy Backend to Render (Free Tier)

1. Go to [Render.com](https://render.com) and sign in.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing this code.
4. Configuration:
   - **Name:** ganga-maxx-api
   - **Environment:** Node
   - **Build Command:** \`npm install && npm run build\`
   - **Start Command:** \`npm run start\`
5. **Environment Variables**: Add the variables from your \`.env\` file (GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT).
6. Click **Create Web Service**. Wait for the deployment to finish.
7. *Copy the Render URL (e.g., https://ganga-maxx-api.onrender.com) and update any backend API fetch URLs in the frontend if they were hardcoded, or rely on same-origin if hosting together. For this architecture, since frontend runs separately on Firebase Hosting, update frontend JS to point to the Render URL.*

---

## Step 5: Deploy Frontend to Firebase Hosting (Free)

1. Open a terminal in the project root.
2. Install Firebase CLI globally: \`npm install -g firebase-tools\`
3. Log in to Firebase: \`firebase login\`
4. Initialize Firebase Hosting: \`firebase init hosting\`
   - Select the project \`ganga-maxx-b2b\`.
   - What do you want to use as your public directory? Type: \`frontend\`
   - Configure as a single-page app? Type: \`No\`
   - Set up automatic builds and deploys with GitHub? Type: \`No\`
5. Deploy the frontend: \`firebase deploy --only hosting\`
6. Firebase will provide a Hosting URL (e.g., \`https://ganga-maxx-b2b.web.app\`). Your portal is now live!

---

## Step 6: Final Test Checklist

Perform these 15 test cases to ensure full functionality:

### Authentication & Registration
- [ ] 1. Register a new Customer. Verify data appears in Firestore.
- [ ] 2. Register a new Staff (e.g., Salesman). Verify status is 'Pending'.
- [ ] 3. Login as Admin. Verify admin dashboard loads.
- [ ] 4. Admin: Approve the pending staff member.
- [ ] 5. Login as the newly approved Staff member. Verify access.

### Customer Flows
- [ ] 6. Customer: Place a new order with multiple items from the catalog.
- [ ] 7. Customer: Request a quotation for a product.
- [ ] 8. Customer: Check "My Orders" and download the PDF invoice.
- [ ] 9. Customer: Interact with the AI Chat Widget.

### Order Fulfillment Pipeline
- [ ] 10. Sales Admin: View the new order and click 'Approve'.
- [ ] 11. Warehouse Staff: View the approved order, verify stock, and click 'Mark as Packed'.
- [ ] 12. Delivery Coordinator: Assign a driver/vehicle to the packed order and click 'Dispatch'.
- [ ] 13. Customer: Verify the order status is now 'Dispatched'.

### Reports & Utilities
- [ ] 14. Admin: Export the orders list as CSV.
- [ ] 15. Admin: Check the WhatsApp Notification Logs table.

---
*Deployment Guide Generated for Ganga Maxx B2B Portal.*
