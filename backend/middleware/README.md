# Express Middlewares
This directory contains custom Express middleware logic executed during the request-response cycle.

## Expected Middlewares:
- `authMiddleware.js`: Verifies Firebase ID Tokens or custom JWT sessions to protect private routes.
- `errorMiddleware.js`: Handles backend application exceptions gracefully, formatting response payloads.
