// ─────────────────────────────────────────────
// background.js — Service Worker
// Handles declarativeNetRequest rules + logging
// ─────────────────────────────────────────────

// Category rules (duplicated here since service workers can't load external JS via script tags)
const CATEGORY_RULES = {
  games: ["poki.com","crazygames.com","miniclip.com","kongregate.com","addictinggames.com","y8.com","agame.com","coolmathgames.com","gameflare.com","silvergames.com","kizi.com","friv.com","games.co.in","steamcommunity.com"],
  adult: ["pornhub.com","xvideos.com","xhamster.com","redtube.com","youporn.com","xnxx.com","tube8.com","spankbang.com","eporner.com","hentaihaven.xxx"],
  social: ["facebook.com","instagram.com","twitter.com","x.com","tiktok.com","snapchat.com","reddit.com","tumblr.com","pinterest.com","linkedin.com","discord.com","threads.net"],
  stocks: ["tradingview.com","zerodha.com","moneycontrol.com","investing.com","tickertape.in","groww.in","upstox.com","kite.zerodha.com","screener.in","trendlyne.com","stockedge.com"],
  streaming: ["youtube.com","twitch.tv","hotstar.com","primevideo.com","disneyplus.com","hulu.com","crunchyroll.com","9anime.to","sonylivin.com"],
  news: ["cnn.com","bbc.com","foxnews.com","ndtv.com","timesofindia.indiatimes.com","news18.com","aajtak.in","thehindu.com","hindustantimes.com"],
  shopping: ["amazon.com","amazon.in","flipkart.com","myntra.com","ajio.com","meesho.com","snapdeal.com","ebay.com","aliexpress.com","shopify.com"],
  gambling: ["bet365.com","dream11.com","betway.com","pokerstars.com","1xbet.com","stake.com","casumo.com","888casino.com","unibet.com"]
};

// ── Build & Apply Rules ────────────────────────
async function updateBlockingRules() {
  const data = await chrome.storage.local.get(["blockedCategories", "customDomains"]);
  const categories = data.blockedCategories || [];
  const customDomains = data.customDomains || [];

  // Collect all domains to block
  const domainSet = new Set();
  categories.forEach(cat => {
    (CATEGORY_RULES[cat] || []).forEach(d => domainSet.add(d));
  });
  customDomains.forEach(d => domainSet.add(d));

  const domains = [...domainSet];

  // Build declarativeNetRequest rules
  const blockPageUrl = chrome.runtime.getURL("block.html");
  const rules = domains.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: blockPageUrl + "?domain=" + encodeURIComponent(domain) }
    },
    condition: {
      urlFilter: "||" + domain,
      resourceTypes: ["main_frame"]
    }
  }));

  // Get existing rule IDs to remove
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map(r => r.id);

  // Apply new rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: rules
  });

  console.log(`[SmartFilter] Applied ${rules.length} blocking rules for ${domains.length} domains`);
}

// ── Message Handler ────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "updateRules") {
    updateBlockingRules().then(() => sendResponse({ ok: true }));
    return true; // async
  }
});

// ── Log Blocked Navigations ────────────────────
chrome.webNavigation?.onBeforeNavigate?.addListener(async (details) => {
  if (details.frameId !== 0) return;

  try {
    const url = new URL(details.url);
    if (url.protocol === "chrome-extension:") return;

    const data = await chrome.storage.local.get(["blockedCategories", "customDomains"]);
    const categories = data.blockedCategories || [];
    const customDomains = data.customDomains || [];

    const domainSet = new Set();
    categories.forEach(cat => {
      (CATEGORY_RULES[cat] || []).forEach(d => domainSet.add(d));
    });
    customDomains.forEach(d => domainSet.add(d));

    const hostname = url.hostname.replace(/^www\./, "");
    if (domainSet.has(hostname)) {
      // Log it
      const logData = await chrome.storage.local.get(["blockLog", "blockStats"]);
      const log = logData.blockLog || [];
      const stats = logData.blockStats || { today: 0, total: 0 };

      log.push({ domain: hostname, time: Date.now() });
      stats.today++;
      stats.total++;

      // Keep only last 200 entries
      if (log.length > 200) log.splice(0, log.length - 200);

      await chrome.storage.local.set({ blockLog: log, blockStats: stats });
    }
  } catch (e) {
    // ignore
  }
});

// ── Focus Mode Alarm ───────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "focusModeEnd") {
    // Reset to no categories blocked
    await chrome.storage.local.set({ blockedCategories: [], focusEnd: null });
    await updateBlockingRules();
    console.log("[SmartFilter] Focus mode ended — all categories unblocked");
  }
});

// ── Initialize on Install/Update ───────────────
chrome.runtime.onInstalled.addListener(() => {
  updateBlockingRules();
});

// Also update on startup
chrome.runtime.onStartup?.addListener(() => {
  updateBlockingRules();
});
