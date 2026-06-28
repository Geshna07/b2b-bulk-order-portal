import { initializeApp as initializeAdminApp, getApps as getAdminApps, applicationDefault as adminApplicationDefault } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../../firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const clientApp = initializeApp(config);
const realDb = getFirestore(clientApp, config.firestoreDatabaseId);

let _auth = null;
let _adminDb = null;

function getAuth() {
  if (!_auth) {
    if (!getAdminApps().length) {
      initializeAdminApp({
        credential: adminApplicationDefault(),
        projectId: 'startup-glass-23kpg'
      });
    }
    _auth = getAdminAuth();
  }
  return _auth;
}

// Wrapper for Client SDK to look like Admin SDK / v8 SDK
class DocWrapper {
  constructor(db, path) { this.db = db; this.path = path; }
  async get() { 
     const snap = await getDoc(doc(this.db, this.path));
     return { id: snap.id, exists: snap.exists(), data: () => snap.data() };
  }
  async set(data, options) { return await setDoc(doc(this.db, this.path), data, options); }
  async update(data) { return await updateDoc(doc(this.db, this.path), data); }
  async delete() { return await deleteDoc(doc(this.db, this.path)); }
}

class QueryWrapper {
  constructor(db, path, queryConstraints = []) {
    this.db = db;
    this.path = path;
    this.queryConstraints = queryConstraints;
  }
  where(field, op, val) {
    return new QueryWrapper(this.db, this.path, [...this.queryConstraints, where(field, op, val)]);
  }
  orderBy(field, dir) {
    return new QueryWrapper(this.db, this.path, [...this.queryConstraints, orderBy(field, dir)]);
  }
  limit(n) {
    return new QueryWrapper(this.db, this.path, [...this.queryConstraints, limit(n)]);
  }
  async get() {
    const q = query(collection(this.db, this.path), ...this.queryConstraints);
    const snap = await getDocs(q);
    const mappedDocs = snap.docs.map(d => ({ id: d.id, exists: d.exists(), data: () => d.data() }));
    return {
      empty: snap.empty,
      docs: mappedDocs,
      forEach: (cb) => mappedDocs.forEach(cb)
    };
  }
}

class CollectionWrapper extends QueryWrapper {
  constructor(db, path) {
    super(db, path);
  }
  doc(id) {
    return new DocWrapper(this.db, id ? `${this.path}/${id}` : `${this.path}/${Math.random().toString(36).substr(2, 9)}`);
  }
  async add(data) {
     const newId = Math.random().toString(36).substr(2, 9);
     const d = this.doc(newId);
     await d.set(data);
     return d;
  }
}

class DbWrapper {
  constructor(db) { this.db = db; }
  collection(path) { return new CollectionWrapper(this.db, path); }
}

const db = new DbWrapper(realDb);

const auth = {
    verifyIdToken: async (token) => {
        return await getAuth().verifyIdToken(token);
    },
    getUser: async (uid) => {
        return await getAuth().getUser(uid);
    },
    createUser: async (user) => {
        return await getAuth().createUser(user);
    }
};

const adminSdk = {
  auth: () => auth,
  firestore: () => db,
};

export { adminSdk as admin, db, auth };
