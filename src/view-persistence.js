(() => {
  const STORAGE_KEY = 'ahoy_current_view';

  const views = {
    deck: { button: 'deckNavButton', view: 'deckView' },
    notes: { button: 'notesNavButton', view: 'notesView' },
    tallies: { button: 'talliesNavButton', view: 'talliesView' },
    crew: { button: 'crewNavButton', view: 'crewView' },
    profile: { button: 'profileNavButton', view: 'profileView' },
    admin: { button: 'adminNavButton', view: 'adminView' }
  };

  let restoring = false;
  let restoreTimer = null;

  function getSavedView() {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return views[saved] ? saved : 'deck';
  }

  function saveView(view) {
    if (views[view]) sessionStorage.setItem(STORAGE_KEY, view);
  }

  function visible(element) {
    return element && !element.classList.contains('hidden');
  }

  function appIsOpen() {
    return visible(document.getElementById('appPage'));
  }

  function currentVisibleView() {
    for (const [name, config] of Object.entries(views)) {
      if (visible(document.getElementById(config.view))) return name;
    }
    return null;
  }

  function restoreSavedView() {
    if (restoring || !appIsOpen()) return;

    const saved = getSavedView();
    const config = views[saved];
    const button = document.getElementById(config.button);

    if (!button || button.classList.contains('hidden')) {
      if (saved === 'admin') saveView('deck');
      return;
    }

    if (currentVisibleView() === saved) return;

    restoring = true;
    button.click();

    window.setTimeout(() => {
      restoring = false;
    }, 150);
  }

  function scheduleRestore(delay = 40) {
    window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(restoreSavedView, delay);
  }

  function bindNavigation() {
    for (const [name, config] of Object.entries(views)) {
      const button = document.getElementById(config.button);
      if (!button) continue;

      button.addEventListener('click', () => {
        if (!restoring) saveView(name);
      }, true);
    }

    const brand = document.getElementById('deckBrandButton');
    if (brand) {
      brand.addEventListener('click', () => {
        if (!restoring) saveView('deck');
      }, true);
    }

    const logout = document.getElementById('logoutButton');
    if (logout) {
      logout.addEventListener('click', () => {
        sessionStorage.removeItem(STORAGE_KEY);
      }, true);
    }
  }

  function observeAppChanges() {
    const appPage = document.getElementById('appPage');
    if (!appPage) return;

    const observer = new MutationObserver(() => {
      if (!appIsOpen() || restoring) return;

      const visibleView = currentVisibleView();
      const savedView = getSavedView();

      if (visibleView === 'deck' && savedView !== 'deck') {
        scheduleRestore();
      }
    });

    observer.observe(appPage, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }

  function initializeViewPersistence() {
    bindNavigation();
    observeAppChanges();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) scheduleRestore(75);
    });

    window.addEventListener('focus', () => scheduleRestore(75));
    window.addEventListener('pageshow', () => scheduleRestore(100));

    scheduleRestore(150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeViewPersistence);
  } else {
    initializeViewPersistence();
  }
})();
