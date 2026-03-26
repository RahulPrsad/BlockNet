// ─────────────────────────────────────────────
// rules.js — Category-to-Domain Mapping (Backend)
// ─────────────────────────────────────────────

const CATEGORY_RULES = {
  games: [
    "poki.com", "crazygames.com", "miniclip.com", "kongregate.com",
    "addictinggames.com", "y8.com", "agame.com", "coolmathgames.com",
    "gameflare.com", "silvergames.com", "kizi.com", "friv.com",
    "games.co.in", "steamcommunity.com"
  ],
  adult: [
    "pornhub.com", "xvideos.com", "xhamster.com", "redtube.com",
    "youporn.com", "xnxx.com", "tube8.com", "spankbang.com",
    "eporner.com", "hentaihaven.xxx"
  ],
  social: [
    "facebook.com", "instagram.com", "twitter.com", "x.com",
    "tiktok.com", "snapchat.com", "reddit.com", "tumblr.com",
    "pinterest.com", "linkedin.com", "discord.com", "threads.net"
  ],
  stocks: [
    "tradingview.com", "zerodha.com", "moneycontrol.com", "investing.com",
    "tickertape.in", "groww.in", "upstox.com", "kite.zerodha.com",
    "screener.in", "trendlyne.com", "stockedge.com"
  ],
  streaming: [
    "netflix.com", "youtube.com", "twitch.tv", "hotstar.com",
    "primevideo.com", "disneyplus.com", "hulu.com", "crunchyroll.com",
    "9anime.to", "sonylivin.com"
  ],
  news: [
    "cnn.com", "bbc.com", "foxnews.com", "ndtv.com",
    "timesofindia.indiatimes.com", "news18.com", "aajtak.in",
    "thehindu.com", "hindustantimes.com"
  ],
  shopping: [
    "amazon.com", "amazon.in", "flipkart.com", "myntra.com",
    "ajio.com", "meesho.com", "snapdeal.com", "ebay.com",
    "aliexpress.com", "shopify.com"
  ],
  gambling: [
    "bet365.com", "dream11.com", "betway.com", "pokerstars.com",
    "1xbet.com", "stake.com", "casumo.com", "888casino.com", "unibet.com"
  ]
};

module.exports = CATEGORY_RULES;
