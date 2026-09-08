import Phaser from 'phaser';
import { GameScene2 } from './GameScene2.js';
import '../../src/styles/reset.css';

const config = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
    },

    scene: [GameScene2]
};

new Phaser.Game(config);