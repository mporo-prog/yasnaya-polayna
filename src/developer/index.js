import { DeveloperMode } from './DeveloperMode.js';
import { createDeveloperScreen } from './screen.js';
import { SoundTestScene } from './SoundTestScene.js';
import './style.css';

const sceneLabels = {
  GameScene1: 'Пение птиц',
  GameScene2: 'Цветные зоны',
  GameScene3: 'Завтрак Толстого',
  GameScene4: 'Сортировка писем',
  QuoteMinigameScene: 'Продолжи цитату',
};

// Каталог следует за игровым маршрутом; новым мини-играм достаточно добавить
// подпись выше. Без подписи кнопка показывает ключ сцены.
export function installDeveloperMode(game, vn) {
  const entries = vn.data.storyLines.flatMap((_, storySceneIndex) => {
    const storyEntry = {
      key: 'StoryScene',
      label: `Сюжетная сцена ${storySceneIndex + 1}`,
      description: 'Начать с первой реплики',
      data: { storySceneIndex, screenIndex: 0 },
    };
    const key = vn.data.storyMinigameLinks[storySceneIndex];
    return key ? [storyEntry, {
      key,
      label: sceneLabels[key] || key,
      data: {
        storySceneIndex,
        minigameId: `story_${storySceneIndex + 1}_minigame`,
      },
    }] : [storyEntry];
  });
  entries.push({
    key: 'FinishScene',
    label: 'Финальный экран',
    description: 'Открыть экран итогов игры',
    url: `${import.meta.env.BASE_URL}games/finish/index.html`,
  });
  entries.push({ key: 'SoundTestScene', label: 'Саундтест', data: {} });
  entries.push({
    key: 'MainMenuScene',
    label: 'Сбросить сохранение',
    description: 'Удалить прогресс и вернуться в главное меню',
    data: {},
  });

  const screen = createDeveloperScreen(entries);
  const mode = new DeveloperMode(game, screen, entries, (entry) => {
    if (entry.key === 'MainMenuScene') {
      vn.systems.GameState.reset();
      return;
    }
    if (entry.key === 'SoundTestScene') return;
    vn.systems.GameState.goToScreen(entry.data.storySceneIndex, 0);
    if (entry.key !== 'StoryScene') vn.systems.GameState.markMinigameStarted();
  });
  game.scene.add('SoundTestScene', new SoundTestScene(() => mode.open()), false);

  screen.onSelect = (entry) => mode.launch(entry);
  screen.onClose = () => mode.close();
  return () => {
    mode.destroy();
    game.scene.remove('SoundTestScene');
  };
}
