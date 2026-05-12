browser.webRequest.onBeforeRequest.addListener(
  function(details) {
    console.log("Visited:", details.url);
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

const legitDomains = [
  "uniswap.org",
  "metamask.io",
  "opensea.io",
  "aave.com",
  "curve.fi",
  "pancakeswap.finance",
  "compound.finance"
];

function isSuspicious(url) {
  return !legitDomains.some(domain => url.includes(domain));
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isSuspicious(details.url)) {
      console.warn("⚠️ Web3Shield: Suspicious or fake crypto site detected:", details.url);
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);


// Basic similarity check between two addresses (very rough)
function addressSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a.length !== b.length) return 0;

  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) same++;
  }
  return same / a.length;
}

const myKnownAddresses = [
  // Replace these with the user's real wallet addresses when you wire it up
  "0x1234567890abcdef1234567890abcdef12345678",
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
];

function detectWalletPoisoning(tokenTransfer) {
  const { from, to, tokenSymbol, amount } = tokenTransfer;

  const isZeroValue = Number(amount) === 0;
  const looksLikeMyAddress = myKnownAddresses.some(addr => addressSimilarity(addr, from) > 0.9);

  if (isZeroValue && looksLikeMyAddress) {
    console.warn("⚠️ Web3Shield: Possible wallet poisoning detected (zero-value from look-alike address):", tokenTransfer);
  }

  if (tokenSymbol && tokenSymbol.toLowerCase().includes("airdrop")) {
    console.warn("⚠️ Web3Shield: Suspicious airdrop token detected:", tokenTransfer);
  }
}

// Simulated listener for token transfers (to be wired to real wallet events later)
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "tokenTransfer") {
    detectWalletPoisoning(msg.data);
  }
});


function detectDusting(transaction) {
  const tinyAmount = 0.0000001; // threshold for dust
  const isTiny = transaction.amount <= tinyAmount;
  const isUnknownSender = !trustedSenders.includes(transaction.from);

  if (isTiny && isUnknownSender) {
    console.warn("⚠️ Web3Shield: Possible dusting attack detected:", transaction);
  }
}

const trustedSenders = [
  "0x0000000000000000000000000000000000000000", // system
  "0x1111111111111111111111111111111111111111"  // placeholder
];

// Simulated listener for wallet activity
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "transaction") {
    detectDusting(msg.data);
  }
});


browser.webNavigation.onCompleted.addListener(async (details) => {
  const url = details.url;

  const isSuspicious = !legitDomains.some(domain => url.includes(domain));

  if (isSuspicious) {
    browser.tabs.executeScript(details.tabId, {
      code: `
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.padding = '12px';
        banner.style.background = '#ff3b30';
        banner.style.color = 'white';
        banner.style.fontSize = '16px';
        banner.style.fontWeight = 'bold';
        banner.style.zIndex = '999999';
        banner.style.textAlign = 'center';
        banner.innerText = '⚠️ Web3Shield: This site may be dangerous.';
        document.body.appendChild(banner);
      `
    });
  }
});
