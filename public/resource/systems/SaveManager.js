/**
 * SaveManager —  работа с localStorage.
 * Ничего не знает про сюжет игры, просто умеет прочитать/записать/
 * стереть один JSON-объект под фиксированным ключом.
 */
(function () {
  const STORAGE_KEY = 'vn_save_v1';

  // Сколько прогресс может "жить" без активности игрока
  const MAX_INACTIVITY_MS = 1 * 60 * 1000; // 30 минут

  function defaultState() {
    return {
      version: 1,

      // Где сейчас находится игрок
      storySceneIndex: 0,
      screenIndex: 0,
      status: 'menu', // 'menu' | 'story' | 'minigame'

      // Метка времени (Date.now()) последнего сохранения/активности игрока.
      // По ней определяем, не истекли ли отведённые на сохранение 30 минут.
      lastActiveAt: Date.now(),

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
    /** Просрочено ли сохранение: прошло ли больше 30 минут с lastActiveAt. */
    isExpired: function (state) {
      if (!state || !state.lastActiveAt) return false;
      return Date.now() - state.lastActiveAt > MAX_INACTIVITY_MS;
    },

    load: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);

        // Если с последнего сохранения прошло больше 30 минут начинаем игру заново.
        if (this.isExpired(parsed)) {
          this.clear();
          return defaultState();
        }

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
        // Каждое сохранение — это и есть "момент активности"
        
        state.lastActiveAt = Date.now();
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
