import { db } from '../backend/utils/firebaseAdmin.js';

async function clearData() {
  console.log('Clearing Firestore data...');
  const collections = ['users', 'orders', 'products', 'quotations', 'inventory', 'deliveries', 'creditAccounts', 'complianceRecords'];
  
  for (const collectionName of collections) {
    console.log(`Clearing ${collectionName}...`);
    let snapshot;
    do {
        snapshot = await db.collection(collectionName).limit(100).get();
        if (snapshot.size === 0) break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Deleted 100 from ${collectionName}`);
    } while (snapshot.size === 100);
    console.log(`Cleared ${collectionName}`);
  }
  console.log('Database cleared.');
}

clearData().catch(console.error);
