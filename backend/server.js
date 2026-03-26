// ─────────────────────────────────────────────
// server.js — Express Backend for System-Wide Blocking
// ─────────────────────────────────────────────
// This server receives blocking requests from
// the Chrome extension and modifies the system
// hosts file to block sites across ALL browsers.
//
// IMPORTANT: Must run with Administrator/root
// privileges to modify the hosts file.
//
// Usage:
//   Windows: Run CMD as Administrator → node server.js
//   Linux/macOS: sudo node server.js
// ─────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
const { blockDomains } = require("./blocker");
const { resetHostsFile } = require("./reset");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());              // Allow requests from extension
app.use(express.json());      // Parse JSON body

// ── Health Check ───────────────────────────────
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    server: "Smart Web Content Filter Backend",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
});

// ── Block Domains ──────────────────────────────
// POST /block
// Body: { categories: ["games", "social"], customDomains: ["example.com"] }
app.post("/block", (req, res) => {
  const { categories = [], customDomains = [] } = req.body;

  console.log(`\n[Server] 📡 Block request received`);
  console.log(`  Categories: ${categories.join(", ") || "none"}`);
  console.log(`  Custom domains: ${customDomains.join(", ") || "none"}`);

  const result = blockDomains(categories, customDomains);

  const statusCode = result.success ? 200 : 500;
  res.status(statusCode).json(result);
});

// ── Reset / Unblock All ────────────────────────
// POST /reset
app.post("/reset", (req, res) => {
  console.log(`\n[Server] 🗑️ Reset request received`);

  const result = resetHostsFile();

  const statusCode = result.success ? 200 : 500;
  res.status(statusCode).json(result);
});

// ── List Active Rules ──────────────────────────
// GET /rules
app.get("/rules", (req, res) => {
  const CATEGORY_RULES = require("./rules");
  res.json({
    categories: Object.keys(CATEGORY_RULES),
    rules: CATEGORY_RULES
  });
});

// ── Start Server ───────────────────────────────
app.listen(PORT, () => {
  console.log("═══════════════════════════════════════════════");
  console.log("  🛡️  Smart Web Content Filter — Backend");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Endpoints:`);
  console.log(`    GET  /status  — Health check`);
  console.log(`    POST /block   — Block domains`);
  console.log(`    POST /reset   — Unblock all`);
  console.log(`    GET  /rules   — List all rules`);
  console.log("═══════════════════════════════════════════════");
  console.log("  ⚠️  Ensure this runs with Admin/root privileges");
  console.log("═══════════════════════════════════════════════\n");
});
