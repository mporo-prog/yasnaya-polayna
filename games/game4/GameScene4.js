// import Phaser from 'phaser';

export class GameScene4 extends Phaser.Scene {

    constructor() {
        super('GameScene4');
    }

    init(data) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
    }

    preload() {
        this.load.image(
            'table',
            `${import.meta.env.BASE_URL}images/table.png`
        );
    }

    create() {
        this.calculateScale();
        this.createBackground();
        this.createGameField();
        this.createEnvelopes();
        this.createButtonMenu();
        this.setupDrag();

        this.letterTypes = [
            {
                color: 0xff5757,
                shape: "square",
                folder: 'red_square'
            },
            {
                color: 0x70ff80,
                shape: 'triangle',
                folder: 'green_triangle'
            },
            {
                color: 0x6e9cff,
                shape: 'circle',
                folder: 'blue_circle'
            },
            {
                color: 0xff5757,
                shape: 'circle',
                folder: null
            },
            {
                color: 0xff5757,
                shape: 'triangle',
                folder: null
            },
            // {
            //     color: 0x70ff80,
            //     shape: 'square',
            //     folder: null
            // },
            // {
            //     color: 0x70ff80,
            //     shape: 'circle',
            //     folder: null
            // },
            // {
            //     color: 0x6e9cff,
            //     shape: 'triangle',
            //     folder: null
            // }
        ];

        this.letters = [];
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
        this.mapWidth = width * 0.2;
        this.panelX = this.mapWidth;

        this.add.rectangle(
            0,
            0,
            this.mapWidth,
            height,
            0xffffff
        ).setOrigin(0);

        this.add.rectangle(
            this.panelX,
            0,
            width - this.panelX,
            height
        ).setOrigin(0);

        const table = this.add.image(
            this.panelX,
            0,
            'table'
        ).setOrigin(0)

        table.setDisplaySize(
            this.scale.width,
            this.scale.height
        );
    }

    createEnvelopes() {

        const sizeEnvelopes = 213;
        const envelopesWidth = sizeEnvelopes * this.gameScale;
        const gap = 80 * this.gameScale;
        const panelCenterX = this.panelX / 2 - envelopesWidth / 2;
        const totalHeight = envelopesWidth * 3 + gap * 2;
        const startY = (this.scale.height - totalHeight) / 2;
        const startYTriangle = envelopesWidth * 1.5 + gap;
        const startYCircle = envelopesWidth * 2 + gap * 2;

        this.envelopes = this.add.container(
            panelCenterX,
            startY
        );

        const square = this.add.rectangle(
            0,
            0,
            envelopesWidth,
            envelopesWidth,
            0xff5757
        ).setOrigin(0);
        square.id = "red_square";

        const triangle = this.add.triangle(
            envelopesWidth / 2,
            startYTriangle,
            0,
            -envelopesWidth / 2,
            -envelopesWidth / 2,
            envelopesWidth / 2,
            envelopesWidth / 2,
            envelopesWidth / 2,
            0x70ff80
        ).setOrigin(0);
        triangle.id = "green_triangle";

        const circle = this.add.circle(
            0,
            startYCircle,
            envelopesWidth/2,
            0x6e9cff
        ).setOrigin(0);
        circle.id = "blue_circle";

        this.envelopes.add([
            square,
            triangle,
            circle
        ]);
    }

    createLetters() {
    
        const startX = this.scale.width - this.mapWidth;

        const positions = [
            {
                x: startX * 0.65,
                y: this.scale.height * 0.12,
                empty: false
            },
            {
                x: startX * 0.45,
                y: this.scale.height * 0.2,
                empty: false
            },
            {
                x: startX * 0.8,
                y: this.scale.height * 0.4,
                empty: false
            },
            {
                x: startX * 1,
                y: this.scale.height * 0.6,
                empty: false
            },
            {
                x: startX * 1.15,
                y: this.scale.height * 0.45,
                empty: false
            },
            {
                x: startX * 0.9,
                y: this.scale.height * 0.2,
                empty: false
            }
        ];

        for (let i = 0; i < 6; i++) {
            const type = Phaser.Utils.Array.GetRandom(this.letterTypes);
            if(!positions[i].empty){
                this.createLetter(positions[i].x, positions[i].y, type);
                positions[i].empty = true;
            }
        }
    }

    createLetter(x, y, type) {
        const lettersSize = 164 * this.gameScale;
        let letter;

        if (type.shape == 'square') {
            letter = this.add.rectangle(
                x,
                y,
                lettersSize,
                lettersSize,
                type.color
            );
        }

        if (type.shape == 'triangle') {

            letter = this.add.triangle(
                x + lettersSize / 2,
                y + lettersSize / 2,
                0,
                -lettersSize / 2,
                -lettersSize / 2,
                lettersSize / 2,
                lettersSize / 2,
                lettersSize / 2,
                type.color
            );
        }

        if (type.shape == 'circle') {

            letter = this.add.circle(
                x,
                y,
                lettersSize / 2,
                type.color
            );
        }

        letter.setInteractive({
            draggable: true
        });

        this.letters.push({
            sprite: letter,
            color: type.color,
            shape: type.shape,
            folder: type.folder,
            locked: false,
            startX: letter.x,
            startY: letter.y
        });
    }

    setupDrag() {
        this.input.on('dragstart', (pointer, gameObject) => {
            const letter = this.letters.find(item => item.sprite == gameObject);

            if (!letter || letter.locked) {return;}
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            const letter = this.letters.find(item => item.sprite == gameObject);

            if (!letter || letter.locked) {return;}

            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragend', (pointer, gameObject) => {
            const letter = this.letters.find(item => item.sprite == gameObject);

            if (!letter || letter.locked) {return;}

            const envelope = this.findZone(gameObject);

            if (envelope && envelope.id == letter.folder) {
                this.deleteLetter(letter);
                // this.createLetter();
            }
            else {
                this.returnLetter(letter);
            }
        });
    }

    findZone(letter) {
        
        for (const envelope of this.envelopes.list) {

            const bounds = envelope.getBounds();

            if (bounds.contains(letter.x, letter.y)) {
                return envelope;
            }
        }

        return null;
    }

    // deleteLetter(letter) {
    //     const letterX = letter.startX;
    //     const letterY = letter.startY;
    //     const letterType = letter.shape;
    //     letter.locked = true;
    //     letter.sprite.destroy();
    //     this.createNewLetter(letterX, letterY, letterType);
    // }

    deleteLetter(letter) {

        const letterX = letter.startX;
        const letterY = letter.startY;

        letter.locked = true;

        letter.sprite.destroy();

        this.letters = this.letters.filter(
            item => item !== letter
        );

        if (this.checkGameFinished()) {
            this.finishGame();
            return;
        }

        this.createNewLetter(letterX, letterY);
    }

    createNewLetter(x, y, lastType) {
        const type = Phaser.Utils.Array.GetRandom(this.letterTypes);
        const lettersSize = 164 * this.gameScale;
        if(lastType == "triangle"){
            this.createLetter(x - lettersSize / 2, y - lettersSize / 2, type);
            return;
        }
        this.createLetter(x, y, type);
    }

    returnLetter(letter) {
        this.tweens.add({
            targets: letter.sprite,
            x: letter.startX,
            y: letter.startY,
            duration: 500,
            ease: 'Power2'
        });
    }

    checkGameFinished() {

        if (this.letters.length === 0) {
            return true;
        }

        const hasNormalLetters =
            this.letters.some(
                letter => letter.folder !== null
            );

        if (!hasNormalLetters) {
            return true;
        }

        return false;
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