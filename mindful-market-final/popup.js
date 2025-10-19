// mindful-market-extension/popup.js

document.addEventListener('DOMContentLoaded', () => {
  const totalBrowsingTimeSpan = document.getElementById('totalBrowsingTime');
  const itemsInCartSpan = document.getElementById('itemsInCart');
  const addToCartFrequencySpan = document.getElementById('addToCartFrequency');
  const resetStatsButton = document.getElementById('resetStats');

  function updatePopupStats() {
    chrome.storage.local.get(['shoppingStats'], (data) => {
      const stats = data.shoppingStats || { totalBrowsingTime: 0, itemsInCart: 0, addToCartFrequency: 0 };
      totalBrowsingTimeSpan.textContent = formatTime(stats.totalBrowsingTime);
      itemsInCartSpan.textContent = stats.itemsInCart;
      addToCartFrequencySpan.textContent = stats.addToCartFrequency;
    });
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  }

  resetStatsButton.addEventListener('click', () => {
    chrome.storage.local.set({
      shoppingStats: {
        totalBrowsingTime: 0,
        itemsInCart: 0,
        addToCartFrequency: 0,
        lastAddToCartTime: null
      }
    }, () => {
      updatePopupStats();
      console.log("Shopping statistics reset.");
    });
  });

  // Update stats when popup is opened and every second
  updatePopupStats();
  setInterval(updatePopupStats, 1000);
});