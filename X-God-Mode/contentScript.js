(function() {
  'use strict';

  // Known partials for "like" vs "retweet" detection
  const LIKE_SVG_PATH_D = "M20.884 13.19c-1.351 2.48"; 
  const RETWEET_SVG_PATH_D = "M4.75 3.79l4.603 4.3-1.706 1.82";

  let barContainer = null;
  let mutationObserver = null;

  // Poll the route every 800ms 
  setInterval(() => {
    const path = window.location.pathname;
    if (path === "/notifications") {
      // If bar is missing, inject
      if (!barContainer || !document.contains(barContainer)) {
        waitForPrimaryColumn().then((col) => {
          injectBar(col);

          // If observer not set, create it
          if (!mutationObserver) {
            mutationObserver = new MutationObserver(() => {
              markNotifications();
              updateVisibility();
            });
          }
          mutationObserver.observe(col, { childList: true, subtree: true });

          // Initial pass
          markNotifications();
          restoreTogglesFromStorage(); // load toggles, then updateVisibility
        });
      } else {
        // bar is present. Possibly new notifications arrived
        markNotifications();
        updateVisibility();
      }
    } else {
      // Not /notifications: remove bar + observer if present
      if (barContainer && document.contains(barContainer)) {
        removeBarAndObserver();
      }
    }
  }, 800);

  // --------------------- 
  // 1) Insert Bar 
  // ---------------------
  function injectBar(primaryColumn) {
    barContainer = document.createElement('div');
    barContainer.id = 'my-tweaks-bar';
    barContainer.style.display = 'flex';
    barContainer.style.flexDirection = 'row';
    barContainer.style.alignItems = 'center';
    barContainer.style.padding = '10px';
    barContainer.style.backgroundColor = '#eee';
    barContainer.style.marginBottom = '10px';
    barContainer.style.border = '1px solid #ccc';
    barContainer.style.borderRadius = '4px';

    // "Hide Likes"
    const hideLikesLabel = document.createElement('label');
    hideLikesLabel.style.marginRight = '20px';
    const hideLikesCheckbox = document.createElement('input');
    hideLikesCheckbox.type = 'checkbox';
    hideLikesCheckbox.id = 'tweaks-hide-likes';
    hideLikesLabel.appendChild(hideLikesCheckbox);
    hideLikesLabel.appendChild(document.createTextNode('Hide Likes'));

    // "Hide Retweets"
    const hideRetweetsLabel = document.createElement('label');
    hideRetweetsLabel.style.marginRight = '20px';
    const hideRetweetsCheckbox = document.createElement('input');
    hideRetweetsCheckbox.type = 'checkbox';
    hideRetweetsCheckbox.id = 'tweaks-hide-retweets';
    hideRetweetsLabel.appendChild(hideRetweetsCheckbox);
    hideRetweetsLabel.appendChild(document.createTextNode('Hide Retweets'));

    barContainer.appendChild(hideLikesLabel);
    barContainer.appendChild(hideRetweetsLabel);

    primaryColumn.insertBefore(barContainer, primaryColumn.firstChild);

    // Attach listeners
    hideLikesCheckbox.addEventListener('change', onToggleChanged);
    hideRetweetsCheckbox.addEventListener('change', onToggleChanged);
  }

  // remove bar + observer
  function removeBarAndObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (barContainer && document.contains(barContainer)) {
      barContainer.remove();
    }
    barContainer = null;
  }

  // ---------------------
  // 2) Mark notifications as "like" or "retweet"
  // ---------------------
  function markNotifications() {
    const articles = document.querySelectorAll('article[data-testid="notification"]');
    articles.forEach((article) => {
      if (article.dataset.likeOrRetweetChecked === "true") return;

      const pathEls = article.querySelectorAll('path[d]');
      let isLike = false;
      let isRetweet = false;

      pathEls.forEach((p) => {
        const dVal = p.getAttribute('d') || "";
        if (dVal.startsWith(LIKE_SVG_PATH_D)) {
          isLike = true;
        }
        if (dVal.startsWith(RETWEET_SVG_PATH_D)) {
          isRetweet = true;
        }
      });

      if (isLike) {
        article.dataset.isLikeNotification = "true";
      }
      if (isRetweet) {
        article.dataset.isRetweetNotification = "true";
      }
      article.dataset.likeOrRetweetChecked = "true";
    });
  }

  // ---------------------
  // 3) Hide or show notifications 
  // ---------------------
  function updateVisibility() {
    const hideLikes = document.getElementById('tweaks-hide-likes')?.checked;
    const hideRetweets = document.getElementById('tweaks-hide-retweets')?.checked;

    const articles = document.querySelectorAll('article[data-testid="notification"]');
    articles.forEach((article) => {
      const isLike = (article.dataset.isLikeNotification === "true");
      const isRetweet = (article.dataset.isRetweetNotification === "true");

      let shouldHide = false;
      if (hideLikes && isLike) shouldHide = true;
      if (hideRetweets && isRetweet) shouldHide = true;

      article.style.display = shouldHide ? "none" : "";
    });
  }

  // ---------------------
  // 4) Storage logic (Local) 
  // ---------------------
  function onToggleChanged() {
    const hideLikes = document.getElementById('tweaks-hide-likes')?.checked || false;
    const hideRetweets = document.getElementById('tweaks-hide-retweets')?.checked || false;

    // Save to chrome.storage.local
    chrome.storage.local.set({
      'hideLikes': hideLikes,
      'hideRetweets': hideRetweets
    }, () => {
      // after saving, re-check
      updateVisibility();
    });
  }

  function restoreTogglesFromStorage() {
    chrome.storage.local.get(['hideLikes', 'hideRetweets'], (result) => {
      const hideLikesVal = !!result.hideLikes;
      const hideRetweetsVal = !!result.hideRetweets;

      const hideLikesCheckbox = document.getElementById('tweaks-hide-likes');
      const hideRetweetsCheckbox = document.getElementById('tweaks-hide-retweets');
      if (hideLikesCheckbox) {
        hideLikesCheckbox.checked = hideLikesVal;
      }
      if (hideRetweetsCheckbox) {
        hideRetweetsCheckbox.checked = hideRetweetsVal;
      }

      updateVisibility();
    });
  }

  // ---------------------
  // 5) Wait for primaryColumn
  // ---------------------
  function waitForPrimaryColumn() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const col = document.querySelector('div[data-testid="primaryColumn"]');
        if (col) {
          clearInterval(checkInterval);
          resolve(col);
        }
      }, 250);
    });
  }

})();
