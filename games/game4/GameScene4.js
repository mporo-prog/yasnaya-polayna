// import Phaser from 'phaser';

// Все координаты — в пикселях макета 1920×1080 (безопасная зона).
// Растягивание на экран и поля по краям — resource/systems/Layout.js.
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

const GAME4_SAVE_KEY = 'game4_save_v1';
import { Game4Timer } from './systems/Game4Timer.js';
import { Letter } from './models/Letter.js';
import { LetterStack } from './models/LetterStack.js';
import { Envelope } from './models/Envelope.js';
import { Game4Storage } from './systems/Game4Storage.js';
import { letterLists } from './data/letterLists.js';

export class GameScene4 extends Phaser.Scene {

    constructor() {
        super('GameScene4');

        this.handlePageHide = () => {
            this.saveGame4State();
        };
    }

    init(data) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
    }

    preload() {
        if (window.VN?.systems.SceneAssets) {
            window.VN.systems.SceneAssets.preload(this);
            return;
        }
        window.VN?.systems.SceneAudio?.preload(this);
    }

    create() {

        this.storage = new Game4Storage(GAME4_SAVE_KEY);

        this.completed = false;
        this.timeLeft = undefined;

        window.VN?.systems.SceneAudio?.enter(this);
        this.layout = window.VN.systems.Layout;
        this.createBackground();
        this.createGameField();
        this.createEnvelopes();
        this.createButtonMenu();
        this.setupDrag();
        this.createLetters();
        // Перезагрузка возможна и во время анимации последнего отсортированного письма.
        if (this.checkGameFinished()) {
            this.finishGame();
            return;
        }
        this.createCounter();
        this.createTimer();
        window.VN?.systems.SceneAssets?.prefetchNext(this);

        window.addEventListener(
            'pagehide',
            this.handlePageHide
        );

        this.events.once('shutdown', () => {
            window.removeEventListener(
                'pagehide',
                this.handlePageHide
            );
        });
    }

    createBackground() {
        const background = this.add.rectangle(
            0,
            0,
            BASE_WIDTH,
            BASE_HEIGHT,
            0x3a3a3a
        ).setOrigin(0);

        // Фон — на весь экран, включая поля по краям.
        this.layout.fill(this, background);
    }

    createButtonMenu() {

        const buttonWidth = 72;
        const buttonHeight = 66;

        const buttonX =
            this.panelX +
            (BASE_WIDTH - this.panelX) -
            0.06 * BASE_WIDTH;

        const button = this.add.rectangle(
            buttonX,
            10 + buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            0x555555
        ).setOrigin(0);

        button.setInteractive({
            useHandCursor: true
        });

        button.on('pointerdown', () => {
            this.openPauseMenu();
        });

        // Кнопка меню — в правом верхнем углу экрана (с учётом выреза).
        this.layout.pin(this, button, { right: BASE_WIDTH - buttonX, top: button.y });
    }

    openPauseMenu() {

        this.scene.launch('PauseScene', {
            returnSceneKey: 'GameScene4'
        });

        this.scene.pause();

        this.scene.bringToTop('PauseScene');
    }

    createGameField() {
        const width = BASE_WIDTH;
        const height = BASE_HEIGHT;
        const tableWidth = width * 0.8;
        const tableHeight = height * 0.5;

        this.panelX = width / 2 - tableWidth / 2;
        this.panelY = height - tableHeight;

        const field = this.add.rectangle(
            0,
            0,
            width,
            height,
            0xd9d9d9
        ).setOrigin(0);

        const table = this.add.rectangle(
            this.panelX,
            this.panelY,
            tableWidth,
            tableHeight,
            0x6f6f6f
        ).setOrigin(0);

        // Поле — на весь экран; стол той же ширины, но до нижнего края экрана.
        this.layout.fill(this, field);
        this.layout.fill(this, table, {
            left: this.panelX,
            right: this.panelX + tableWidth,
            top: this.panelY
        });
    }

    createLetters() {

        const saved = this.loadGame4State();

        let letters;

        if (saved) {

            letters = saved.letters.map(letter => {
                return new Letter(
                    letter.envelope,
                    letter.color
                );
            });

            this.sortedLetters = saved.sortedLetters;
            this.totalLetters = saved.totalLetters;
            this.timeLeft = saved.timeLeft;

        } else {

            const randomList =
                Phaser.Utils.Array.GetRandom(letterLists);

            letters = randomList.map(letter => {
                return new Letter(
                    letter.envelope,
                    letter.color
                );
            });

            this.totalLetters = letters.length;
            this.sortedLetters = 0;
            this.timeLeft = 30;
        }

        const letterWidth = 350;
        const letterHeight = 250;

        const startLetterX = BASE_WIDTH / 2 - letterWidth / 2;
        const startLetterY = BASE_HEIGHT * 0.6;
      
        this.letterStack = new LetterStack(letters);

        this.letterStack.getAll().forEach((letter, index) => {

            letter.createSprite(
                this,
                startLetterX,
                startLetterY,
                letterWidth,
                letterHeight
            );

            letter.sprite.setDepth(index);
        });

        this.activateTopLetter();
    }

    saveGame4State() {
        if (this.completed || !this.letterStack) return;
        this.storage.save({

            letters: this.letterStack
                .getAll()
                .map(letter => ({
                    envelope: letter.envelope,
                    color: letter.color
                })),

            sortedLetters: this.sortedLetters,

            totalLetters: this.totalLetters,

            timeLeft: this.timeLeft
        });
    }

    loadGame4State() {
        return this.storage.load();
    }

    clearGame4Save() {
        this.storage.clear();
    }

    createCounter() {

        this.counterText = this.add.text(
            BASE_WIDTH / 2,
            40,
            `${this.sortedLetters}/${this.totalLetters}`,
            {
                fontSize: '36px',
                color: '#000000'
            }
        ).setOrigin(0.5);
    }

    createTimer() {

        this.timerText = this.add.text(
            BASE_WIDTH / 2,
            90,
            '',
            {
                fontSize: '36px',
                color: '#000000'
            }
        ).setOrigin(0.5);

        this.timer = new Game4Timer(
            this,
            30,

            (timeLeft) => {

                this.timeLeft = timeLeft;

                this.updateTimerText();

                this.saveGame4State();
            },

            () => {

                this.loseGame();
            }
        );

        this.timer.start(this.timeLeft);
    }

    updateTimerText() {

        const seconds = Math.max(
            0,
            this.timeLeft
        );

        this.timerText.setText(
            `00:${seconds.toString().padStart(2, '0')}`
        );
    }

    updateCounter() {

        this.counterText.setText(
            `${this.sortedLetters}/${this.totalLetters}`
        );
    }

    activateTopLetter() {

        this.letterStack.getAll().forEach(letter => {

            letter.sprite.disableInteractive();
            letter.lock();
        });

        if (this.letterStack.isEmpty()) {
            return;
        }

        const topLetter =
            this.letterStack.getTopLetter();

        topLetter.unlock();

        topLetter.sprite.setInteractive({
            draggable: true,
            useHandCursor: true
        });

        topLetter.sprite.setDepth(100);
    }

    createEnvelopes() {

        const sizeEnvelopes = 240;
        const envelopesWidthAndHeight = sizeEnvelopes;
        const gap = 80;
        const widthContainer = envelopesWidthAndHeight * 4 + gap * 3;
        const startContainerX = BASE_WIDTH / 2 - widthContainer / 2;
        const startContainerY = BASE_HEIGHT * 0.15;

        this.envelopes = [

            new Envelope(
                'pink',
                startContainerX,
                startContainerY,
                0xff8181
            ),

            new Envelope(
                'blue',
                startContainerX +
                gap +
                envelopesWidthAndHeight,
                startContainerY,
                0x6e9cff
            ),

            new Envelope(
                'yellow',
                startContainerX +
                gap * 2 +
                envelopesWidthAndHeight * 2,
                startContainerY,
                0xf7ff87
            ),

            new Envelope(
                'black',
                startContainerX +
                gap * 3 +
                envelopesWidthAndHeight * 3,
                startContainerY,
                0x000000
            )
        ];

        this.envelopes.forEach(envelope => {

            envelope.createSprite(
                this,
                envelopesWidthAndHeight,
                envelopesWidthAndHeight
            );
        });
    }

    setupDrag() {

        this.input.on(
            'dragstart',
            (pointer, gameObject) => {

                const letter =
                    this.letterStack
                        .getAll()
                        .find(
                            item => item.sprite === gameObject
                        );

                if (!letter || letter.isLocked()) {
                    return;
                }

                gameObject.setDepth(200);
            }
        );

        this.input.on(
            'drag',
            (pointer, gameObject, dragX, dragY) => {

                const letter =
                    this.letterStack
                        .getAll()
                        .find(
                            item => item.sprite === gameObject
                        );

                if (!letter || letter.isLocked()) {
                    return;
                }

                gameObject.x = dragX;
                gameObject.y = dragY;
            }
        );

        this.input.on(
            'dragend',
            (pointer, gameObject) => {

                const letter =
                    this.letterStack
                        .getAll()
                        .find(
                            item => item.sprite === gameObject
                        );

                if (!letter || letter.isLocked()) {
                    return;
                }

                const envelope = this.findZone(letter);

                if (
                    envelope &&
                    letter.isForEnvelope(envelope.id)
                ) {
                    this.deleteLetter(letter);
                } else {
                    this.returnLetter(letter);
                }
            }
        );
    }

    findZone(letter) {

        const bounds = letter.sprite.getBounds();

        const centerX = bounds.centerX;
        const centerY = bounds.centerY;

        for (const envelope of this.envelopes) {

            if (
                envelope.containsPoint(
                    centerX,
                    centerY
                )
            ) {
                return envelope;
            }
        }

        return null;
    }

    deleteLetter(letter) {

        letter.lock();

        const sprite = letter.sprite;

        this.letterStack.removeLetter(letter);

        this.sortedLetters++;

        this.updateCounter();

        this.saveGame4State();

        this.tweens.add({

            targets: sprite,

            alpha: 0,

            scale: 0.8,

            duration: 200,

            onComplete: () => {

                sprite.destroy();

                if (this.checkGameFinished()) {

                    this.finishGame();

                    return;
                }

                this.activateTopLetter();
            }
        });
    }

    returnLetter(letter) {

        this.tweens.add({

            targets: letter.sprite,

            x: letter.startX,

            y: letter.startY,

            duration: 500,

            ease: 'Power2'
        });

        letter.sprite.setDepth(100);
    }

    checkGameFinished() {

        return this.letterStack.isEmpty();
    }

    finishGame() {

        if (this.completed) {
            return;
        }

        this.completed = true;

        this.clearGame4Save();

        window.VN.systems.finishMinigameAndAdvance(
            this,
            this.storySceneIndex,
            this.minigameId
        );
    }

    loseGame() {

        if (this.completed) {
            return;
        }

        this.completed = true;

        this.clearGame4Save();

        if (this.timer) {
            this.timer.destroy();
        }

        this.letterStack.getAll().forEach(letter => {

            if (letter.sprite) {
                letter.sprite.disableInteractive();
            }
        });

        const panelWidth = 700;
        const panelHeight = 400;

        this.add.rectangle(
            BASE_WIDTH / 2,
            BASE_HEIGHT / 2,
            panelWidth,
            panelHeight,
            0xffffff
        )
        .setOrigin(0.5)
        .setDepth(101);

        this.add.text(
            BASE_WIDTH / 2,
            BASE_HEIGHT / 2 - 80,
            'Вы проиграли',
            {
                fontSize: '52px',
                color: '#000000'
            }
        )
        .setOrigin(0.5)
        .setDepth(102);

        this.restartGame();
    }

    restartGame() {

        this.clearGame4Save();

        this.scene.restart({
            storySceneIndex: this.storySceneIndex,
            minigameId: this.minigameId
        });
    }

    clearGame4Save() {
        this.storage.clear();
    }
}
