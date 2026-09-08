import Phaser from 'phaser';
import MainScene from './scenes/MainScene.js';
import './styles/reset.css';

const config = {
    type: Phaser.AUTO,

    scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%'
    },

    backgroundColor: '#0f0f0f',

    scene: [MainScene]
};

new Phaser.Game(config);