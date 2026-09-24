import Phaser from 'phaser';
import { GameScene1 } from './GameScene1.js';
import '../../src/styles/reset.css';

const config = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
    },

    scene: [GameScene1]
};

new Phaser.Game(config);
