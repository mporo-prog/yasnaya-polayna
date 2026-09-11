// Прогресс живёт только в памяти вкладки — при перезагрузке страницы
// сбрасывается. Нужен для Back/Next, окна "История" и перехода между
// сюжетными сценами и мини-играми в рамках одной сессии.

const state = {
  storySceneIndex: 0,
  screenIndex: 0,
  history: [],
  visitedScreens: [],
  completedMinigames: [],
};

export const GameState = {
  state,

  goToScreen(storySceneIndex, screenIndex) {
    this.state.storySceneIndex = storySceneIndex;
    this.state.screenIndex = screenIndex;
  },

  markMinigameCompleted(id) {
    if (!this.state.completedMinigames.includes(id)) {
      this.state.completedMinigames.push(id);
    }
  },

  addHistoryEntry(storySceneIndex, screenIndex, text) {
    const key = `${storySceneIndex}_${screenIndex}`;
    if (this.state.visitedScreens.includes(key)) return;
    this.state.visitedScreens.push(key);
    this.state.history.push({ storySceneIndex, screenIndex, text });
  },

  getHistoryForScene(storySceneIndex) {
    return this.state.history.filter((e) => e.storySceneIndex === storySceneIndex);
  },

  reset() {
    this.state.storySceneIndex = 0;
    this.state.screenIndex = 0;
    this.state.history = [];
    this.state.visitedScreens = [];
    this.state.completedMinigames = [];
  },
};
