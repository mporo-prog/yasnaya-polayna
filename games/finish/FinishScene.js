import Phaser from 'phaser';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

const PANEL = {
    x: 412,
    y: 74,
    width: 1096,
    height: 414
};

// Три кнопки с генеративным наполнением — пока просто чёрные квадраты.
const BONUS_SIZE = {
    width: 166,
    height: 160
};

const BONUS_Y = 281;
const BONUS_X = [539, 872, 1205];

const BUTTON = {
    x: 721,
    width: 478,
    height: 110,
    step: 137
};

const BUTTON_Y = 647;

const COLOR_BACKGROUND = 0xffffff;
const COLOR_PANEL = 0xd9d9d9;
const COLOR_BONUS = 0x000000;
const COLOR_BUTTON = 0xd9d9d9;

const FONT_FAMILY = 'Inter, sans-serif';
const COLOR_TEXT = '#000000';

const BUTTONS = [
    { label: 'ПОВТОРИТЬ', action: null },
    { label: 'УЗНАТЬ БОЛЬШЕ', action: null },
    { label: 'АВТОРЫ', action: 'authors' }
];

export class FinishScene extends Phaser.Scene {

    constructor() {
        super('FinishScene');
    }

    create() {
        this.calculateScale();
        this.createRoot();
        this.createBackground();
        this.createPanel();
        this.createBonuses();
        this.createButtons();
        this.setupInput();
    }

    calculateScale() {
        const width = this.scale.width || BASE_WIDTH;
        const height = this.scale.height || BASE_HEIGHT;

        this.gameScale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        this.offsetX = (width - BASE_WIDTH * this.gameScale) / 2;
        this.offsetY = (height - BASE_HEIGHT * this.gameScale) / 2;
    }

    createRoot() {
        this.root = this.add.container(this.offsetX, this.offsetY);
        this.root.setScale(this.gameScale);
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

        this.root.add(background);
    }

    createPanel() {
        const panel = this.add.rectangle(
            PANEL.x,
            PANEL.y,
            PANEL.width,
            PANEL.height,
            COLOR_PANEL
        ).setOrigin(0);

        const thanks = this.add.text(BASE_WIDTH / 2, 143, 'СПАСИБО ЗА ИГРУ', {
            fontFamily: FONT_FAMILY,
            fontSize: '48px',
            color: COLOR_TEXT,
            align: 'center'
        }).setOrigin(0.5);

        const bonus = this.add.text(BASE_WIDTH / 2, 211, 'ВОТ ВАШ БОНУС', {
            fontFamily: FONT_FAMILY,
            fontSize: '48px',
            color: COLOR_TEXT,
            align: 'center'
        }).setOrigin(0.5);

        this.root.add([panel, thanks, bonus]);
    }

    createBonuses() {
        BONUS_X.forEach(x => {
            const square = this.add.rectangle(
                x,
                BONUS_Y,
                BONUS_SIZE.width,
                BONUS_SIZE.height,
                COLOR_BONUS
            ).setOrigin(0);

            this.root.add(square);
        });
    }

    createButtons() {
        BUTTONS.forEach((data, index) => {
            const y = BUTTON_Y + index * BUTTON.step;

            const box = this.add.rectangle(
                BUTTON.x,
                y,
                BUTTON.width,
                BUTTON.height,
                COLOR_BUTTON
            ).setOrigin(0);

            const label = this.add.text(
                BUTTON.x + BUTTON.width / 2,
                y + BUTTON.height / 2,
                data.label,
                {
                    fontFamily: FONT_FAMILY,
                    fontSize: '40px',
                    color: COLOR_TEXT,
                    align: 'center'
                }
            ).setOrigin(0.5);

            // «Повторить» и «Узнать больше» пока без действия.
            if (data.action === 'authors') {
                box.setInteractive({ useHandCursor: true });
                box.on('pointerdown', () => this.scene.start('AuthorsScene'));
            }

            this.root.add([box, label]);
        });
    }

    setupInput() {
        this.scale.on('resize', this.handleResize, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
        });
    }

    handleResize() {
        this.calculateScale();

        this.root.setPosition(this.offsetX, this.offsetY);
        this.root.setScale(this.gameScale);
    }
}
