(function() {
  'use strict';

  // SVG partials for identifying 'like' or 'retweet' icons
  const LIKE_SVG_PATH_D = "M20.884 13.19c-1.351 2.48-4.001 5.12";
  const RETWEET_SVG_PATH_D = "M4.75 3.79l4.603 4.3-1.706 1.82";

  function markNotifications() {
    const articles = document.querySelectorAll('article[data-testid="notification"]');
    articles.forEach((article) => {
      // if we've already flagged it, skip
      if (article.dataset.likeOrRetweetChecked === "true") return;

      // find any path elements inside
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

  function updateVisibility() {
    const hideLikesChecked = document.getElementById('tweaks-hide-likes')?.checked;
    const hideRetweetsChecked = document.getElementById('tweaks-hide-retweets')?.checked;

    const articles = document.querySelectorAll('article[data-testid="notification"]');
    articles.forEach((article) => {
      const isLike = (article.dataset.isLikeNotification === "true");
      const isRetweet = (article.dataset.isRetweetNotification === "true");

      let shouldHide = false;
      if (hideLikesChecked && isLike) shouldHide = true;
      if (hideRetweetsChecked && isRetweet) shouldHide = true;

      article.style.display = shouldHide ? "none" : "";
    });
  }

  function waitForPrimaryColumn() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const col = document.querySelector('div[data-testid="primaryColumn"]');
        if (col) {
          clearInterval(checkInterval);
          resolve(col);
        }
      }, 500);
    });
  }

  waitForPrimaryColumn().then((primaryColumn) => {
    // 1) create top bar
    const barContainer = document.createElement('div');
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
    const hideLikesText = document.createTextNode('Hide Likes');
    hideLikesLabel.appendChild(hideLikesCheckbox);
    hideLikesLabel.appendChild(hideLikesText);

    // "Hide Retweets"
    const hideRetweetsLabel = document.createElement('label');
    const hideRetweetsCheckbox = document.createElement('input');
    hideRetweetsCheckbox.type = 'checkbox';
    hideRetweetsCheckbox.id = 'tweaks-hide-retweets';
    const hideRetweetsText = document.createTextNode('Hide Retweets');
    hideRetweetsLabel.style.marginRight = '20px';
    hideRetweetsLabel.appendChild(hideRetweetsCheckbox);
    hideRetweetsLabel.appendChild(hideRetweetsText);

    barContainer.appendChild(hideLikesLabel);
    barContainer.appendChild(hideRetweetsLabel);

    // Insert bar
    primaryColumn.insertBefore(barContainer, primaryColumn.firstChild);

    // Add event listeners to checkboxes
    hideLikesCheckbox.addEventListener('change', updateVisibility);
    hideRetweetsCheckbox.addEventListener('change', updateVisibility);

    // 2) Use MutationObserver on the primary column
    //    so that as soon as notifications appear/disappear,
    //    we re-check them.
    const observer = new MutationObserver(() => {
      markNotifications();
      updateVisibility();
    });
    observer.observe(primaryColumn, { childList: true, subtree: true });

    // Initial pass
    markNotifications();
    updateVisibility();
  });
})();
