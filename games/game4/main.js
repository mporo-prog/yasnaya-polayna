import Phaser from 'phaser';
import { GameScene4 } from './GameScene4.js';
import '../../src/styles/reset.css';

const config = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
    },

    scene: [GameScene4]
};

new Phaser.Game(config);