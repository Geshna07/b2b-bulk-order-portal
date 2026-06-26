// Router placeholders
import express from 'express';
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: "Routes module is active." });
});

export default router;
