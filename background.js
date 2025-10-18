// mindful-market-extension/background.js

// This script will handle:
// 1. API calls to sustainability databases (custom and public)
// 2. Caching of eco-score data
// 3. Message passing between content scripts and the popup
// 4. Tracking user shopping habits (time, cart items, add-to-cart frequency)
// 5. Triggering mindful shopping prompts

console.log("Mindful Market background script loaded.");

// --- Data Caching and API Calls (Placeholder) ---
const ecoScoreCache = {}; // Simple in-memory cache for eco-scores

async function fetchEcoScore(productDetails) {
  const productId = productDetails.id;
  if (ecoScoreCache[productId]) {
    return ecoScoreCache[productId];
  }

  console.log(`Fetching eco-score for product: ${productDetails.name || productId}`);

  // Simulate API calls to B Corp and Open Food Facts/Beauty Facts
  const bCorpData = await simulateBCorpAPI(productDetails.brand);
  const openFactsData = await simulateOpenFactsAPI(productDetails.name);

  // --- Eco-Score Calculation Logic (Refined Placeholder with API Data) ---
  let scoreValue = 0; // Higher value means better score

  // 1. Material Type / Ingredients (from Open Facts Data)
  if (openFactsData && openFactsData.ingredients) {
    if (openFactsData.ingredients.includes('organic')) scoreValue += 2;
    if (openFactsData.ingredients.includes('recycled')) scoreValue += 1.5;
    if (openFactsData.ingredients.includes('plastic') || openFactsData.ingredients.includes('synthetic')) scoreValue -= 1;
  } else if (productDetails.name) { // Fallback to product name if no Open Facts data
    if (productDetails.name.toLowerCase().includes('organic') || productDetails.name.toLowerCase().includes('recycled')) scoreValue += 2;
    if (productDetails.name.toLowerCase().includes('plastic') || productDetails.name.toLowerCase().includes('synthetic')) scoreValue -= 1;
  }

  // 2. Brand Certifications (from B Corp Data)
  if (bCorpData && bCorpData.isBCorp) {
    scoreValue += 3; // Significant boost for B Corp certification
  } else if (productDetails.brand && productDetails.brand.toLowerCase().includes('eco')) { // Fallback
    scoreValue += 1;
  }

  // 3. Price as a proxy for quality/durability (very rough, for demonstration)
  if (productDetails.price) {
    const priceNum = parseFloat(productDetails.price.replace(/[^0-9.-]+/g,""));
    if (!isNaN(priceNum) && priceNum > 50) {
      scoreValue += 0.5;
    }
  }

  // Map scoreValue to A-F
  let ecoScore = 'F';
  if (scoreValue >= 4) {
    ecoScore = 'A';
  } else if (scoreValue >= 2.5) {
    ecoScore = 'B';
  } else if (scoreValue >= 1) {
    ecoScore = 'C';
  } else if (scoreValue >= 0) {
    ecoScore = 'D';
  } else {
    ecoScore = 'F';
  }

  // --- Alternatives Suggestion Logic (Refined Placeholder) ---
  const alternatives = [];
  if (ecoScore === 'F' || ecoScore === 'D') {
    alternatives.push({ name: `Greener ${productDetails.name || 'Product'} (Eco-Score A)`, score: "A", link: "https://example.com/greener-alt-A" });
    alternatives.push({ name: `Sustainable ${productDetails.name || 'Item'} (Eco-Score B)`, score: "B", link: "https://example.com/greener-alt-B" });
  } else if (ecoScore === 'C') {
    alternatives.push({ name: `Better ${productDetails.name || 'Choice'} (Eco-Score A)`, score: "A", link: "https://example.com/better-alt-A" });
  }
  if (alternatives.length === 0) {
    alternatives.push({ name: "Explore Sustainable Options", score: "A", link: "https://example.com/sustainable-options" });
  }

  const result = {
    score: ecoScore,
    alternatives: alternatives
  };

  ecoScoreCache[productId] = result;
  return result;
}

// --- Simulated API Functions ---
async function simulateBCorpAPI(brandName) {
  console.log(`Simulating B Corp API call for brand: ${brandName}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  if (brandName && brandName.toLowerCase().includes('patagonia')) { // Example B Corp brand
    return { isBCorp: true, score: 90 };
  }
  return { isBCorp: false, score: null };
}

async function simulateOpenFactsAPI(productName) {
  console.log(`Simulating Open Food/Beauty Facts API call for product: ${productName}`);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
  if (productName && productName.toLowerCase().includes('organic')) {
    return { ingredients: ['organic cotton', 'natural dyes'], packaging: 'recycled cardboard' };
  }
  if (productName && productName.toLowerCase().includes('plastic bottle')) {
    return { ingredients: ['water', 'synthetic polymers'], packaging: 'plastic' };
  }
  return { ingredients: null, packaging: null };
}

// --- User Shopping Habit Tracking ---
let browsingStartTime = {}; // Tracks start time for each tab/domain
let shoppingStats = {
  totalBrowsingTime: 0, // in seconds
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

// --- Mindful Prompt Logic ---
const mindfulPrompts = [
  "Is this a need or a want?",
  "Do I have a place for this item in my home?",
  "How will this purchase impact the environment?",
  "Have you considered a more sustainable alternative?"
];

function triggerMindfulPrompt(tabId, triggerType) {
  let prompt = null;
  if (triggerType === "addToCart" && shoppingStats.addToCartFrequency % 3 === 0) { // Every 3rd item added
    prompt = mindfulPrompts[0]; // "Is this a need or a want?"
  } else if (triggerType === "browsingTime" && shoppingStats.totalBrowsingTime > 300 && shoppingStats.totalBrowsingTime % 300 < 60) { // Every 5 minutes of browsing
    prompt = mindfulPrompts[1]; // "Do I have a place for this item in my home?"
  }

  if (prompt) {
    chrome.tabs.sendMessage(tabId, { action: "displayPrompt", message: prompt });
    console.log(`Mindful prompt triggered for tab ${tabId}: "${prompt}"`);
  }
}


// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getEcoScore") {
    fetchEcoScore(request.productDetails).then(response => {
      sendResponse(response);
    });
    return true; // Indicates that sendResponse will be called asynchronously
  } else if (request.action === "updateCart") {
    shoppingStats.itemsInCart = request.itemsInCart;
    if (request.addedToCart) {
      shoppingStats.addToCartFrequency++;
      shoppingStats.lastAddToCartTime = Date.now();
      triggerMindfulPrompt(sender.tab.id, "addToCart");
    }
    saveShoppingStats();
  } else if (request.action === "startBrowsing") {
    browsingStartTime[sender.tab.id] = Date.now();
    console.log(`Browsing started on tab ${sender.tab.id}`);
  } else if (request.action === "stopBrowsing") {
    const startTime = browsingStartTime[sender.tab.id];
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000; // in seconds
      shoppingStats.totalBrowsingTime += duration;
      delete browsingStartTime[sender.tab.id];
      saveShoppingStats();
      console.log(`Browsing stopped on tab ${sender.tab.id}. Duration: ${duration}s`);
      triggerMindfulPrompt(sender.tab.id, "browsingTime");
    }
  } else if (request.action === "getShoppingStats") {
    sendResponse(shoppingStats);
  }
});

// Handle tab activation to track browsing time accurately
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Stop tracking for the previously active tab
  for (const tabId in browsingStartTime) {
    if (parseInt(tabId) !== activeInfo.tabId) {
      const startTime = browsingStartTime[tabId];
      if (startTime) {
        const duration = (Date.now() - startTime) / 1000;
        shoppingStats.totalBrowsingTime += duration;
        delete browsingStartTime[tabId];
        saveShoppingStats();
        console.log(`Browsing stopped on tab ${tabId} due to switch. Duration: ${duration}s`);
      }
    }
  }
  // Start tracking for the newly active tab if it's a shopping site
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && (tab.url.includes("amazon.com") || tab.url.includes("target.com"))) {
      browsingStartTime[activeInfo.tabId] = Date.now();
      console.log(`Browsing started on tab ${activeInfo.tabId} (activated)`);
    }
  });
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (browsingStartTime[tabId]) {
    const startTime = browsingStartTime[tabId];
    const duration = (Date.now() - startTime) / 1000;
    shoppingStats.totalBrowsingTime += duration;
    delete browsingStartTime[tabId];
    saveShoppingStats();
    console.log(`Browsing stopped on tab ${tabId} (removed). Duration: ${duration}s`);
  }
});