// import Phaser from 'phaser';

// Все координаты — в пикселях макета 1920×1080 (безопасная зона).
// Растягивание на экран и поля по краям — resource/systems/Layout.js.
import { THINGS } from './data/things.js';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export class GameScene2 extends Phaser.Scene {

    constructor() {
        super('GameScene2');
    }

    init(data) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
    }

    getAssetManifest() {
        const imagesPath = `${import.meta.env.BASE_URL}images/game2/`;
        return {
            images: [
                { key: 'background', url: `${imagesPath}background.png` },
                ...THINGS.flatMap((thing) => [
                    { key: `${thing.image}`, url: `${imagesPath}${thing.image}.png` },
                ]),
            ],
            audio: THINGS.map((thing) => thing.voice),
        };
    }

    preload() {
        if (window.VN?.systems.SceneAssets) {
            window.VN.systems.SceneAssets.preload(this);
            return;
        }
        window.VN?.systems.SceneAudio?.preload(this);
    }

    create() {
        window.VN?.systems.SceneAudio?.enter(this);
        this.layout = window.VN.systems.Layout;
        this.createBackground();
        this.createGameField();
        this.createZones();
        this.createElements();
        this.createButtonMenu();
        window.VN?.systems.SceneAssets?.prefetchNext(this);
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

    createGameField() {
        const width = BASE_WIDTH;
        const height = BASE_HEIGHT;
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
        const zoneWidth = 134;
        const zoneHeight = 126;

        this.zones = [
            {
                id: 'red',
                x: this.mapWidth * 0.4,
                y: BASE_HEIGHT * 0.2,
                color: 0xd12626
            },
            {
                id: 'green',
                x: this.mapWidth * 0.5,
                y: BASE_HEIGHT * 0.45,
                color: 0x8eb41b
            },
            {
                id: 'emerald',
                x: this.mapWidth * 0.7,
                y: BASE_HEIGHT * 0.4,
                color: 0x17937b
            },
            {
                id: 'blue',
                x: this.mapWidth * 0.6,
                y: BASE_HEIGHT * 0.8,
                color: 0x17249b
            },
            {
                id: 'purple',
                x: this.mapWidth * 0.9,
                y: BASE_HEIGHT * 0.6,
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

        this.scene.pause();

        this.scene.launch('PauseScene', {
            returnSceneKey: 'GameScene2'
        });

        this.scene.bringToTop('PauseScene');
    }

    // createElements() {
    //     const elementSize = 115;

    //     this.elements = [
    //         {
    //             id: 'element1',
    //             correctZone: 'red',
    //             color: 0xd12626
    //         },
    //         {
    //             id: 'element2',
    //             correctZone: 'blue',
    //             color: 0x17249b
    //         },
    //         {
    //             id: 'element3',
    //             correctZone: 'purple',
    //             color: 0x8d187f
    //         },
    //         {
    //             id: 'element4',
    //             correctZone: 'emerald',
    //             color: 0x17937b
    //         },
    //         {
    //             id: 'element5',
    //             correctZone: 'green',
    //             color: 0x8eb41b
    //         }
    //     ];

    //     const panelCenterX = this.panelX + (BASE_WIDTH - this.panelX) / 2;
    //     const gap = 40;
    //     const countElements = this.elements.length
    //     const totalHeight = elementSize * countElements + gap * (countElements - 1);
    //     const startY = (BASE_HEIGHT - totalHeight) / 2 + 0.08 * BASE_HEIGHT;
        
    //     this.elements.forEach((element, index) => {

    //         const square = this.add.rectangle(
    //             panelCenterX,
    //             startY + elementSize / 2 + index * (elementSize + gap),
    //             elementSize,
    //             elementSize,
    //             element.color
    //         );

    //         square.setInteractive({
    //             draggable: true
    //         });

    //         element.sprite = square;
    //         element.startX = square.x;
    //         element.startY = square.y;
    //     });

    //     this.setupDrag();
    // }
    createThings(){
        this.things = THINGS.map((data, index) => {
            const thing = {
                voice: window.VN.systems.AudioManager.add(this, data.voice),
                timer: null,
                width: data.width ?? BIRD_WIDTH,
                height: data.height ?? BIRD_HEIGHT,
                idleKey: `${data.image}_idle`,
                singKey: `${data.image}_sing`
            };

            bird.box = this.add.image(data.x, data.y, bird.idleKey)
                .setOrigin(0)
                .setDisplaySize(bird.width, bird.height);

            bird.box.setInteractive({ useHandCursor: true });
            bird.box.on('pointerdown', () => this.selectBird(index));

            this.stage.add(bird.box);

            return bird;
        });
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

    // showWinMessage() {

    //     this.add.text(
    //         BASE_WIDTH / 2,
    //         BASE_HEIGHT / 2,
    //         'Далее',
    //         {
    //             fontSize: '48px',
    //             color: '#ffffff',
    //             backgroundColor: '#000000',
    //             padding: {
    //                 x: 20,
    //                 y: 10
    //             }
    //         }
    //     ).setOrigin(0.5);
    // }

    showWinMessage() {

        // const button = this.add.text(
        //     BASE_WIDTH / 2,
        //     BASE_HEIGHT / 2,
        //     'Далее',
        //     {
        //         fontSize: '48px',
        //         color: '#ffffff',
        //         backgroundColor: '#000000',
        //         padding: {
        //             x: 20,
        //             y: 10
        //         }
        //     }
        // ).setOrigin(0.5);


        // button.setInteractive({
        //     useHandCursor: true
        // });


        window.VN.systems.finishMinigameAndAdvance(
            this,
            this.storySceneIndex,
            this.minigameId
        );
        // button.on('pointerdown', () => {


        // });
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
