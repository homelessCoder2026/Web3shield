/**
 * Web3 Shield - Background Service Worker
 * Handles security detection, storage, and event coordination
 * Compatible with Manifest v3
 */

// Default configuration
const DEFAULT_CONFIG = {
  knownAddresses: [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
  ],
  trustedSenders: [
    "0x0000000000000000000000000000000000000000"
  ],
  legitDomains: [
    "uniswap.org",
    "metamask.io",
    "opensea.io",
    "aave.com",
    "curve.fi",
    "pancakeswap.finance",
    "compound.finance",
    "coinbase.com",
    "kraken.com",
    "binance.com"
  ],
  dustThreshold: 0.0000001,
  addressSimilarityThreshold: 0.9,
  enableLogging: true
};

// Initialize storage on first install
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get("config");
  if (!stored.config) {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG });
  }
  if (!stored.alerts) {
    await chrome.storage.local.set({ alerts: [] });
  }
  console.log("[Web3Shield] Service worker installed and initialized");
});

/**
 * Utility: Extract domain from URL
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Utility: Calculate Levenshtein distance
 */
function levenshteinDistance(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Utility: Calculate address similarity (0-1)
 */
function calculateAddressSimilarity(addr1, addr2) {
  if (!addr1 || !addr2 || addr1.length !== addr2.length) return 0;
  const distance = levenshteinDistance(addr1, addr2);
  return 1 - distance / addr1.length;
}

/**
 * Log alert to storage and console
 */
async function logAlert(type, message, details = {}) {
  const config = (await chrome.storage.local.get("config")).config || DEFAULT_CONFIG;
  
  if (!config.enableLogging) return;
  
  const alert = {
    type,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  console.warn(`[Web3Shield] ${type}:`, message, details);
  
  // Store alerts in history (keep last 100)
  const stored = await chrome.storage.local.get("alerts");
  let alerts = stored.alerts || [];
  alerts = alerts.slice(-99);
  alerts.push(alert);
  await chrome.storage.local.set({ alerts });
}

/**
 * Check if domain is suspicious
 */
async function isSuspiciousDomain(url) {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  const config = (await chrome.storage.local.get("config")).config || DEFAULT_CONFIG;
  const legitDomains = new Set(config.legitDomains);
  
  // Exact match only (prevents false positives)
  return !legitDomains.has(domain);
}

/**
 * Detect wallet poisoning attacks
 */
async function detectWalletPoisoning(tokenTransfer) {
  const config = (await chrome.storage.local.get("config")).config || DEFAULT_CONFIG;
  const { from, to, tokenSymbol, amount, tabId } = tokenTransfer;
  
  const isZeroValue = Number(amount) === 0;
  const threshold = config.addressSimilarityThreshold;
  
  // Check for look-alike addresses
  const looksLikeMyAddress = config.knownAddresses.some(
    addr => calculateAddressSimilarity(addr, from) > threshold
  );
  
  if (isZeroValue && looksLikeMyAddress) {
    await logAlert(
      "WALLET_POISONING",
      "Possible wallet poisoning detected (zero-value from look-alike address)",
      { tokenTransfer, from, to, tabId }
    );
    
    // Notify content script to show warning
    if (tabId) {
      chrome.tabs
        .sendMessage(tabId, {
          type: "showAlert",
          alert: "🚨 WALLET POISONING: Zero-value token from suspicious address detected!"
        })
        .catch(() => {}); // Ignore if tab closed
    }
  }
  
  // Check for suspicious airdrop tokens
  if (tokenSymbol?.toLowerCase().includes("airdrop")) {
    await logAlert(
      "SUSPICIOUS_AIRDROP",
      "Suspicious airdrop token detected",
      { tokenTransfer, tokenSymbol, tabId }
    );
    
    if (tabId) {
      chrome.tabs
        .sendMessage(tabId, {
          type: "showAlert",
          alert: "⚠️ AIRDROP: Suspicious airdrop token detected!"
        })
        .catch(() => {});
    }
  }
}

/**
 * Detect dusting attacks
 */
async function detectDusting(transaction) {
  const config = (await chrome.storage.local.get("config")).config || DEFAULT_CONFIG;
  const { from, amount, tabId } = transaction;
  
  const isTiny = Number(amount) <= config.dustThreshold;
  const isTrustedSender = config.trustedSenders.some(
    addr => addr.toLowerCase() === from.toLowerCase()
  );
  
  if (isTiny && !isTrustedSender) {
    await logAlert(
      "DUSTING_ATTACK",
      "Possible dusting attack detected (tiny amount from unknown sender)",
      { transaction, amount, from, tabId }
    );
    
    if (tabId) {
      chrome.tabs
        .sendMessage(tabId, {
          type: "showAlert",
          alert: "🚨 DUSTING: Suspicious tiny transaction detected!"
        })
        .catch(() => {});
    }
  }
}

/**
 * Monitor web requests for suspicious domains (declarative net request alternative)
 * Since webRequest is deprecated, we monitor tab updates instead
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    const url = tab.url;
    
    // Skip chrome extension URLs
    if (url.startsWith("chrome-extension://")) return;
    
    if (await isSuspiciousDomain(url)) {
      const domain = extractDomain(url);
      await logAlert(
        "SUSPICIOUS_DOMAIN",
        `Suspicious domain detected: ${domain}`,
        { url, domain, tabId }
      );
      
      // Notify content script
      chrome.tabs
        .sendMessage(tabId, {
          type: "showAlert",
          alert: `⚠️ WARNING: ${domain} may be a fake crypto site!`
        })
        .catch(() => {});
    }
  }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.type === "tokenTransfer") {
        await detectWalletPoisoning({
          ...request.data,
          tabId: sender.tab.id
        });
        sendResponse({ success: true });
      } else if (request.type === "transaction") {
        await detectDusting({
          ...request.data,
          tabId: sender.tab.id
        });
        sendResponse({ success: true });
      } else if (request.type === "getConfig") {
        const stored = await chrome.storage.local.get("config");
        sendResponse(stored.config || DEFAULT_CONFIG);
      } else if (request.type === "setConfig") {
        await chrome.storage.local.set({ config: request.config });
        sendResponse({ success: true });
      } else if (request.type === "getAlerts") {
        const stored = await chrome.storage.local.get("alerts");
        sendResponse(stored.alerts || []);
      } else if (request.type === "clearAlerts") {
        await chrome.storage.local.set({ alerts: [] });
        sendResponse({ success: true });
      } else if (request.type === "setAlerts") {
        await chrome.storage.local.set({ alerts: request.alerts });
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error("[Web3Shield] Message handler error:", error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // Keep channel open for async response
});

console.log("[Web3Shield] Service worker ready");
