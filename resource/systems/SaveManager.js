/**
 * SaveManager —  работа с localStorage.
 * Ничего не знает про сюжет игры, просто умеет прочитать/записать/
 * стереть один JSON-объект под фиксированным ключом.
 */
(function () {
  const STORAGE_KEY = 'vn_save_v1';

  function defaultState() {
    return {
      version: 1,

      // Где сейчас находится игрок
      storySceneIndex: 0,
      screenIndex: 0,
      status: 'menu', // 'menu' | 'story' | 'minigame'

      // Лог истории реплик: [{ storySceneIndex, screenIndex, text }]
      history: [],
      // Ключи вида "sceneIndex_screenIndex" — чтобы не дублировать
      // реплики в истории при повторном просмотре экрана (Back/Next).
      visitedScreens: [],

      // Пройденные мини-игры (произвольные строковые id)
      completedMinigames: [],

      // Настройки — сюда можно добавлять новые поля, не боясь
      // сломать старые сохранения (см. load() ниже).
      settings: {
        musicVolume: 1,
        sfxVolume: 1,
        textSpeed: 'normal',
      },
    };
  }

  const SaveManager = {
    load: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        // Мёржим с дефолтом, чтобы старые сохранения не ломались
        // при добавлении новых полей в будущем.
        return Object.assign(defaultState(), parsed);
      } catch (err) {
        console.warn('[SaveManager] Не удалось прочитать сохранение, начинаем заново:', err);
        return defaultState();
      }
    },

    save: function (state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.warn('[SaveManager] Не удалось сохранить прогресс:', err);
      }
    },

    clear: function () {
      localStorage.removeItem(STORAGE_KEY);
    },
  };

  window.VN.systems.SaveManager = SaveManager;
})();
