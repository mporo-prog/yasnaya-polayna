// import Phaser from 'phaser';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

const ITEM_SIZE = 246;
const ITEM_STEP = 261;
const ROW_Y = 180;
const ROW_CENTER_X = 960;

const TABLE_Y = 540;
const TABLE_SLOTS = [345, 683, 1021];

const MENU_BUTTON = {
    x: 1830,
    y: 14,
    width: 72,
    height: 66
};

const COLOR_BACKGROUND = 0xffffff;
const COLOR_TABLE = 0xf2f2f2;
const COLOR_ITEM = 0xd9d9d9;
const COLOR_ITEM_WRONG = 0xff7272;
const COLOR_MENU = 0x6f6f6f;
const COLOR_OVERLAY = 0xd9d9d9;

const FONT_FAMILY = 'Inter, sans-serif';
const COLOR_TEXT = '#000000';

const ITEMS = [
    { label: 'Чай без сахара', group: 'tea', correct: true },
    { label: 'Чай с сахаром', group: 'tea', correct: false },
    { label: 'Книга', group: 'reading', correct: false },
    { label: 'Газета', group: 'reading', correct: true },
    { label: 'Овсяная каша', group: 'food', correct: true },
    { label: 'Манная каша', group: 'food', correct: false }
];

const GROUPS_TOTAL = 3;

export class GameScene3 extends Phaser.Scene {

    constructor() {
        super('GameScene3');
    }

    init(data) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
    }

    create() {
        this.started = false;
        this.paused = false;
        this.finished = false;
        this.completed = false;
        this.placedCount = 0;
        this.arrivedCount = 0;

        this.calculateScale();
        this.createRoot();
        this.createBackground();
        this.createItems();
        this.createPauseOverlay();
        this.createButtonMenu();
        this.createWinOverlay();
        this.createIntroOverlay();
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

        const table = this.add.rectangle(
            0,
            TABLE_Y,
            BASE_WIDTH,
            BASE_HEIGHT - TABLE_Y,
            COLOR_TABLE
        ).setOrigin(0);

        this.root.add([background, table]);
    }

    createItems() {
        this.items = ITEMS.map(data => {
            const item = {
                label: data.label,
                group: data.group,
                correct: data.correct,
                placed: false,
                removed: false
            };

            item.box = this.add.rectangle(
                0,
                0,
                ITEM_SIZE,
                ITEM_SIZE,
                COLOR_ITEM
            );

            item.text = this.add.text(0, 0, data.label, {
                fontFamily: FONT_FAMILY,
                fontSize: '40px',
                color: COLOR_TEXT,
                align: 'center',
                wordWrap: { width: ITEM_SIZE - 40 }
            }).setOrigin(0.5);

            item.container = this.add.container(0, 0, [item.box, item.text]);

            item.box.setInteractive({ useHandCursor: true });
            item.box.on('pointerdown', () => this.selectItem(item));

            this.root.add(item.container);

            return item;
        });

        this.rowItems = [...this.items];
        this.layoutRow(false);
    }

    layoutRow(animated) {
        const count = this.rowItems.length;
        const rowWidth = count * ITEM_SIZE + (count - 1) * (ITEM_STEP - ITEM_SIZE);
        const startX = ROW_CENTER_X - rowWidth / 2 + ITEM_SIZE / 2;
        const y = ROW_Y + ITEM_SIZE / 2;

        this.rowItems.forEach((item, index) => {
            const x = startX + index * ITEM_STEP;

            if (!animated) {
                item.container.setPosition(x, y);
                return;
            }

            this.tweens.killTweensOf(item.container);

            this.tweens.add({
                targets: item.container,
                x: x,
                y: y,
                duration: 300,
                ease: 'Power2'
            });
        });
    }

    selectItem(item) {
        if (!this.started || this.paused || this.finished) {
            return;
        }

        if (item.placed || item.removed) {
            return;
        }

        if (item.correct) {
            this.placeItem(item);
        } else {
            item.box.setFillStyle(COLOR_ITEM_WRONG);
        }
    }

    placeItem(item) {
        const partner = this.rowItems.find(
            other => other !== item && other.group === item.group
        );

        item.placed = true;
        item.box.disableInteractive();

        const x = TABLE_SLOTS[this.placedCount] + ITEM_SIZE / 2;
        const y = TABLE_Y + ITEM_SIZE / 2;

        this.placedCount += 1;
        this.rowItems = this.rowItems.filter(
            other => other !== item && other !== partner
        );

        if (partner) {
            this.removeItem(partner);
        }

        this.tweens.killTweensOf(item.container);

        this.tweens.add({
            targets: item.container,
            x: x,
            y: y,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                this.arrivedCount += 1;
                this.checkCompletion();
            }
        });

        this.layoutRow(true);
    }

    removeItem(item) {
        item.removed = true;
        item.box.disableInteractive();

        this.tweens.killTweensOf(item.container);

        this.tweens.add({
            targets: item.container,
            alpha: 0,
            duration: 250,
            ease: 'Power2',
            onComplete: () => item.container.destroy()
        });
    }

    checkCompletion() {
        if (this.arrivedCount < GROUPS_TOTAL) {
            return;
        }

        this.finished = true;
        this.winOverlay.setVisible(true);
    }

    createButtonMenu() {
        const button = this.add.rectangle(
            MENU_BUTTON.x,
            MENU_BUTTON.y,
            MENU_BUTTON.width,
            MENU_BUTTON.height,
            COLOR_MENU
        ).setOrigin(0);

        const label = this.add.text(
            MENU_BUTTON.x + MENU_BUTTON.width / 2,
            MENU_BUTTON.y + MENU_BUTTON.height / 2,
            'меню',
            {
                fontFamily: FONT_FAMILY,
                fontSize: '16px',
                color: COLOR_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.togglePause());

        this.root.add([button, label]);
    }

    createOverlay(text, onClick) {
        const background = this.add.rectangle(
            0,
            0,
            BASE_WIDTH,
            BASE_HEIGHT,
            COLOR_OVERLAY
        ).setOrigin(0);

        const label = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2, text, {
            fontFamily: FONT_FAMILY,
            fontSize: '40px',
            color: COLOR_TEXT,
            align: 'center'
        }).setOrigin(0.5);

        background.setInteractive({ useHandCursor: Boolean(onClick) });

        if (onClick) {
            background.on('pointerdown', onClick);
        }

        const overlay = this.add.container(0, 0, [background, label]);
        overlay.setVisible(false);

        this.root.add(overlay);

        return overlay;
    }

    createPauseOverlay() {
        this.pauseOverlay = this.createOverlay('Пауза');
    }

    createWinOverlay() {
        this.winOverlay = this.createOverlay('Ура пабеда', () => this.finishGame());
    }

    createIntroOverlay() {
        this.introOverlay = this.createOverlay(
            'Соберите завтрак для Толстого',
            () => this.startGame()
        );

        this.introOverlay.setVisible(true);
    }

    startGame() {
        this.started = true;
        this.introOverlay.setVisible(false);
    }

    togglePause() {
        if (!this.started || this.finished) {
            return;
        }

        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);

        if (this.paused) {
            this.tweens.pauseAll();
        } else {
            this.tweens.resumeAll();
        }
    }

    // finishGame() {
    //     if (this.completed) {
    //         return;
    //     }

    //     this.completed = true;
    //     this.events.emit('game3:complete');
    // }

    finishGame() {
        if (this.completed) {
            return;
        }

        this.completed = true;

        window.VN.systems.finishMinigameAndAdvance(
            this,
            this.storySceneIndex,
            this.minigameId
        );
    }

    setupInput() {
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());

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
