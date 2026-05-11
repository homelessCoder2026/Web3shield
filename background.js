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
