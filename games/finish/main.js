import { FinishScene } from './FinishScene.js';
import { AuthorsScene } from './AuthorsScene.js';
import './style.css';

const config = {
    type: Phaser.AUTO,
    dom: { createContainer: true },
    // Прозрачный холст: фон финального экрана задан под ним на всё окно.
    transparent: true,

    // Весь макет масштабируется целиком, сохраняя пропорции 16:9.
    scale: {
        parent: 'app',
        mode: Phaser.Scale.FIT,
        width: 1920,
        height: 1080,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [FinishScene, AuthorsScene]
};

new Phaser.Game(config);
