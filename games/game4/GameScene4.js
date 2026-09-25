// import Phaser from 'phaser';

const GAME4_SAVE_KEY = 'game4_save_v1';

export class GameScene4 extends Phaser.Scene {

    constructor() {
        super('GameScene4');

        this.shouldSave = true;
    }

    init(data) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
    }

    create() {
        this.completed = false;
        this.timeLeft = undefined;

        this.calculateScale();
        this.createBackground();
        this.createGameField();
        this.createEnvelopes();
        this.createButtonMenu();
        this.setupDrag();
        this.createLetters();
        this.createCounter();
        this.createTimer();
    }

    calculateScale() {
        const baseWidth = 1920;
        const baseHeight = 1080;
        const scaleX = this.scale.width / baseWidth;
        const scaleY = this.scale.height / baseHeight;
        this.gameScale = Math.min(scaleX, scaleY);
    }

    createBackground() {
        this.add.rectangle(
            0,
            0,
            this.scale.width,
            this.scale.height,
            0x3a3a3a
        ).setOrigin(0);
    }

    createButtonMenu() {

        const buttonWidth = 72 * this.gameScale;
        const buttonHeight = 66 * this.gameScale;

        const buttonX =
            this.panelX +
            (this.scale.width - this.panelX) -
            0.06 * this.scale.width;

        const button = this.add.rectangle(
            buttonX,
            10 * this.gameScale + buttonHeight / 2,
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
    }

    openPauseMenu() {
        this.scene.launch('PauseScene', {
            returnSceneKey: 'GameScene4'
        });

        this.scene.pause();

        this.scene.bringToTop('PauseScene');
    }

    createGameField() {
        const width = this.scale.width;
        const height = this.scale.height;
        const tableWidth = width * 0.8;
        const tableHeight = height * 0.5;
        this.panelX = width / 2 - tableWidth / 2;
        this.panelY = height - tableHeight;

        this.add.rectangle(
            0,
            0,
            width,
            height,
            0xd9d9d9
        ).setOrigin(0);

        this.add.rectangle(
            this.panelX,
            this.panelY,
            tableWidth,
            tableHeight,
            0x6f6f6f
        ).setOrigin(0);
    }

    createLetters() {

        const letterLists = [

            [
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'yellow', color: 0xf7ff87 }
            ],

            [
                { envelope: 'black', color: 0x000000 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'blue', color: 0x6e9cff }
            ],

            [
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'yellow', color: 0xf7ff87 },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'pink', color: 0xff8181 },
                { envelope: 'black', color: 0x000000 },
                { envelope: 'blue', color: 0x6e9cff },
                { envelope: 'yellow', color: 0xf7ff87 }
            ]
        ];

        const saved = this.loadGame4State();

        if (saved) {

            this.letters = saved.letters.map(letter => ({
                envelope: letter.envelope,
                color: letter.color
            }));

            this.sortedLetters = saved.sortedLetters;
            this.totalLetters = saved.totalLetters;
            this.timeLeft = saved.timeLeft;

        } else {

            const randomList =
                Phaser.Utils.Array.GetRandom(letterLists);

            this.letters = randomList.map(letter => ({
                envelope: letter.envelope,
                color: letter.color
            }));

            this.totalLetters = this.letters.length;
            this.sortedLetters = 0;
            this.timeLeft = 20;
        }

        const letterWidth = 350 * this.gameScale;
        const letterHeight = 250 * this.gameScale;

        const startLetterX = this.scale.width / 2 - letterWidth / 2;
        const startLetterY = this.scale.height * 0.6;

        this.letters.forEach((letter, index) => {

            letter.folder = letter.envelope;
            letter.startX = startLetterX;
            letter.startY = startLetterY;
            letter.locked = false;

            letter.sprite = this.add.rectangle(
                startLetterX,
                startLetterY,
                letterWidth,
                letterHeight,
                letter.color
            ).setOrigin(0);

            letter.sprite.setDepth(index);
        });

        this.activateTopLetter();
    }

    saveGame4State() {

        if (!this.letters) {
            return;
        }

        const data = {
            version: 1,

            letters: this.letters.map(letter => ({
                envelope: letter.envelope,
                color: letter.color
            })),

            sortedLetters: this.sortedLetters,
            totalLetters: this.totalLetters,
            timeLeft: this.timeLeft,

            savedAt: Date.now()
        };

        localStorage.setItem(
            GAME4_SAVE_KEY,
            JSON.stringify(data)
        );
    }

    loadGame4State() {

        const raw = localStorage.getItem(
            GAME4_SAVE_KEY
        );

        if (!raw) {
            return null;
        }

        try {

            return JSON.parse(raw);

        } catch (error) {

            console.warn(
                'Не удалось загрузить сохранение Game 4',
                error
            );

            localStorage.removeItem(
                GAME4_SAVE_KEY
            );

            return null;
        }
    }

    clearGame4Save() {

        localStorage.removeItem(
            GAME4_SAVE_KEY
        );
    }

    createCounter() {

        this.counterText = this.add.text(
            this.scale.width / 2,
            40 * this.gameScale,
            `${this.sortedLetters}/${this.totalLetters}`,
            {
                fontSize: `${36 * this.gameScale}px`,
                color: '#000000'
            }
        ).setOrigin(0.5);

    }

    createTimer() {

        if (this.timeLeft === undefined) {
            this.timeLeft = 5;
        }

        this.timerText = this.add.text(
            this.scale.width / 2,
            90 * this.gameScale,
            '',
            {
                fontSize: `${36 * this.gameScale}px`,
                color: '#000000'
            }
        ).setOrigin(0.5);

        this.updateTimerText();

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: this.updateTimer,
            callbackScope: this
        });

        this.saveGame4State();
    }

    updateTimer() {

        if (this.completed) {
            return;
        }

        this.timeLeft--;

        if (this.timeLeft <= 0) {

            this.timeLeft = 0;

            this.saveGame4State();
            this.updateTimerText();

            if (this.timerEvent) {
                this.timerEvent.remove(false);
            }

            this.loseGame();

            return;
        }

        this.updateTimerText();

        this.saveGame4State();
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

        this.counterText.setText(`${this.sortedLetters}/${this.totalLetters}`);

    }

    activateTopLetter() {

        this.letters.forEach(letter => {
            letter.sprite.disableInteractive();
            letter.locked = false;
        });

        if (this.letters.length === 0) {
            return;
        }

        const topLetter = this.letters[this.letters.length - 1];

        topLetter.sprite.setInteractive({
            draggable: true,
            useHandCursor: true
        });

        topLetter.sprite.setDepth(100);
    }

    createEnvelopes(){
        const sizeEnvelopes = 240;
        const envelopesWidthAndHeight = sizeEnvelopes * this.gameScale;
        const gap = 80 * this.gameScale;
        const widthContainer = envelopesWidthAndHeight * 4 + gap * 3;
        const startContainerX = this.scale.width / 2 - widthContainer / 2;
        const startContainerY = this.scale.height * 0.15;

        this.envelopes = [
            {
                id: 'pink',
                x: startContainerX + gap * 0,
                y: startContainerY,
                color: 0xff8181,
            },
            {
                id: 'blue',
                x: startContainerX + gap * 1 + envelopesWidthAndHeight * 1,
                y: startContainerY,
                color: 0x6e9cff
            },
            {
                id: 'yellow',
                x: startContainerX + gap * 2 + envelopesWidthAndHeight * 2,
                y: startContainerY,
                color: 0xf7ff87
            },
            {
                id: 'black',
                x: startContainerX + gap * 3 + envelopesWidthAndHeight * 3,
                y: startContainerY,
                color: 0x000000
            }
        ]

        this.envelopes.forEach(envelope => {
            envelope.sprite = this.add.rectangle(
                envelope.x,
                envelope.y,
                envelopesWidthAndHeight,
                envelopesWidthAndHeight,
                envelope.color
            ).setOrigin(0)
        });
    }

    setupDrag() {

        this.input.on('dragstart', (pointer, gameObject) => {

            const letter = this.letters.find(
                item => item.sprite === gameObject
            );

            if (!letter || letter.locked) {
                return;
            }

            gameObject.setDepth(200);
        });


        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {

            const letter = this.letters.find(
                item => item.sprite === gameObject
            );

            if (!letter || letter.locked) {
                return;
            }

            gameObject.x = dragX;
            gameObject.y = dragY;
        });


        this.input.on('dragend', (pointer, gameObject) => {

            const letter = this.letters.find(
                item => item.sprite === gameObject
            );

            if (!letter || letter.locked) {
                return;
            }

            const envelope = this.findZone(letter);

            if (envelope && envelope.id === letter.folder) {
                this.deleteLetter(letter);
            } else {
                this.returnLetter(letter);
            }
        });
    }

    findZone(letter) {

        const bounds = letter.sprite.getBounds();

        const centerX = bounds.centerX;
        const centerY = bounds.centerY;

        for (const envelope of this.envelopes) {

            const envelopeBounds =
                envelope.sprite.getBounds();

            if (
                envelopeBounds.contains(
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

        letter.locked = true;

        const sprite = letter.sprite;

        this.letters = this.letters.filter(
            item => item !== letter
        );

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
        return this.letters.length == 0;
    }

    finishGame() {

        if (this.completed) {
            return;
        }

        this.completed = true;

        this.shouldSave = false;

        this.clearGame4Save();

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            'Ура! Победа!\n\nДалее',
            {
                fontSize: '48px',
                color: '#ffffff',
                backgroundColor: '#000000',
                align: 'center',
                padding: {
                    x: 30,
                    y: 20
                }
            }
        )
        .setOrigin(0.5)
        .setInteractive({
            useHandCursor: true
        })
        .on('pointerdown', () => {

            window.VN.systems.finishMinigameAndAdvance(
                this,
                this.storySceneIndex,
                this.minigameId
            );

        });
    }

    loseGame() {

        if (this.completed) {
            return;
        }

        this.completed = true;

        this.shouldSave = false;

        this.clearGame4Save();

        if (this.timerEvent) {
            this.timerEvent.remove(false);
        }

        this.letters.forEach(letter => {
            if (letter.sprite) {
                letter.sprite.disableInteractive();
            }
        });

        const panelWidth = 700 * this.gameScale;
        const panelHeight = 400 * this.gameScale;

        this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            panelWidth,
            panelHeight,
            0xffffff
        )
        .setOrigin(0.5)
        .setDepth(101);

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 80 * this.gameScale,
            'Вы проиграли',
            {
                fontSize: `${52 * this.gameScale}px`,
                color: '#000000'
            }
        )
        .setOrigin(0.5)
        .setDepth(102);

        const restartButton = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2 + 80 * this.gameScale,
            380 * this.gameScale,
            90 * this.gameScale,
            0x555555
        )
        .setOrigin(0.5)
        .setInteractive({
            useHandCursor: true
        })
        .setDepth(102);


        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 80 * this.gameScale,
            'Начать игру заново',
            {
                fontSize: `${30 * this.gameScale}px`,
                color: '#ffffff'
            }
        )
        .setOrigin(0.5)
        .setDepth(103);

        restartButton.on('pointerdown', () => {
            this.restartGame();
        });
    }

    restartGame() {

        this.shouldSave = false;

        this.clearGame4Save();

        this.scene.restart({
            storySceneIndex: this.storySceneIndex,
            minigameId: this.minigameId
        });
    }

    clearGame4Save() {

        localStorage.removeItem(GAME4_SAVE_KEY);

    }

}