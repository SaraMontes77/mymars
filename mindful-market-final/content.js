// mindful-market-extension/content.js

// This script will be injected into Amazon and Target pages.
// It will:
// 1. Extract product information
// 2. Send product information to the background script
// 3. Monitor user actions (add to cart, browsing time) and send to background script
// 4. Display mindful shopping prompts from the background script
// 5. Inject and manage a persistent floating popup with real-time stats and nudges

console.log("Mindful Market content script loaded.");

// --- Helper Functions ---


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

let pageStartTime = Date.now(); // Start time for current browsing session on this page
let thirtyMinuteNudgeDisplayed = false;
let fifteenMinuteNudgeDisplayed = false; // Initialize here

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
}

// --- Persistent Floating Popup ---
function createFloatingPopup() {
  const popupDiv = document.createElement('div');
  popupDiv.id = 'mindful-market-floating-popup';
  popupDiv.className = 'mindful-market-popup';
  popupDiv.innerHTML = `
    <div class="popup-header">
      <span class="popup-title">Mindful Market</span>
      <button class="dismiss-button">X</button>
    </div>
    <div class="popup-content">
      <div class="stat-item">
        <span class="stat-label">Browsing Time:</span>
        <span id="mm-popup-browsing-time" class="stat-value">0s</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Items in Cart:</span>
        <span id="mm-popup-items-in-cart" class="stat-value">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Items Added:</span>
        <span id="mm-popup-add-to-cart-freq" class="stat-value">0</span>
      </div>
      <div id="mm-popup-message" class="dynamic-message">
        <!-- Dynamic messages will appear here -->
      </div>
      <div class="visual-cue-container">
        <div id="mm-popup-time-progress" class="progress-bar"></div>
      </div>
    </div>
  `;
  document.body.appendChild(popupDiv);

  // Dismiss functionality
  popupDiv.querySelector('.dismiss-button').addEventListener('click', () => {
    popupDiv.style.display = 'none';
  });

  return popupDiv;
}

function updateFloatingPopup(stats) {
  const popup = document.getElementById('mindful-market-floating-popup');
  if (!popup) return;

  const browsingTimeSpan = document.getElementById('mm-popup-browsing-time');
  const itemsInCartSpan = document.getElementById('mm-popup-items-in-cart');
  const addToCartFreqSpan = document.getElementById('mm-popup-add-to-cart-freq');
  const messageDiv = document.getElementById('mm-popup-message');
  const progressBar = document.getElementById('mm-popup-time-progress');

  if (browsingTimeSpan) browsingTimeSpan.textContent = formatTime(stats.totalBrowsingTime);
  if (itemsInCartSpan) itemsInCartSpan.textContent = stats.itemsInCart;
  if (addToCartFreqSpan) addToCartFreqSpan.textContent = stats.addToCartFrequency;

  // Dynamic messages and visual cues
  let message = "";
  let popupColorClass = "";
  let progressBarColorClass = "";
  let progressBarWidth = 0;

  // Time-based nudges and visual cues
  const timeSpentMinutes = stats.totalBrowsingTime / 60;
  if (timeSpentMinutes >= 30) {
    message = "You’ve been browsing for 30 minutes. Want to take a mindful break?";
    popupColorClass = "red";
    progressBarColorClass = "red";
    progressBarWidth = 100; // Maxed out
  } else if (timeSpentMinutes >= 15) {
    message = "What are you really looking for today?";
    popupColorClass = "yellow";
    progressBarColorClass = "yellow";
    progressBarWidth = (timeSpentMinutes / 30) * 100;
  } else {
    message = "Happy mindful shopping!";
    popupColorClass = ""; // Default
    progressBarColorClass = ""; // Default
    progressBarWidth = (timeSpentMinutes / 30) * 100;
  }

  // Cart-based nudges (example)
  if (stats.addToCartFrequency > 5) {
    message = "You’ve been adding a lot of items—consider reviewing your cart.";
    popupColorClass = "yellow"; // Override or combine with time-based
  }

  messageDiv.textContent = message;

  // Apply color classes
  popup.classList.remove("yellow", "red");
  if (popupColorClass) popup.classList.add(popupColorClass);

  progressBar.classList.remove("yellow", "red");
  if (progressBarColorClass) progressBar.classList.add(progressBarColorClass);
  progressBar.style.width = `${progressBarWidth}%`;
}


// --- Main Execution ---
monitorAddToCart();

// Create and update persistent floating popup
let floatingPopup = document.getElementById('mindful-market-floating-popup');
if (!floatingPopup) {
  floatingPopup = createFloatingPopup();
  console.log("Persistent floating popup created.");
} else {
  console.log("Persistent floating popup already exists.");
}

// Initial update and then update every second
setInterval(() => {
  chrome.runtime.sendMessage({ action: "getShoppingStats" }, (response) => {
    if (response) {
      updateFloatingPopup(response);
    }
  });
}, 1000);

// Listen for prompts from the background script (still useful for other types of prompts)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "displayPrompt") {
    // The displayMindfulPrompt function is no longer used for time-based nudges,
    // but can be kept for other types of prompts if needed from background.js
    // For now, we'll just log it.
    console.log("Received prompt from background script:", request.message);
  }
});