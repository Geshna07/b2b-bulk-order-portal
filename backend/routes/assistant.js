import express from 'express';
import { queryAssistant } from '../controllers/assistantController.js';

const router = express.Router();

// PART 1 — BACKEND DATA QUERY API
// Unified natural language database access route
router.post('/query', queryAssistant);

// Backward compatibility for existing full-screen or custom chat calls
router.post('/chat', queryAssistant);

export default router;
