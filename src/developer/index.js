import { DeveloperMode } from './DeveloperMode.js';
import { createDeveloperScreen } from './screen.js';
import { SoundTestScene } from './SoundTestScene.js';
import './style.css';

const sceneLabels = {
  GameScene1: 'Пение птиц',
  GameScene2: 'Цветные зоны',
  GameScene3: 'Завтрак Толстого',
  GameScene4: 'Сортировка писем',
  QuoteMinigameScene: 'Продолжите цитату',
};

// Каталог следует за игровым маршрутом; новым сценам достаточно добавить
// подпись выше. Без подписи кнопка показывает ключ сцены.
export function installDeveloperMode(game, vn) {
  const entries = vn.data.storyMinigameLinks.flatMap((key, storySceneIndex) => key ? [{
    key,
    label: sceneLabels[key] || key,
    data: {
      storySceneIndex,
      minigameId: `story_${storySceneIndex + 1}_minigame`,
    },
  }] : []);
  entries.push({ key: 'SoundTestScene', label: 'Саундтест', data: {} });

  const screen = createDeveloperScreen(entries);
  const mode = new DeveloperMode(game, screen, entries, (entry) => {
    if (entry.key === 'SoundTestScene') return;
    vn.systems.GameState.goToScreen(entry.data.storySceneIndex, 0);
    vn.systems.GameState.markMinigameStarted();
  });
  game.scene.add('SoundTestScene', new SoundTestScene(() => mode.open()), false);

  screen.onSelect = (entry) => mode.launch(entry);
  screen.onClose = () => mode.close();
  return () => {
    mode.destroy();
    game.scene.remove('SoundTestScene');
  };
}
