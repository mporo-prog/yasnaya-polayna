/**
 * переход "мини-игра пройдена -> следующая  * сюжетная сцена" 
 */
(function () {
  window.VN.systems.finishMinigameAndAdvance = function (scene, storySceneIndex, minigameId) {
    const GameState = window.VN.systems.GameState;
    const storyLines = window.VN.data.storyLines;

    GameState.markMinigameCompleted(minigameId);

    const nextIndex = storySceneIndex + 1;
    if (nextIndex < storyLines.length) {
      GameState.goToScreen(nextIndex, 0);
      scene.scene.start('StoryScene', { storySceneIndex: nextIndex, screenIndex: 0 });
    } else {
      scene.add
        .text(scene.scale.width / 2, scene.scale.height / 2, 'Конец прототипа', {
          fontSize: '40px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    }
  };
})();
