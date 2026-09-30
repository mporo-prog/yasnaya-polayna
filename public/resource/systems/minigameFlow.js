/** Переход «мини-игра пройдена → следующая сюжетная сцена». */
(function () {
  // Полное время от яркой мини-игры до яркого сюжета, в секундах.
  // Половина — затемнение, половина — появление. 0 отключает анимацию.
  const DEFAULT_TRANSITION_DURATION = 0.75;
  window.VN.data.minigameStoryTransition = { duration: DEFAULT_TRANSITION_DURATION };
  const pending = new WeakSet();

  window.VN.systems.finishMinigameAndAdvance = function (scene, storySceneIndex, minigameId) {
    if (pending.has(scene)) return;
    const GameState = window.VN.systems.GameState;
    const storyLines = window.VN.data.storyLines;

    GameState.markMinigameCompleted(minigameId);

    const nextIndex = storySceneIndex + 1;
    if (nextIndex < storyLines.length) {
      GameState.goToScreen(nextIndex, 0);
      const configured = window.VN.data.minigameStoryTransition.duration;
      const duration = Number.isFinite(configured) && configured >= 0
        ? configured : DEFAULT_TRANSITION_DURATION;
      const data = { storySceneIndex: nextIndex, screenIndex: 0 };
      if (duration === 0) {
        scene.scene.start('StoryScene', data);
        return;
      }

      pending.add(scene);
      const camera = scene.cameras.main;
      const inputEnabled = scene.input.enabled;
      const keyboardEnabled = scene.input.keyboard?.enabled;
      scene.input.enabled = false;
      if (scene.input.keyboard) scene.input.keyboard.enabled = false;
      let cancelled = false;
      const startStory = () => scene.scene.start('StoryScene', {
        ...data, minigameFadeInMs: duration * 500,
      });
      scene.events.once('shutdown', () => {
        cancelled = true;
        pending.delete(scene);
        camera.off('camerafadeoutcomplete', startStory);
        scene.input.enabled = inputEnabled;
        if (scene.input.keyboard) scene.input.keyboard.enabled = keyboardEnabled;
      });

      // Дожидаемся ресурсов до затемнения, чтобы загрузка не разрывала анимацию.
      window.VN.systems.SceneAssets.prefetch(scene, 'StoryScene', data).then(() => {
        if (cancelled) return;
        camera.once('camerafadeoutcomplete', startStory);
        camera.fadeOut(duration * 500, 0, 0, 0);
      });
    } else {
    
      //Вызов сброса прогресса
      GameState.reset();
      //  кнопка "Завершить" ведёт в главное меню
      scene.scene.start('MainMenuScene');
    }
  };
})();
