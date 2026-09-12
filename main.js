/**
 * Точка сборки игры. К этому моменту (см. порядок подключения в
 * index.html) все data/*, systems/* и scenes/* файлы уже выполнились
 * и записали себя в window.VN — здесь мы просто берём готовые классы
 * сцен и создаём Phaser.Game.
 */

import { GameScene1 } from './games/game1/GameScene1.js';
import { GameScene2 } from './games/game2/GameScene2.js';
import { GameScene3 } from './games/game3/GameScene3.js';
import { GameScene4 } from './games/game4/GameScene4.js';

(function () {
  const VN = window.VN;

  const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'app',
    backgroundColor: '#000000',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      VN.scenes.BootScene,
      VN.scenes.StartScene,
      VN.scenes.StoryScene,
      VN.scenes.PauseScene,
      VN.scenes.PlaceholderMinigameScene,
      VN.scenes.QuoteMinigameScene,

      GameScene1,
      GameScene2,
      GameScene3,
      GameScene4
    ],
  };

  new Phaser.Game(config);

  // Страховка на случай сворачивания/закрытия вкладки: даже если
  // что-то не сохранилось на последнем клике, эти события гарантированно
  // сбросят актуальное состояние в localStorage.
  window.addEventListener('pagehide', function () { VN.systems.GameState.save(); });
  window.addEventListener('beforeunload', function () { VN.systems.GameState.save(); });
})();
