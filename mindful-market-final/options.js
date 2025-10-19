// mindful-market-extension/options.js

document.addEventListener('DOMContentLoaded', () => {
  const enablePopupCheckbox = document.getElementById('enablePopup');
  const popupPositionSelect = document.getElementById('popupPosition');
  const nudgeThreshold1Input = document.getElementById('nudgeThreshold1');
  const nudgeThreshold2Input = document.getElementById('nudgeThreshold2');
  const customQuotesTextarea = document.getElementById('customQuotes');
  const saveOptionsButton = document.getElementById('saveOptions');
  const resetStatsButtonOptions = document.getElementById('resetStatsOptions');

  // Load options
  function loadOptions() {
    chrome.storage.sync.get(['mindfulMarketOptions'], (data) => {
      const options = data.mindfulMarketOptions || {};
      enablePopupCheckbox.checked = options.enablePopup !== false; // Default to true
      popupPositionSelect.value = options.popupPosition || 'bottom-right';
      nudgeThreshold1Input.value = options.nudgeThreshold1 || 15;
      nudgeThreshold2Input.value = options.nudgeThreshold2 || 30;
      customQuotesTextarea.value = options.customQuotes ? options.customQuotes.join('\n') : '';
    });
  }

  // Save options
  saveOptionsButton.addEventListener('click', () => {
    const customQuotes = customQuotesTextarea.value.split('\n').map(q => q.trim()).filter(q => q.length > 0);
    const options = {
      enablePopup: enablePopupCheckbox.checked,
      popupPosition: popupPositionSelect.value,
      nudgeThreshold1: parseInt(nudgeThreshold1Input.value),
      nudgeThreshold2: parseInt(nudgeThreshold2Input.value),
      customQuotes: customQuotes
    };
    chrome.storage.sync.set({ mindfulMarketOptions: options }, () => {
      alert("Options saved!");
      console.log("Mindful Market options saved:", options);
    });
  });

  // Reset statistics
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

  loadOptions();
});