/** Негатив живёт в текущей вкладке до перезагрузки страницы. */
(function () {
  const STORAGE_KEY = 'vn_negative_filter';
  const root = document.documentElement;
  let enabled = false;

  function apply() {
    root.classList.toggle('game-negative', enabled);
  }

  function restore() {
    try {
      enabled = sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (error) { /* Без хранилища фильтр работает до смены страницы. */ }
    apply();
  }

  // Финал — отдельная HTML-страница. Обычные переходы сохраняют эффект,
  // а кнопка обновления браузера сбрасывает его на любой странице игры.
  if (window.performance?.getEntriesByType?.('navigation')?.[0]?.type === 'reload') {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) { /* Хранилище недоступно. */ }
  }
  restore();
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) restore();
  });

  window.VN.systems.NegativeFilter = {
    toggle() {
      enabled = !enabled;
      apply();
      try {
        if (enabled) sessionStorage.setItem(STORAGE_KEY, '1');
        else sessionStorage.removeItem(STORAGE_KEY);
      } catch (error) { /* Переключение не зависит от доступности хранилища. */ }
    },
  };
})();
