import Phaser from 'phaser';
import './style.css';

import { BootScene } from './scenes/boot/BootScene.js';
import { StartScene } from './scenes/start/StartScene.js';
import { StoryScene } from './scenes/story/StoryScene.js';
import { PauseScene } from './scenes/pause/PauseScene.js';
import { SettingsScene } from './scenes/settings/SettingsScene.js';
import { PlaceholderMinigameScene } from './scenes/minigames/placeholder/PlaceholderMinigameScene.js';
import { QuoteMinigameScene } from './scenes/minigames/quote/QuoteMinigameScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'app',
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, StartScene, StoryScene, PauseScene, SettingsScene, PlaceholderMinigameScene, QuoteMinigameScene],
});
