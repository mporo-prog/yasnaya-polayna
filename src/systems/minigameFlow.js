import { storyLines } from '../data/story/storyLines.js';
import { GameState } from './GameState.js';

export function finishMinigameAndAdvance(scene, storySceneIndex, minigameId) {
  GameState.markMinigameCompleted(minigameId);

  const nextIndex = storySceneIndex + 1;
  if (nextIndex < storyLines.length) {
    GameState.goToScreen(nextIndex, 0);
    scene.scene.start('StoryScene', { storySceneIndex: nextIndex, screenIndex: 0 });
    return;
  }

  const w = scene.scale.width, h = scene.scale.height;
  scene.add.text(w / 2, h / 2 - 60, 'Конец прототипа', { fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);

  const btn = scene.add.rectangle(w / 2, h / 2 + 40, 320, 80, 0xd9d9d9).setInteractive({ useHandCursor: true });
  scene.add.text(w / 2, h / 2 + 40, 'Начать сначала', { fontSize: '28px', color: '#000000' }).setOrigin(0.5);
  btn.on('pointerup', () => {
    GameState.reset();
    scene.scene.start('MainMenuScene');
  });
}
