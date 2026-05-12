/**
 * Web3 Shield - Content Script
 * Runs on all webpages to inject warnings and monitor wallet interactions
 */

// Track injected banners to prevent duplicates
const injectedBanners = new Set();

/**
 * Show security warning banner
 */
function showAlert(message) {
  // Prevent duplicate banners
  if (injectedBanners.has(message)) return;
  injectedBanners.add(message);
  
  const banner = document.createElement('div');
  banner.id = 'web3shield-alert';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #ff3b30 0%, #ff453a 100%);
    color: white;
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    z-index: 2147483647;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  `;
  
  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
      <span>${message}</span>
      <button id="web3shield-close" style="
        background: rgba(255,255,255,0.3);
        border: none;
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 12px;
        transition: background 0.2s;
      ">✕ Close</button>
    </div>
  `;
  
  document.body.insertBefore(banner, document.body.firstChild);
  
  // Close button handler
  document.getElementById('web3shield-close')?.addEventListener('click', () => {
    banner.remove();
    injectedBanners.delete(message);
  });
  
  // Auto-remove after 10 seconds if not closed
  setTimeout(() => {
    if (banner.parentNode) {
      banner.remove();
      injectedBanners.delete(message);
    }
  }, 10000);
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "showAlert") {
    showAlert(request.alert);
  }
});

/**
 * Inject script to detect wallet interactions
 * This script runs in the page context to access wallet objects
 */
function injectWalletDetector() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

// Inject detector if page has Web3
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectWalletDetector);
} else {
  injectWalletDetector();
}

/**
 * Listen for token transfer and transaction events from injected script
 */
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'web3shield-tokenTransfer') {
    chrome.runtime.sendMessage({
      type: 'tokenTransfer',
      data: event.data.payload
    }).catch(() => {}); // Ignore errors
  } else if (event.data.type === 'web3shield-transaction') {
    chrome.runtime.sendMessage({
      type: 'transaction',
      data: event.data.payload
    }).catch(() => {}); // Ignore errors
  }
});

console.log('[Web3Shield] Content script loaded');
