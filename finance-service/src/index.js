const express = require("express");
const { config, validateConfig } = require("./config");
const financeRouter = require("./routes/finance.route");

// Fail fast on missing env vars
validateConfig();

const app = express();
app.use(express.json());

// ================================
// INTERNAL API KEY GUARD
// Enforced only when INTERNAL_API_KEY is set. /health stays open for uptime checks.
// ================================
app.use((req, res, next) => {
  if (!config.internalApiKey) return next(); // ponytail: unset = open (dev/test)
  if (req.path === "/health") return next();
  if (req.get("x-api-key") === config.internalApiKey) return next();
  return res.status(401).json({ error: "Unauthorized" });
});

// ================================
// ROUTES
// ================================
app.use("/", financeRouter);

// ================================
// START
// ================================
app.listen(config.port, () => {
  console.log(`🚀 finance-service running on port ${config.port}`);
});

module.exports = app;
