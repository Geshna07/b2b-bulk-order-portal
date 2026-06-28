import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

// Check serviceAccountKey.json exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: serviceAccountKey.json not found in project root!');
  console.error(`Expected path: ${serviceAccountPath}`);
  console.error('Please download the service account private key JSON from the Firebase Console:');
  console.error('1. Go to Project Settings > Service Accounts.');
  console.error('2. Click "Generate New Private Key".');
  console.error('3. Save the downloaded JSON file as "serviceAccountKey.json" in the root of this project folder.\n');
  process.exit(1);
}

// Load service account config
let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  console.error(`❌ Error parsing serviceAccountKey.json: ${err.message}`);
  process.exit(1);
}

// Check project ID matches ganga-maxx-b2b
const expectedProjectId = 'ganga-maxx-b2b';
if (serviceAccount.project_id !== expectedProjectId) {
  console.error(`❌ ERROR: Project ID in serviceAccountKey.json is "${serviceAccount.project_id}", but expected "${expectedProjectId}".`);
  console.error('Please make sure you have generated the service account key for the correct project.\n');
  process.exit(1);
}

// Initialize Admin SDK with the certificate
try {
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (err) {
  console.error(`❌ Failed to initialize Firebase Admin SDK: ${err.message}`);
  process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

// Helper to get server timestamps or dates
const getPastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const getFutureDate = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
};

async function testFirestoreConnection() {
  console.log('Testing Firestore connection and write permissions...');
  try {
    const testDocRef = db.collection('_connection_test_').doc('test_doc');
    await testDocRef.set({
      timestamp: new Date().toISOString(),
      test: true
    });
    // Delete the test document after verification
    await testDocRef.delete();
    console.log('✅ Firestore connection test succeeded (write and delete permissions verified).');
    return true;
  } catch (error) {
    console.error('❌ Firestore connection test failed.');
    if (error.code === 5 || error.message.includes('NOT_FOUND') || error.message.includes('Database does not exist') || error.message.includes('database_id')) {
      console.error('\n⚠️  ERROR: The Firestore database has not been initialized in your Firebase project.');
      console.error('Please visit the Firebase Console, go to "Build" > "Firestore Database", and click "Create Database".');
      console.error('Ensure it is created in the default location and in the default database named "(default)".\n');
    } else {
      console.error('Error Details:', error.message || error);
    }
    return false;
  }
}

async function seedDatabase() {
  console.log(`Starting Baseline Firestore Seeding for project: ${expectedProjectId}...`);

  try {
    // 1. SEEDING USERS
    console.log('Seeding "users" collection...');
    const users = [
      {
        uid: 'cust_apollo_hospitals',
        name: 'Dr. Ramesh Kumar',
        email: 'procurement@apollohospitals.com',
        phone: '+919876543210',
        role: 'customer',
        subRole: null,
        institutionName: 'Apollo Hospitals Group',
        institutionType: 'Hospital',
        address: {
          street: '21 Greams Road, Thousand Lights',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600006'
        },
        status: 'active',
        createdAt: getPastDate(45),
        whatsappNumber: '+919876543210'
      },
      {
        uid: 'cust_medplus_pharmacy',
        name: 'Suresh Raina',
        email: 'suresh@medplusindia.com',
        phone: '+919123456789',
        role: 'customer',
        subRole: null,
        institutionName: 'MedPlus Pharmacy',
        institutionType: 'Pharmacy',
        address: {
          street: 'HNo 8-2-293/82/A, Road No 36, Jubilee Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033'
        },
        status: 'active',
        createdAt: getPastDate(30),
        whatsappNumber: '+919123456789'
      },
      {
        uid: 'staff_sales_01',
        name: 'Vikram Singh',
        email: 'vikram.sales@gangamaxx.com',
        phone: '+918888888801',
        role: 'staff',
        subRole: 'salesman',
        institutionName: 'Ganga Maxx Headquarters',
        institutionType: 'Wholesaler',
        address: {
          street: 'Ganga Maxx Plaza, Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301'
        },
        status: 'active',
        createdAt: getPastDate(100),
        whatsappNumber: '+918888888801'
      },
      {
        uid: 'staff_warehouse_01',
        name: 'Anil Kumar',
        email: 'anil.wh@gangamaxx.com',
        phone: '+918888888802',
        role: 'staff',
        subRole: 'warehouseStaff',
        institutionName: 'Ganga Maxx Warehouse A',
        institutionType: 'Wholesaler',
        address: {
          street: 'Warehouse 12, Industrial Area Phase II',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201305'
        },
        status: 'active',
        createdAt: getPastDate(90),
        whatsappNumber: '+918888888802'
      },
      {
        uid: 'staff_delivery_coord',
        name: 'Rahul Dravid',
        email: 'rahul.logistics@gangamaxx.com',
        phone: '+918888888803',
        role: 'staff',
        subRole: 'deliveryCoordinator',
        institutionName: 'Ganga Maxx Logistics',
        institutionType: 'Wholesaler',
        address: {
          street: 'Ganga Maxx Plaza, Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301'
        },
        status: 'active',
        createdAt: getPastDate(80),
        whatsappNumber: '+918888888803'
      },
      {
        uid: 'staff_compliance_officer',
        name: 'Sanjana Roy',
        email: 'sanjana.comp@gangamaxx.com',
        phone: '+918888888804',
        role: 'staff',
        subRole: 'complianceAdmin',
        institutionName: 'Ganga Maxx Headquarters',
        institutionType: 'Wholesaler',
        address: {
          street: 'Ganga Maxx Plaza, Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301'
        },
        status: 'active',
        createdAt: getPastDate(70),
        whatsappNumber: '+918888888804'
      }
    ];

    for (const user of users) {
      try {
        await auth.getUser(user.uid);
        console.log(`Auth user ${user.uid} (${user.email}) already exists.`);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
          await auth.createUser({
            uid: user.uid,
            email: user.email,
            emailVerified: true,
            password: 'password123', // Standard secure default password for seeding
            displayName: user.name,
            disabled: false
          });
          console.log(`Successfully created Auth user ${user.uid} (${user.email}).`);
        } else {
          console.warn(`⚠️ Firebase Authentication service is unavailable: ${authErr.message}`);
        }
      }
      // Note: plain-text password is NOT written to Firestore
      await db.collection('users').doc(user.uid).set(user);
    }

    // 2. SEEDING PRODUCTS
    console.log('Seeding "products" collection...');
    const products = [
      {
        productId: 'prod_surgical_masks_01',
        name: 'N95 Medical Grade Surgical Mask',
        category: 'Surgicals',
        sku: 'GMX-SURG-MASK-N95',
        description: 'Fluid-resistant high-filtration medical grade masks with elastic ear loops.',
        unit: 'Box of 100',
        pricePerUnit: 1200,
        stock: 5000,
        minOrderQty: 10,
        images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400'],
        isActive: true,
        createdBy: 'staff_compliance_officer',
        createdAt: getPastDate(60)
      },
      {
        productId: 'prod_disinfectant_01',
        name: 'Hexashield Hospital Disinfectant Spirit',
        category: 'Disinfectants',
        sku: 'GMX-DIS-HEXA-5L',
        description: '70% Isopropyl alcohol-based industrial grade sanitizer and surface disinfectant.',
        unit: '5-Litre Canister',
        pricePerUnit: 850,
        stock: 1200,
        minOrderQty: 5,
        images: ['https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=400'],
        isActive: true,
        createdBy: 'staff_compliance_officer',
        createdAt: getPastDate(60)
      },
      {
        productId: 'prod_paracetamol_bulk',
        name: 'Paracetamol Wholesale Tablets 500mg',
        category: 'Pharmaceuticals',
        sku: 'GMX-PHARM-PARA-500',
        description: 'Standard analgesic and antipyretic wholesale tablet packs for hospital dispensaries.',
        unit: 'Carton of 1000 Packs',
        pricePerUnit: 4500,
        stock: 800,
        minOrderQty: 2,
        images: ['https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400'],
        isActive: true,
        createdBy: 'staff_compliance_officer',
        createdAt: getPastDate(60)
      }
    ];

    for (const product of products) {
      await db.collection('products').doc(product.productId).set(product);
    }

    // 3. SEEDING ORDERS
    console.log('Seeding "orders" collection...');
    const orders = [
      {
        orderId: 'GMX-ORD-10001',
        customerId: 'cust_apollo_hospitals',
        customerName: 'Dr. Ramesh Kumar',
        institutionName: 'Apollo Hospitals Group',
        items: [
          {
            productId: 'prod_surgical_masks_01',
            productName: 'N95 Medical Grade Surgical Mask',
            qty: 15,
            unit: 'Box of 100',
            pricePerUnit: 1200,
            totalPrice: 18000
          },
          {
            productId: 'prod_disinfectant_01',
            productName: 'Hexashield Hospital Disinfectant Spirit',
            qty: 10,
            unit: '5-Litre Canister',
            pricePerUnit: 850,
            totalPrice: 8500
          }
        ],
        orderTotal: 26500,
        status: 'approved',
        paymentStatus: 'unpaid',
        assignedSalesman: 'Vikram Singh',
        deliveryAddress: {
          street: '21 Greams Road, Thousand Lights',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600006'
        },
        notes: 'Priority hospital shipment. Keep handling records attached.',
        createdAt: getPastDate(5),
        updatedAt: getPastDate(4),
        statusHistory: [
          {
            status: 'pending',
            updatedBy: 'Dr. Ramesh Kumar',
            timestamp: getPastDate(5),
            note: 'Order submitted through portal.'
          },
          {
            status: 'approved',
            updatedBy: 'Vikram Singh',
            timestamp: getPastDate(4),
            note: 'Commercial credit terms approved.'
          }
        ]
      },
      {
        orderId: 'GMX-ORD-10002',
        customerId: 'cust_medplus_pharmacy',
        customerName: 'Suresh Raina',
        institutionName: 'MedPlus Pharmacy',
        items: [
          {
            productId: 'prod_paracetamol_bulk',
            productName: 'Paracetamol Wholesale Tablets 500mg',
            qty: 4,
            unit: 'Carton of 1000 Packs',
            pricePerUnit: 4500,
            totalPrice: 18000
          }
        ],
        orderTotal: 18000,
        status: 'pending',
        paymentStatus: 'unpaid',
        assignedSalesman: 'Vikram Singh',
        deliveryAddress: {
          street: 'HNo 8-2-293/82/A, Road No 36, Jubilee Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033'
        },
        notes: 'Deliver during standard business hours only.',
        createdAt: getPastDate(1),
        updatedAt: getPastDate(1),
        statusHistory: [
          {
            status: 'pending',
            updatedBy: 'Suresh Raina',
            timestamp: getPastDate(1),
            note: 'Order submitted through mobile portal.'
          }
        ]
      }
    ];

    for (const order of orders) {
      await db.collection('orders').doc(order.orderId).set(order);
    }

    // 4. SEEDING QUOTATIONS
    console.log('Seeding "quotations" collection...');
    const quotations = [
      {
        quotationId: 'GMX-QUO-5001',
        customerId: 'cust_apollo_hospitals',
        customerName: 'Dr. Ramesh Kumar',
        items: [
          {
            productId: 'prod_surgical_masks_01',
            productName: 'N95 Medical Grade Surgical Mask',
            qty: 100,
            unit: 'Box of 100',
            pricePerUnit: 1050,
            totalPrice: 105000
          },
          {
            productId: 'prod_disinfectant_01',
            productName: 'Hexashield Hospital Disinfectant Spirit',
            qty: 50,
            unit: '5-Litre Canister',
            pricePerUnit: 800,
            totalPrice: 40000
          }
        ],
        totalAmount: 145000,
        validUntil: getFutureDate(15),
        status: 'sent',
        createdBy: 'staff_sales_01',
        createdAt: getPastDate(3)
      }
    ];

    for (const quote of quotations) {
      await db.collection('quotations').doc(quote.quotationId).set(quote);
    }

    // 5. SEEDING INVENTORY
    console.log('Seeding "inventory" collection...');
    const inventoryItems = [
      {
        inventoryId: 'inv_masks_batch_01',
        productId: 'prod_surgical_masks_01',
        productName: 'N95 Medical Grade Surgical Mask',
        warehouseLocation: 'Aisle 3, Shelf D, Rack A',
        batchNumber: 'BT-MSK-N95-2026',
        currentStock: 4000,
        reservedStock: 15,
        reorderLevel: 500,
        lastUpdated: getPastDate(5),
        updatedBy: 'Anil Kumar'
      },
      {
        inventoryId: 'inv_disinf_batch_01',
        productId: 'prod_disinfectant_01',
        productName: 'Hexashield Hospital Disinfectant Spirit',
        warehouseLocation: 'Aisle 8, Ground Zone C',
        batchNumber: 'BT-DIS-HEXA-04',
        currentStock: 1200,
        reservedStock: 10,
        reorderLevel: 200,
        lastUpdated: getPastDate(2),
        updatedBy: 'Anil Kumar'
      }
    ];

    for (const inv of inventoryItems) {
      await db.collection('inventory').doc(inv.inventoryId).set(inv);
    }

    // 6. SEEDING DELIVERIES
    console.log('Seeding "deliveries" collection...');
    const deliveries = [
      {
        deliveryId: 'GMX-DEL-7001',
        orderId: 'GMX-ORD-10001',
        assignedCoordinator: 'Rahul Dravid',
        vehicleNumber: 'DL-3C-AY-8821',
        driverName: 'Jagjit Singh',
        estimatedDate: getFutureDate(2),
        actualDate: null,
        status: 'scheduled',
        trackingNotes: [
          'Logistics order generated at central dispatch.',
          'Assigned vehicle DL-3C-AY-8821 and driver Jagjit.'
        ],
        createdAt: getPastDate(1)
      }
    ];

    for (const del of deliveries) {
      await db.collection('deliveries').doc(del.deliveryId).set(del);
    }

    // 7. SEEDING CREDIT ACCOUNTS
    console.log('Seeding "creditAccounts" collection...');
    const creditAccounts = [
      {
        creditId: 'cred_apollo_hospitals',
        customerId: 'cust_apollo_hospitals',
        customerName: 'Dr. Ramesh Kumar',
        creditLimit: 500000,
        usedCredit: 26500,
        balance: 473500,
        paymentTermDays: 45,
        agingBuckets: {
          current: 26500,
          days30: 0,
          days60: 0,
          days90plus: 0
        },
        lastPaymentDate: getPastDate(15),
        status: 'active'
      },
      {
        creditId: 'cred_medplus_pharmacy',
        customerId: 'cust_medplus_pharmacy',
        customerName: 'Suresh Raina',
        creditLimit: 300000,
        usedCredit: 18000,
        balance: 282000,
        paymentTermDays: 30,
        agingBuckets: {
          current: 18000,
          days30: 0,
          days60: 0,
          days90plus: 0
        },
        lastPaymentDate: getPastDate(25),
        status: 'active'
      }
    ];

    for (const cred of creditAccounts) {
      await db.collection('creditAccounts').doc(cred.creditId).set(cred);
    }

    // 8. SEEDING COMPLIANCE RECORDS
    console.log('Seeding "complianceRecords" collection...');
    const complianceRecords = [
      {
        complianceId: 'comp_disinf_01',
        productId: 'prod_disinfectant_01',
        productName: 'Hexashield Hospital Disinfectant Spirit',
        msdsDocumentUrl: 'https://gangamaxx.com/documents/msds-hexashield-spirit.pdf',
        chemicalHandlingNotes: 'Store below 25°C. Flammable liquid. Keep away from heat, sparks, open flames. Handle with gloves and eye protection.',
        lastReviewDate: getPastDate(120),
        reviewedBy: 'Sanjana Roy',
        acknowledgements: [
          {
            staffId: 'staff_warehouse_01',
            acknowledgedAt: getPastDate(115)
          }
        ],
        status: 'compliant'
      }
    ];

    for (const comp of complianceRecords) {
      await db.collection('complianceRecords').doc(comp.complianceId).set(comp);
    }

    console.log('✅ Baseline project setup completed successfully!');
  } catch (error) {
    console.error('❌ Error during baseline database seeding:', error);
  }
}

// Execute the seeding
async function run() {
  const success = await testFirestoreConnection();
  if (success) {
    await seedDatabase();
  } else {
    console.error('❌ Database seeding aborted due to connection test failure.');
    process.exit(1);
  }
}

run();
