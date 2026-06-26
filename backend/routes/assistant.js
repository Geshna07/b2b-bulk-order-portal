import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { messages, sessionId, systemPrompt } = req.body;
    
    const contents = [];
    let sysInstruction = systemPrompt || "You are a helpful assistant.";

    for (const msg of messages) {
      if (msg.role === 'system') {
        sysInstruction = msg.content;
      } else if (msg.role === 'user' || msg.role === 'model') {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    }

    let response;
    const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: sysInstruction,
          }
        });
        if (response && response.text) {
          console.log(`Successfully generated content with model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`Failed to generate content with ${modelName}:`, err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All fallback models failed to generate content.");
    }

    res.json({ reply: response.text });
  } catch (error) {
    console.error("Assistant API Error:", error);
    res.status(500).json({ error: "Failed to process chat request." });
  }
});

export default router;
