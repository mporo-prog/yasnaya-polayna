import Phaser from 'phaser';

export class GameScene2 extends Phaser.Scene {

    constructor() {
        super('GameScene2');
    }

    create() {
        this.calculateScale();
        this.createBackground();
        this.createGameField();
        this.createZones();
        this.createElements();
        this.createButtonMenu();
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

    createGameField() {
        const width = this.scale.width;
        const height = this.scale.height;
        this.mapWidth = width * 0.9;
        this.panelX = this.mapWidth;

        this.add.rectangle(
            0,
            0,
            this.mapWidth,
            height
        ).setOrigin(0);

        this.add.rectangle(
            this.panelX,
            0,
            width - this.panelX,
            height
        ).setOrigin(0);
    }

    createZones() {
        const zoneWidth = 134 * this.gameScale;
        const zoneHeight = 126 * this.gameScale;

        this.zones = [
            {
                id: 'red',
                x: this.mapWidth * 0.4,
                y: this.scale.height * 0.2,
                color: 0xd12626
            },
            {
                id: 'green',
                x: this.mapWidth * 0.5,
                y: this.scale.height * 0.45,
                color: 0x8eb41b
            },
            {
                id: 'emerald',
                x: this.mapWidth * 0.7,
                y: this.scale.height * 0.4,
                color: 0x17937b
            },
            {
                id: 'blue',
                x: this.mapWidth * 0.6,
                y: this.scale.height * 0.8,
                color: 0x17249b
            },
            {
                id: 'purple',
                x: this.mapWidth * 0.9,
                y: this.scale.height * 0.6,
                color: 0x8d187f
            }
        ];

        this.zones.forEach(zone => {
            this.add.rectangle(
                zone.x,
                zone.y,
                zoneWidth,
                zoneHeight,
                zone.color
            );
        });
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

    createElements() {
        const elementSize = 115 * this.gameScale;

        this.elements = [
            {
                id: 'element1',
                correctZone: 'red',
                color: 0xd12626
            },
            {
                id: 'element2',
                correctZone: 'blue',
                color: 0x17249b
            },
            {
                id: 'element3',
                correctZone: 'purple',
                color: 0x8d187f
            },
            {
                id: 'element4',
                correctZone: 'emerald',
                color: 0x17937b
            },
            {
                id: 'element5',
                correctZone: 'green',
                color: 0x8eb41b
            }
        ];

        const panelCenterX = this.panelX + (this.scale.width - this.panelX) / 2;
        const gap = 40 * this.gameScale;
        const countElements = this.elements.length
        const totalHeight = elementSize * countElements + gap * (countElements - 1);
        const startY = (this.scale.height - totalHeight) / 2 + 0.08 * this.scale.height;
        
        this.elements.forEach((element, index) => {

            const square = this.add.rectangle(
                panelCenterX,
                startY + elementSize / 2 + index * (elementSize + gap),
                elementSize,
                elementSize,
                element.color
            );

            square.setInteractive({
                draggable: true
            });

            element.sprite = square;
            element.startX = square.x;
            element.startY = square.y;
        });

        this.setupDrag();
    }

    setupDrag() {

        this.input.on('dragstart', (pointer, gameObject) => {

            const element = this.elements.find(item => item.sprite == gameObject);

            if (element.locked) {return;}
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {

            const element = this.elements.find(item => item.sprite == gameObject);

            if (element.locked) {return;}

            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragend', (pointer, gameObject) => {

            const element = this.elements.find(item => item.sprite == gameObject);

            const zone = this.findZone(gameObject);

            if (zone && zone.id == element.correctZone) {
                this.placeElement(element, zone);
            } else {
                this.returnElement(element);
            }
        });
    }

    findZone(gameObject) {

        return this.zones.find(zone => {

            const distance = Phaser.Math.Distance.Between(
                gameObject.x,
                gameObject.y,
                zone.x,
                zone.y
            );

            return distance < 40;
        });
    }

    placeElement(element, zone) {

        element.sprite.x = zone.x;
        element.sprite.y = zone.y;
        
        element.sprite.disableInteractive();

        element.locked = true;

        element.sprite.setFillStyle(0xffffff);

        this.checkCompletion();
    }

    checkCompletion() {

        const completed = this.elements.every(
            element => element.locked
        );

        if (completed) {
            this.showWinMessage();
        }
    }

    showWinMessage() {

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            'Далее',
            {
                fontSize: '48px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: {
                    x: 20,
                    y: 10
                }
            }
        ).setOrigin(0.5);
    }

    returnElement(element) {

        this.tweens.add({
            targets: element.sprite,
            x: element.startX,
            y: element.startY,
            duration: 500,
            ease: 'Power2'
        });
    }
}