// Middleware handler placeholder
export const testMiddleware = (req, res, next) => {
  console.log("Middleware executed.");
  next();
};
