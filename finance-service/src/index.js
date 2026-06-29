const express = require("express");
const { config, validateConfig } = require("./config");
const financeRouter = require("./routes/finance.route");

// Fail fast on missing env vars
validateConfig();

const app = express();
app.use(express.json());

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
