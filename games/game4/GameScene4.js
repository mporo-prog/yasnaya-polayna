// import Phaser from 'phaser';

export class GameScene4 extends Phaser.Scene {

    constructor() {
        super('GameScene4');
    }

    init(data) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
    }

    create() {
        this.calculateScale();
        this.createBackground();
        this.createGameField();
        this.createEnvelopes();
        this.createButtonMenu();
        this.setupDrag();
        this.createLetters();
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
        const buttonX = this.panelX + (this.scale.width - this.panelX) - 0.06 * this.scale.width;

        this.add.rectangle(
            buttonX,
            10 * this.gameScale + buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            0x555555
        ).setOrigin(0)
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

        this.letters = [
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
        ];

    //     [
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'blue', color: 0x6e9cff }
    // ],

    // // Список 3
    // [
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'yellow', color: 0xf7ff87 },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'pink', color: 0xff8181 },
    //     { envelope: 'black', color: 0x000000 },
    //     { envelope: 'blue', color: 0x6e9cff },
    //     { envelope: 'yellow', color: 0xf7ff87 }
    // ]

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

}