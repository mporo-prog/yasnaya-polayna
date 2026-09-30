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

  const widthScreen = 1920;
  const heightScreen = 1080;

  const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    // Scale.EXPAND: холст заполняет весь экран, координаты макета
    // 1920×1080 — «безопасная зона» по центру, лишнее место — поля.
    // механика работы будет в resource/systems/Layout.js.
    scale: VN.systems.Layout.getScaleConfig('app'),
    scene: [
      VN.scenes.BootScene,
      VN.scenes.AssetLoaderScene,
      VN.scenes.StartScene,
      VN.scenes.SettingsScene,
      VN.scenes.AuthorsScene,
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

  // new Phaser.Game(config);
  window.game = new Phaser.Game(config);

  // Телефоны/планшеты: пауза в вертикальной ориентации, полноэкранный режим.
  VN.systems.MobileScreen.install(window.game);

  // Единственная точка подключения: false исключает весь модуль из сборки.
  if (import.meta.env.VITE_DEVELOPER_MODE !== 'false') {
    import('./src/developer/index.js').then(({ installDeveloperMode }) => {
      installDeveloperMode(window.game, VN);
    });
  }

  VN.systems.ProgressLifecycle.install(window.game);
})();
