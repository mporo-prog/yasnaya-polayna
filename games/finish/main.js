import Phaser from 'phaser';
import { FinishScene } from './FinishScene.js';
import { AuthorsScene } from './AuthorsScene.js';
import '../../src/styles/reset.css';

const config = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
    },

    scene: [FinishScene, AuthorsScene]
};

new Phaser.Game(config);
