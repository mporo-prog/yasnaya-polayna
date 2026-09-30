/**
 * прогресс игрока
 *
 * Подключать после SaveManager.js.
 */
(function () {
  const SaveManager = window.VN.systems.SaveManager;

  const GameState = {
    state: SaveManager.load(),

    save: function () {
      SaveManager.save(this.state);
    },

    /** Запомнить, что игрок на главном экране (меню). */
    markAtMenu: function () {
      if (this.state.status !== 'menu') this.state.resumeStatus = this.state.status;
      this.state.status = 'menu';
      this.save();
    },

    /** Одна точка выбора продолжения для загрузки страницы, меню и предзагрузки. */
    getResumeTarget: function () {
      const s = this.state;
      const storySceneIndex = s.storySceneIndex;
      const status = s.status === 'menu' ? s.resumeStatus : s.status;
      if (status === 'minigame') {
        return {
          key: window.VN.data.storyMinigameLinks[storySceneIndex] || 'PlaceholderMinigameScene',
          data: {
            storySceneIndex: storySceneIndex,
            minigameId: 'story_' + (storySceneIndex + 1) + '_minigame',
          },
        };
      }
      return { key: 'StoryScene', data: { storySceneIndex: storySceneIndex, screenIndex: s.screenIndex } };
    },

    resume: function (scene) {
      this.checkExpiration();
      const target = this.getResumeTarget();
      // Записываем переход до загрузки ресурсов, в том числе при продолжении из меню.
      this.state.status = target.key === 'StoryScene' ? 'story' : 'minigame';
      this.save();
      scene.scene.start(target.key, target.data);
    },

    /** Запомнить, на каком экране какой сюжетной сцены сейчас игрок. */
    goToScreen: function (storySceneIndex, screenIndex) {
      this.state.storySceneIndex = storySceneIndex;
      this.state.screenIndex = screenIndex;
      this.state.status = 'story';
      this.save();
    },
    getFullHistory: function () {
      return this.state.history.slice();
    },
    
    /** Пометить, что игрок сейчас в мини-игре (на случай ухода со вкладки). */
    markMinigameStarted: function () {
      this.state.status = 'minigame';
      this.save();
    },

    markMinigameCompleted: function (minigameId) {
      if (this.state.completedMinigames.indexOf(minigameId) === -1) {
        this.state.completedMinigames.push(minigameId);
      }
      this.save();
    },

    /**
     * Добавить реплику в историю, но только если этот экран сюжетной
     * сцены ещё не показывался — иначе при пролистывании Back/Next
     * история будет бесконечно дублироваться.
     */
    addHistoryEntry: function (storySceneIndex, screenIndex, text, speakerName) {
      const key = storySceneIndex + '_' + screenIndex;
      if (this.state.visitedScreens.indexOf(key) !== -1) return;

      this.state.visitedScreens.push(key);
      this.state.history.push({
        storySceneIndex: storySceneIndex,
        screenIndex: screenIndex,
        text: text,
        speakerName: speakerName || null,
      });
      this.save();
    },

    /** История реплик конкретной сюжетной сцены — для окна "История". */
    getHistoryForScene: function (storySceneIndex) {
      return this.state.history.filter(function (e) {
        return e.storySceneIndex === storySceneIndex;
      });
    },

    updateSettings: function (partialSettings) {
      this.state.settings = Object.assign({}, this.state.settings, partialSettings);
      this.save();
    },

    /** Полный сброс прогресса (для будущей кнопки "Новая игра"). */
    reset: function () {
      SaveManager.clear();
      this.state = SaveManager.load();
    },

    /** Проверка срока хранения при возвращении на вкладку или продолжении из меню. */
    checkExpiration: function () {
      if (SaveManager.isExpired(this.state)) {
        this.reset();
        return true;
      }
      return false;
    }

  };

  window.VN.systems.GameState = GameState;
})();
