// Phaser подключается глобально (resource/lib/phaser.min.js), как во всей игре.

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

// Позиция заголовка взята из макета: он смещён левее центра экрана.
const TITLE = {
    x: 908,
    y: 517
};

const BACK_BUTTON = {
    x: 1671,
    y: 40,
    width: 209,
    height: 81
};

const COLOR_BACKGROUND = 0xffffff;
const COLOR_BUTTON = 0xd9d9d9;

const FONT_FAMILY = 'Inter, sans-serif';
const COLOR_TEXT = '#000000';

export class AuthorsScene extends Phaser.Scene {

    constructor() {
        super('AuthorsScene');
    }

    create() {
        this.layout = window.VN.systems.Layout;
        this.createBackground();
        this.createTitle();
        this.createBackButton();
    }

    createBackground() {
        this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);

        const background = this.add.rectangle(
            0,
            0,
            BASE_WIDTH,
            BASE_HEIGHT,
            COLOR_BACKGROUND
        ).setOrigin(0);

        // Фон — на весь экран, включая поля по краям.
        this.layout.fill(this, background);
    }

    createTitle() {
        const title = this.add.text(TITLE.x, TITLE.y, 'Авторы', {
            fontFamily: FONT_FAMILY,
            fontSize: '64px',
            color: COLOR_TEXT,
            align: 'center'
        }).setOrigin(0.5);

    }

    createBackButton() {
        const box = this.add.rectangle(
            BACK_BUTTON.x,
            BACK_BUTTON.y,
            BACK_BUTTON.width,
            BACK_BUTTON.height,
            COLOR_BUTTON
        ).setOrigin(0);

        const label = this.add.text(
            BACK_BUTTON.x + BACK_BUTTON.width / 2,
            BACK_BUTTON.y + BACK_BUTTON.height / 2,
            'назад',
            {
                fontFamily: FONT_FAMILY,
                fontSize: '40px',
                color: COLOR_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        box.setInteractive({ useHandCursor: true });
        box.on('pointerdown', () => this.scene.start('FinishScene'));

        // Кнопка «назад» — в правом верхнем углу экрана (с учётом выреза).
        this.layout.pin(this, box, { right: BASE_WIDTH - BACK_BUTTON.x, top: BACK_BUTTON.y });
        this.layout.pin(this, label, {
            right: BASE_WIDTH - BACK_BUTTON.x - BACK_BUTTON.width / 2,
            top: BACK_BUTTON.y + BACK_BUTTON.height / 2
        });
    }
}
