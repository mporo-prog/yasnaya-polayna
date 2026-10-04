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

const game = new Phaser.Game(config);

// Как в основной игре: пауза в вертикальной ориентации, а первое касание
// включает полноэкранный режим с альбомной ориентацией. Переход на эту страницу
// выходит из полноэкранного режима, и без этого игрок с выключенным автоповоротом
// не смог бы убрать оверлей «Поверни устройство».
window.VN.systems.MobileScreen.install(game);
