// mindful-market-extension/background.js

// This script will handle:
// 1. Message passing between content scripts and the popup
// 2. Tracking user shopping habits (time, cart items, add-to-cart frequency)
// 3. Triggering mindful shopping prompts

console.log("Mindful Market background script loaded.");


// --- User Shopping Habit Tracking ---
let activeTabId = null;
let tabStartTime = null; // Tracks start time for the currently active tab

let shoppingStats = {
  totalBrowsingTime: 0, // in seconds, accumulated across all active sessions
  itemsInCart: 0,
  addToCartFrequency: 0,
  lastAddToCartTime: null
};

// Load initial shopping stats from storage
chrome.storage.local.get(['shoppingStats'], (result) => {
  if (result.shoppingStats) {
    shoppingStats = result.shoppingStats;
    console.log("Loaded shopping stats:", shoppingStats);
  }
});

function saveShoppingStats() {
  chrome.storage.local.set({ shoppingStats: shoppingStats }, () => {
    console.log("Shopping stats saved:", shoppingStats);
  });
}

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCart") {
    shoppingStats.itemsInCart = request.itemsInCart;
    if (request.addedToCart) {
      shoppingStats.addToCartFrequency++;
      shoppingStats.lastAddToCartTime = Date.now();
    }
    saveShoppingStats();
  } else if (request.action === "updatePageStats") {
    // Update browsing time and cart count from content script
    if (sender.tab.id === activeTabId && tabStartTime) {
      const duration = (Date.now() - tabStartTime) / 1000;
      shoppingStats.totalBrowsingTime += duration;
      tabStartTime = Date.now(); // Reset start time for continuous tracking
    }
    shoppingStats.itemsInCart = request.cartCount;
    saveShoppingStats();
  } else if (request.action === "getShoppingStats") {
    sendResponse(shoppingStats);
  }
  // No longer handling "getProductAlternatives" or "displayPrompt" from here
  // as these are now managed by content.js or removed.
});

// Handle tab activation to track browsing time accurately
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Save time for the previously active tab
  if (activeTabId && tabStartTime) {
    const duration = (Date.now() - tabStartTime) / 1000;
    shoppingStats.totalBrowsingTime += duration;
    saveShoppingStats();
    console.log(`Browsing stopped on tab ${activeTabId} due to switch. Duration: ${duration}s`);
  }

  // Start tracking for the newly active tab if it's a shopping site
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && (tab.url.includes("amazon.com") || tab.url.includes("target.com"))) {
      activeTabId = activeInfo.tabId;
      tabStartTime = Date.now();
      console.log(`Browsing started on tab ${activeTabId} (activated)`);
    } else {
      activeTabId = null;
      tabStartTime = null;
    }
  });
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === activeTabId && tabStartTime) {
    const duration = (Date.now() - tabStartTime) / 1000;
    shoppingStats.totalBrowsingTime += duration;
    saveShoppingStats();
    console.log(`Browsing stopped on tab ${tabId} (removed). Duration: ${duration}s`);
    activeTabId = null;
    tabStartTime = null;
  }
});

// Initialize active tab tracking on startup
chrome.windows.getLastFocused({ populate: true }, (window) => {
  if (window && window.tabs) {
    const activeTab = window.tabs.find(tab => tab.active);
    if (activeTab && (activeTab.url.includes("amazon.com") || activeTab.url.includes("target.com"))) {
      activeTabId = activeTab.id;
      tabStartTime = Date.now();
      console.log(`Browsing started on initial active tab ${activeTabId}`);
    }
  }
});