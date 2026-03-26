// ─────────────────────────────────────────────
// reset.js — Restore Hosts File
// ─────────────────────────────────────────────
// Removes all Smart Web Filter entries from
// the system hosts file.
// Can be run standalone: node reset.js
// ─────────────────────────────────────────────

const fs = require("fs");
const { HOSTS_PATH, START_MARKER, END_MARKER } = require("./blocker");

/**
 * Remove all Smart Filter entries from the hosts file.
 * @returns {{ success: boolean, message: string }}
 */
function resetHostsFile() {
  try {
    let hostsContent = fs.readFileSync(HOSTS_PATH, "utf8");

    const startIdx = hostsContent.indexOf(START_MARKER);
    const endIdx = hostsContent.indexOf(END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
      return { success: true, message: "No Smart Filter entries found. Hosts file is clean." };
    }

    // Remove our section
    hostsContent = hostsContent.substring(0, startIdx) +
                   hostsContent.substring(endIdx + END_MARKER.length);

    // Clean up extra blank lines
    hostsContent = hostsContent.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

    fs.writeFileSync(HOSTS_PATH, hostsContent, "utf8");

    console.log("[Reset] ✅ Hosts file restored successfully");
    return { success: true, message: "Hosts file restored. All sites unblocked." };
  } catch (err) {
    console.error("[Reset] ❌ Error:", err.message);

    if (err.code === "EPERM" || err.code === "EACCES") {
      return {
        success: false,
        message: "Permission denied! Run as Administrator (Windows) or with sudo (Linux/macOS)."
      };
    }

    return { success: false, message: err.message };
  }
}

// Allow standalone execution: node reset.js
if (require.main === module) {
  const result = resetHostsFile();
  console.log(result.message);
  process.exit(result.success ? 0 : 1);
}

module.exports = { resetHostsFile };
