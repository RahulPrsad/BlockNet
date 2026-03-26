// ─────────────────────────────────────────────
// popup.js — Extension Popup Controller
// ─────────────────────────────────────────────

const BACKEND_URL = "http://localhost:5000";

const CATEGORY_META = {
  games:     { icon: "🎮", label: "Games" },
  adult:     { icon: "🔞", label: "Adult" },
  social:    { icon: "💬", label: "Social Media" },
  stocks:    { icon: "📈", label: "Stock Market" },
  streaming: { icon: "📺", label: "Streaming" },
  news:      { icon: "📰", label: "News" },
  shopping:  { icon: "🛒", label: "Shopping" },
  gambling:  { icon: "🎰", label: "Gambling" }
};

// ── Tab Switching ──────────────────────────────
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ── Build Category Grid ────────────────────────
function buildCategoryGrid() {
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";

  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    const item = document.createElement("label");
    item.className = "category-item";
    item.innerHTML = `
      <input type="checkbox" value="${key}" />
      <span class="category-icon">${meta.icon}</span>
      <span class="category-label">${meta.label}</span>
    `;
    const cb = item.querySelector("input");
    cb.addEventListener("change", () => {
      item.classList.toggle("active", cb.checked);
    });
    grid.appendChild(item);
  }
}

// ── Load Saved State ───────────────────────────
function loadState() {
  chrome.storage.local.get(
    ["blockedCategories", "customDomains", "blockStats", "focusEnd"],
    (data) => {
      const cats = data.blockedCategories || [];
      const customs = data.customDomains || [];
      const stats = data.blockStats || { today: 0, total: 0 };

      // Check categories
      document.querySelectorAll("#categoryGrid input").forEach(cb => {
        if (cats.includes(cb.value)) {
          cb.checked = true;
          cb.closest(".category-item").classList.add("active");
        }
      });

      // Render custom domains
      renderCustomDomains(customs);

      // Update stats
      updateStats(cats, customs, stats);

      // Status indicator
      const active = cats.length > 0 || customs.length > 0;
      document.getElementById("statusDot").className = "status-dot" + (active ? "" : " inactive");
      document.getElementById("statusText").textContent = active ? "Protection Active" : "Protection Inactive";
      document.getElementById("blockedCount").textContent = `${countDomains(cats, customs)} sites blocked`;

      // Focus mode
      if (data.focusEnd && Date.now() < data.focusEnd) {
        showFocusActive(data.focusEnd);
      }

      // Load logs
      loadLogs();
    }
  );
}

function countDomains(cats, customs) {
  let count = customs.length;
  cats.forEach(cat => {
    if (CATEGORY_RULES[cat]) count += CATEGORY_RULES[cat].length;
  });
  return count;
}

function updateStats(cats, customs, stats) {
  document.getElementById("statCategories").textContent = cats.length;
  document.getElementById("statDomains").textContent = countDomains(cats, customs);
  document.getElementById("statBlocked").textContent = stats.today || 0;
}

// ── Custom Domains ─────────────────────────────
function renderCustomDomains(domains) {
  const list = document.getElementById("customList");
  list.innerHTML = "";
  domains.forEach(d => {
    const tag = document.createElement("span");
    tag.className = "custom-tag";
    tag.innerHTML = `${d} <span class="remove" data-domain="${d}">✕</span>`;
    list.appendChild(tag);
  });

  list.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", () => {
      chrome.storage.local.get("customDomains", data => {
        const updated = (data.customDomains || []).filter(x => x !== btn.dataset.domain);
        chrome.storage.local.set({ customDomains: updated }, () => {
          renderCustomDomains(updated);
          chrome.runtime.sendMessage({ action: "updateRules" });
        });
      });
    });
  });
}

document.getElementById("addCustomBtn").addEventListener("click", () => {
  const input = document.getElementById("customDomainInput");
  let domain = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  if (!domain || !domain.includes(".")) return;

  chrome.storage.local.get("customDomains", data => {
    const customs = data.customDomains || [];
    if (!customs.includes(domain)) {
      customs.push(domain);
      chrome.storage.local.set({ customDomains: customs }, () => {
        renderCustomDomains(customs);
        input.value = "";
        chrome.runtime.sendMessage({ action: "updateRules" });
      });
    }
  });
});

// ── Save / Apply ───────────────────────────────
document.getElementById("saveBtn").addEventListener("click", () => {
  const selected = [];
  document.querySelectorAll("#categoryGrid input:checked").forEach(cb => {
    selected.push(cb.value);
  });

  chrome.storage.local.set({ blockedCategories: selected }, () => {
    chrome.runtime.sendMessage({ action: "updateRules" }, () => {
      // Refresh UI
      loadState();
    });
  });
});

// ── Reset / Unblock All ────────────────────────
document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Remove all blocking rules?")) return;

  chrome.storage.local.set(
    { blockedCategories: [], customDomains: [], focusEnd: null },
    () => {
      chrome.runtime.sendMessage({ action: "updateRules" }, () => {
        loadState();
      });
      chrome.alarms.clear("focusModeEnd");
    }
  );
});

// ── Focus Mode ─────────────────────────────────
document.getElementById("startFocusBtn").addEventListener("click", () => {
  const mins = parseInt(document.getElementById("focusDuration").value);
  const end = Date.now() + mins * 60 * 1000;

  // Enable all categories during focus
  const allCats = Object.keys(CATEGORY_META);
  chrome.storage.local.set({ blockedCategories: allCats, focusEnd: end }, () => {
    chrome.runtime.sendMessage({ action: "updateRules" });
    chrome.alarms.create("focusModeEnd", { when: end });
    showFocusActive(end);
    loadState();
  });
});

function showFocusActive(endTime) {
  document.getElementById("focusControls").style.display = "none";
  const el = document.getElementById("focusActive");
  el.style.display = "block";

  function update() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      el.textContent = "Focus mode ended!";
      document.getElementById("focusControls").style.display = "block";
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    el.textContent = `⏱️ Focus Mode: ${m}m ${s}s remaining`;
    setTimeout(update, 1000);
  }
  update();
}

// ── Logs ───────────────────────────────────────
function loadLogs() {
  chrome.storage.local.get("blockLog", data => {
    const logs = data.blockLog || [];
    const list = document.getElementById("logList");

    if (logs.length === 0) {
      list.innerHTML = '<p style="font-size:12px;color:#64748b;text-align:center;">No blocked sites yet</p>';
      return;
    }

    list.innerHTML = "";
    logs.slice(-50).reverse().forEach(entry => {
      const item = document.createElement("div");
      item.className = "log-item";
      item.innerHTML = `
        <span class="log-domain">${entry.domain}</span>
        <span class="log-time">${new Date(entry.time).toLocaleTimeString()}</span>
      `;
      list.appendChild(item);
    });
  });
}

document.getElementById("clearLogsBtn").addEventListener("click", () => {
  chrome.storage.local.set({ blockLog: [], blockStats: { today: 0, total: 0 } }, () => {
    loadLogs();
    document.getElementById("statBlocked").textContent = "0";
  });
});

// ── Backend (System-Wide) ──────────────────────
document.getElementById("checkBackendBtn").addEventListener("click", async () => {
  const status = document.getElementById("backendStatus");
  try {
    const res = await fetch(BACKEND_URL + "/status", { method: "GET" });
    if (res.ok) {
      status.className = "backend-status connected";
      status.textContent = "✅ Backend Connected — System-wide blocking available";
    } else {
      throw new Error("Not OK");
    }
  } catch {
    status.className = "backend-status disconnected";
    status.textContent = "⚠️ Backend Not Running — Start server on port 5000";
  }
});

document.getElementById("syncBackendBtn").addEventListener("click", async () => {
  const data = await new Promise(resolve => {
    chrome.storage.local.get(["blockedCategories", "customDomains"], resolve);
  });

  try {
    const res = await fetch(BACKEND_URL + "/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: data.blockedCategories || [],
        customDomains: data.customDomains || []
      })
    });

    const result = await res.json();
    alert(result.message || "Rules synced to system hosts file!");
  } catch {
    alert("❌ Could not connect to backend. Make sure server is running on port 5000.");
  }
});

document.getElementById("resetBackendBtn").addEventListener("click", async () => {
  if (!confirm("Reset the system hosts file? This will unblock all sites system-wide.")) return;

  try {
    const res = await fetch(BACKEND_URL + "/reset", { method: "POST" });
    const result = await res.json();
    alert(result.message || "Hosts file reset!");
  } catch {
    alert("❌ Could not connect to backend.");
  }
});

// ── Initialize ─────────────────────────────────
buildCategoryGrid();
loadState();
