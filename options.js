// mindful-market-extension/options.js

document.addEventListener('DOMContentLoaded', () => {
  const resetStatsButtonOptions = document.getElementById('resetStatsOptions');

  resetStatsButtonOptions.addEventListener('click', () => {
    chrome.storage.local.set({
      shoppingStats: {
        totalBrowsingTime: 0,
        itemsInCart: 0,
        addToCartFrequency: 0,
        lastAddToCartTime: null
      }
    }, () => {
      alert("All shopping statistics have been reset!");
      console.log("All shopping statistics reset from options page.");
    });
  });
});