// ─────────────────────────────────────────────
// blocker.js — Hosts File Modifier
// ─────────────────────────────────────────────
// Adds blocking entries to the system hosts file.
// Requires Administrator privileges on Windows
// or root/sudo on Linux/macOS.
// ─────────────────────────────────────────────

const fs = require("fs");
const os = require("os");
const CATEGORY_RULES = require("./rules");

// Determine hosts file path based on OS
const HOSTS_PATH = os.platform() === "win32"
  ? "C:\\Windows\\System32\\drivers\\etc\\hosts"
  : "/etc/hosts";

// Marker comments to identify our entries
const START_MARKER = "# >>> SMART-WEB-FILTER START <<<";
const END_MARKER   = "# >>> SMART-WEB-FILTER END <<<";

/**
 * Block domains based on selected categories and custom domains.
 * @param {string[]} categories - Array of category keys (e.g., ["games", "social"])
 * @param {string[]} customDomains - Array of custom domains (e.g., ["example.com"])
 * @returns {{ success: boolean, message: string, count: number }}
 */
function blockDomains(categories = [], customDomains = []) {
  try {
    // 1. Collect all domains to block
    const domainSet = new Set();
    categories.forEach(cat => {
      const domains = CATEGORY_RULES[cat];
      if (domains) {
        domains.forEach(d => {
          domainSet.add(d);
          domainSet.add("www." + d); // Also block www variant
        });
      }
    });
    customDomains.forEach(d => {
      domainSet.add(d);
      domainSet.add("www." + d);
    });

    if (domainSet.size === 0) {
      return { success: true, message: "No domains to block.", count: 0 };
    }

    // 2. Read existing hosts file
    let hostsContent = fs.readFileSync(HOSTS_PATH, "utf8");

    // 3. Remove any existing Smart Filter entries
    const startIdx = hostsContent.indexOf(START_MARKER);
    const endIdx = hostsContent.indexOf(END_MARKER);
    if (startIdx !== -1 && endIdx !== -1) {
      hostsContent = hostsContent.substring(0, startIdx) +
                     hostsContent.substring(endIdx + END_MARKER.length);
    }

    // 4. Build new blocking entries
    const entries = [
      "",
      START_MARKER,
      `# Generated: ${new Date().toISOString()}`,
      `# Categories: ${categories.join(", ") || "none"}`,
      `# Custom: ${customDomains.join(", ") || "none"}`,
      ""
    ];

    for (const domain of domainSet) {
      entries.push(`127.0.0.1 ${domain}`);
    }

    entries.push("", END_MARKER, "");

    // 5. Write updated hosts file
    hostsContent = hostsContent.trimEnd() + "\n" + entries.join("\n");
    fs.writeFileSync(HOSTS_PATH, hostsContent, "utf8");

    console.log(`[Blocker] ✅ Blocked ${domainSet.size} domains`);
    return {
      success: true,
      message: `Successfully blocked ${domainSet.size} domains in hosts file.`,
      count: domainSet.size
    };
  } catch (err) {
    console.error("[Blocker] ❌ Error:", err.message);

    if (err.code === "EPERM" || err.code === "EACCES") {
      return {
        success: false,
        message: "Permission denied! Run the server as Administrator (Windows) or with sudo (Linux/macOS).",
        count: 0
      };
    }

    return { success: false, message: err.message, count: 0 };
  }
}

module.exports = { blockDomains, HOSTS_PATH, START_MARKER, END_MARKER };
