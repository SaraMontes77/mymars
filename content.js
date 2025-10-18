// mindful-market-extension/content.js

// This script will be injected into Amazon and Target pages.
// It will:
// 1. Extract product information
// 2. Send product information to the background script to get eco-scores and alternatives
// 3. Inject eco-score badges and alternative suggestions into the page
// 4. Monitor user actions (add to cart, browsing time) and send to background script
// 5. Display mindful shopping prompts from the background script

console.log("Mindful Market content script loaded.");

// --- Helper Functions ---
function getProductDetails() {
  const url = window.location.href;
  let productId = "unknown";
  let productName = document.title;
  let productImage = null;
  let productPrice = null;
  let brandName = null;
  let material = null; // New data point
  let packaging = null; // New data point
  let description = null; // To help find material/packaging

  // Helper to search for keywords in text content
  const searchKeywords = (text, keywords) => keywords.find(kw => text.toLowerCase().includes(kw));

  if (url.includes("amazon.com")) {
    const idMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    if (idMatch) productId = idMatch[1];

    const titleElement = document.getElementById('productTitle');
    if (titleElement) productName = titleElement.textContent.trim();

    const imageElement = document.getElementById('landingImage');
    if (imageElement) productImage = imageElement.getAttribute('src');

    const priceElement = document.querySelector('.a-price .a-offscreen');
    if (priceElement) productPrice = priceElement.textContent.trim();

    const brandElement = document.getElementById('bylineInfo') || document.getElementById('brand');
    if (brandElement) brandName = brandElement.textContent.trim().replace(/^Visit the\s+/, '').replace(/\s+Store$/, '');

    const descriptionElement = document.getElementById('productDescription') || document.getElementById('feature-bullets');
    if (descriptionElement) {
      description = descriptionElement.textContent.trim();
      // Attempt to extract material and packaging from description
      material = searchKeywords(description, ['cotton', 'polyester', 'wool', 'recycled', 'organic', 'plastic', 'metal', 'glass']);
      packaging = searchKeywords(description, ['cardboard', 'plastic packaging', 'recycled packaging', 'biodegradable packaging']);
    }

  } else if (url.includes("target.com")) {
    const idMatch = url.match(/\/p\/[^\/]+\/A-(\d+)/);
    if (idMatch) productId = idMatch[1];

    const titleElement = document.querySelector('h1[data-test="product-title"]');
    if (titleElement) productName = titleElement.textContent.trim();

    const imageElement = document.querySelector('img[data-test="product-image"]');
    if (imageElement) productImage = imageElement.getAttribute('src');

    const priceElement = document.querySelector('[data-test="product-price"] span');
    if (priceElement) productPrice = priceElement.textContent.trim();

    const brandElement = document.querySelector('[data-test="product-brand"] a');
    if (brandElement) brandName = brandElement.textContent.trim();

    const descriptionElement = document.querySelector('[data-test="product-details-description"]');
    if (descriptionElement) {
      description = descriptionElement.textContent.trim();
      // Attempt to extract material and packaging from description
      material = searchKeywords(description, ['cotton', 'polyester', 'wool', 'recycled', 'organic', 'plastic', 'metal', 'glass']);
      packaging = searchKeywords(description, ['cardboard', 'plastic packaging', 'recycled packaging', 'biodegradable packaging']);
    }
  }

  return {
    id: productId,
    name: productName,
    url: url,
    image: productImage,
    price: productPrice,
    brand: brandName,
    material: material,
    packaging: packaging,
    description: description // Include full description for background script analysis
  };
}

function injectEcoScoreUI(productDetails, ecoScoreData) {
  // Placeholder for injecting UI.
  // In a real scenario, this would involve creating and appending DOM elements.
  console.log(`Injecting eco-score ${ecoScoreData.score} for ${productDetails.name}`);
  console.log("Alternatives:", ecoScoreData.alternatives);

  // Example: Create a simple div to display the score
  const scoreDiv = document.createElement('div');
  scoreDiv.className = 'mindful-market-eco-score';
  scoreDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 5px; z-index: 10000;';
  scoreDiv.innerHTML = `Eco-Score: <b>${ecoScoreData.score}</b>`;
  document.body.appendChild(scoreDiv);

  // Example: Display alternatives (can be more sophisticated)
  const altDiv = document.createElement('div');
  altDiv.className = 'mindful-market-alternatives';
  altDiv.style.cssText = 'position: fixed; top: 50px; right: 10px; background: #f0f0f0; border: 1px solid #ccc; padding: 10px; border-radius: 5px; z-index: 10000; max-width: 300px;';
  altDiv.innerHTML = '<b>Greener Alternatives:</b><br>';
  ecoScoreData.alternatives.forEach(alt => {
    altDiv.innerHTML += `<a href="${alt.link}" target="_blank">${alt.name} (${alt.score})</a><br>`;
  });
  document.body.appendChild(altDiv);
}

function monitorAddToCart() {
  // This is a highly simplified placeholder.
  // Real implementation would require observing DOM changes or
  // intercepting network requests for "add to cart" actions.
  document.addEventListener('click', (event) => {
    const target = event.target;
    // Look for common "add to cart" button texts or classes
    if (target.matches('[id*="add-to-cart"]') || target.matches('[name*="addToCart"]') || target.textContent.toLowerCase().includes('add to cart')) {
      console.log("Add to cart button clicked!");
      // Send message to background script
      chrome.runtime.sendMessage({ action: "updateCart", itemsInCart: 1, addedToCart: true }); // Assuming 1 item added
    }
  });
}

function trackBrowsingTime() {
  // Send message to background script when content script starts
  chrome.runtime.sendMessage({ action: "startBrowsing" });

  // Listen for page unload to stop tracking
  window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ action: "stopBrowsing" });
  });
}

function displayMindfulPrompt(message) {
  const promptDiv = document.createElement('div');
  promptDiv.className = 'mindful-market-prompt';
  promptDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffeb3b;
    color: #333;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 10001;
    font-size: 1.1em;
    text-align: center;
    max-width: 80%;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  `;
  promptDiv.innerHTML = `<b>Mindful Market:</b><br>${message}<br><small>(Click to dismiss)</small>`;
  document.body.appendChild(promptDiv);

  // Animate in
  setTimeout(() => {
    promptDiv.style.opacity = '1';
  }, 100);

  // Dismiss on click
  promptDiv.addEventListener('click', () => {
    promptDiv.style.opacity = '0';
    setTimeout(() => promptDiv.remove(), 500);
  });

  // Auto-dismiss after a few seconds
  setTimeout(() => {
    if (promptDiv.parentNode) { // Check if it hasn't been dismissed already
      promptDiv.style.opacity = '0';
      setTimeout(() => promptDiv.remove(), 500);
    }
  }, 15000); // 15 seconds
}

// --- Persistent Shopping Stats Display ---
function createShoppingStatsDisplay() {
  const statsDisplayDiv = document.createElement('div');
  statsDisplayDiv.id = 'mindful-market-stats-display';
  statsDisplayDiv.className = 'mindful-market-stats-display';
  statsDisplayDiv.innerHTML = `
    <p><strong>Browsing:</strong> <span id="mm-browsing-time">0s</span></p>
    <p><strong>Cart:</strong> <span id="mm-items-in-cart">0</span></p>
    <p><strong>Added:</strong> <span id="mm-add-to-cart-freq">0</span></p>
  `;
  document.body.appendChild(statsDisplayDiv);
  return statsDisplayDiv;
}

function updateShoppingStatsDisplay(stats) {
  const browsingTimeSpan = document.getElementById('mm-browsing-time');
  const itemsInCartSpan = document.getElementById('mm-items-in-cart');
  const addToCartFreqSpan = document.getElementById('mm-add-to-cart-freq');

  if (browsingTimeSpan) browsingTimeSpan.textContent = formatTime(stats.totalBrowsingTime);
  if (itemsInCartSpan) itemsInCartSpan.textContent = stats.itemsInCart;
  if (addToCartFreqSpan) addToCartFreqSpan.textContent = stats.addToCartFrequency;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
}

// --- Main Execution ---
// --- Main Execution ---
const productDetails = getProductDetails();
if (productDetails.id !== "unknown") {
  chrome.runtime.sendMessage({ action: "getEcoScore", productDetails: productDetails }, (response) => {
    if (response) {
      injectEcoScoreUI(productDetails, response);
    }
  });
}

monitorAddToCart();
trackBrowsingTime();

// Create and update persistent stats display
let statsDisplay = document.getElementById('mindful-market-stats-display');
if (!statsDisplay) {
  statsDisplay = createShoppingStatsDisplay();
  console.log("Persistent stats display created.");
} else {
  console.log("Persistent stats display already exists.");
}

// Initial update
chrome.runtime.sendMessage({ action: "getShoppingStats" }, (response) => {
  if (response) {
    updateShoppingStatsDisplay(response);
    console.log("Initial persistent stats display updated:", response);
  }
});

// Update every second
setInterval(() => {
  chrome.runtime.sendMessage({ action: "getShoppingStats" }, (response) => {
    if (response) {
      updateShoppingStatsDisplay(response);
      // console.log("Persistent stats display updated:", response); // Log less frequently to avoid spam
    }
  });
}, 1000);

// Listen for prompts from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "displayPrompt") {
    displayMindfulPrompt(request.message);
  }
});