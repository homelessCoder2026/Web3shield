browser.webRequest.onBeforeRequest.addListener(
  function(details) {
    console.log("Visited:", details.url);
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
