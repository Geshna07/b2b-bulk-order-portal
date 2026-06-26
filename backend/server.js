import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRouter from './routes/admin.js';
import customerRouter from './routes/customer.js';
import staffRouter from './routes/staff.js';
import assistantRouter from './routes/assistant.js';
import whatsappRouter from './routes/whatsapp.js';

// Auto-seed database on startup
import '../firebase/seedDatabase.js';
import '../firebase/adminSeed.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Admin Routes
app.use('/admin', adminRouter);

// Customer Routes
app.use('/customer', customerRouter);

// Staff Routes
app.use('/staff', staffRouter);

// Assistant Routes
app.use('/assistant', assistantRouter);

// WhatsApp Routes
app.use('/whatsapp', whatsappRouter);

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the /firebase directory so frontend can load config
app.use('/firebase', express.static(path.join(__dirname, '../firebase')));

// Serve config file mapping for firebase-applet-config.json
app.get('/firebase-applet-config.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../firebase-applet-config.json'));
});

// Health Check Route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'B2B Bulk Order Portal'
  });
});

// Default route redirects/serves login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/pages/404.html'));
});

// Start express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

