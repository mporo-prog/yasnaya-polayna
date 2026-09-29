import { THINGS } from './data/things.js';
import { TARGETS } from './data/targets.js';
import {
    BASE_WIDTH,
    BASE_HEIGHT,
    TARGET_SIZE,
    ITEM_SIZE,
    PAUSE_BUTTON
} from './constants/Game2Constants.js';
import { Thing } from './models/Thing.js';
import { Target } from './models/Target.js';
import { Game2Matcher } from './systems/Game2Matcher.js';
import { Game2Audio } from './systems/Game2Audio.js';
import { Game2PanelLayout } from './systems/Game2PanelLayout.js';

export class GameScene2 extends Phaser.Scene {

    constructor() {
        super('GameScene2');

        this.matcher = new Game2Matcher();
        this.audio = new Game2Audio(this);

        this.things = [];
        this.targets = [];
        this.completed = false;
    }

    init(data = {}) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
    }

    getAssetManifest() {
        const imagesPath =
            `${import.meta.env.BASE_URL}images/game2/`;
        const uiPath =
            `${import.meta.env.BASE_URL}images/icon_UI/`;

        return {
            images: [
                {
                    key: 'game2-background',
                    url: `${imagesPath}background.png`
                },
                ...THINGS.map((thing) => ({
                    key: `game2-${thing.image}`,
                    url: `${imagesPath}${thing.image}.png`
                })),
                {
                    key: 'game2-pause',
                    url: `${uiPath}pause_button.png`
                }
            ],

            audio: [...THINGS.map((thing) => thing.sound), 'voice_and_sound/gameplay2_neverniy_vybor.wav']
        };
    }

    preload() {
        if (window.VN?.systems.SceneAssets) {
            window.VN.systems.SceneAssets.preload(this);
            return;
        }

        // Отдельная страница games/game2/index.html.
        const assets = this.getAssetManifest();

        assets.images.forEach(({ key, url }) => {
            this.load.image(key, url);
        });
    }

    create() {
        this.layout = window.VN?.systems.Layout || null;

        window.VN?.systems.SceneAudio?.enter(this);

        this.createBackground();
        this.createTargets();
        this.createPauseButton();
        this.createThings();
        this.createPanelLayout();
        this.setupDrag();

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            this.shutdown,
            this
        );

        window.VN?.systems.SceneAssets?.prefetchNext(this);
    }

    createBackground() {
        if (this.layout) {
            this.background = this.layout.addBackground(
                this,
                'game2-background'
            );
            this.stage = this.background.stage;
            return;
        }

        this.background = this.add.image(
            BASE_WIDTH / 2,
            BASE_HEIGHT / 2,
            'game2-background'
        ).setDisplaySize(
            BASE_WIDTH,
            BASE_HEIGHT
        );

        this.stage = this.add.container(0, 0);
        this.stage.add(this.background);
    }

    createTargets() {
        this.targets = TARGETS.map((data) => {
            const target = new Target(data);
            const thing = THINGS.find(
                (item) => item.targetId === target.id
            );

            if (!thing) {
                return target;
            }

            target.createSprite(
                this,
                `game2-${thing.image}`,
                TARGET_SIZE
            );

            this.stage.add(target.sprite);

            return target;
        });
    }

    createThings() {
        this.things = THINGS.map((data) => {
            return new Thing(
                data,
                `game2-${data.image}`
            );
        });
    }

    createPauseButton() {
        this.pauseButton = this.add.image(
            0,
            0,
            'game2-pause'
        );

        this.pauseButton.setDisplaySize(
            PAUSE_BUTTON.width,
            PAUSE_BUTTON.height
        );

        this.pauseButton.setInteractive({
            useHandCursor: true
        });

        this.pauseButton.on(
            'pointerdown',
            () => this.openPauseMenu()
        );
    }

    createPanelLayout() {
        this.panelLayout = new Game2PanelLayout(
            this,
            this.things,
            this.pauseButton
        );

        this.panel = this.panelLayout.createPanel();

        this.things.forEach((thing) => {
            if (!thing.sprite) {
                thing.createSprite(
                    this,
                    this.pauseButton.x,
                    this.pauseButton.y,
                    ITEM_SIZE
                );
            }
        });

        // Layout.onLayout() сразу расставляет предметы.
        this.panelLayout.update(
            this.layout
                ? this.layout.getUiRect(this)
                : {
                    x: 0,
                    y: 0,
                    width: BASE_WIDTH,
                    height: BASE_HEIGHT,
                    right: BASE_WIDTH,
                    bottom: BASE_HEIGHT,
                    top: 0,
                    left: 0
                }
        );
    }

    setupDrag() {
        this.onDragStart = (pointer, gameObject) => {
                const thing =
                    gameObject.getData('thing');

                if (!thing || thing.isLocked()) {
                    return;
                }

                this.audio.unlock();

                gameObject.setDepth(100);
        };

        this.onDrag = (pointer, gameObject, dragX, dragY) => {
                const thing =
                    gameObject.getData('thing');

                if (!thing || thing.isLocked()) {
                    return;
                }

                gameObject.setPosition(
                    dragX,
                    dragY
                );
        };

        this.onDragEnd = (pointer, gameObject) => {
                const thing =
                    gameObject.getData('thing');

                if (!thing || thing.isLocked()) {
                    return;
                }

                this.handleDrop(
                    thing,
                    {
                        x: pointer.worldX,
                        y: pointer.worldY
                    }
                );
        };

        this.input.on('dragstart', this.onDragStart);
        this.input.on('drag', this.onDrag);
        this.input.on('dragend', this.onDragEnd);
    }

    handleDrop(thing, point) {
        const target = this.findMatchingTarget(
            thing,
            point
        );

        if (!target) {
            this.returnThing(thing);
            return;
        }

        this.placeThing(
            thing,
            target
        );
    }

    findMatchingTarget(thing, point) {
        return this.matcher.findMatchingTarget(
            thing,
            point,
            this.targets
        );
    }

    placeThing(thing, target) {
        thing.lock();
        thing.sprite.disableInteractive();

        this.tweens.add({
            targets: thing.sprite,
            alpha: 0,
            duration: 180,
            onComplete: () => {
                thing.sprite.destroy();
                thing.sprite = null;

                target.reveal();
                window.VN?.systems.AudioManager?.play(this, thing.sound);

                this.checkCompletion();
            }
        });
    }

    returnThing(thing) {
        window.VN?.systems.AudioManager?.play(this, 'voice_and_sound/gameplay2_neverniy_vybor.wav');

        this.tweens.add({
            targets: thing.sprite,
            x: thing.startX,
            y: thing.startY,
            duration: 500,
            ease: 'Power2'
        });

        thing.sprite.setDepth(1);
    }

    checkCompletion() {
        if (this.completed) {
            return;
        }

        const done = this.things.every(
            (thing) => thing.isLocked()
        );

        if (!done) {
            return;
        }

        this.completed = true;

        window.VN?.systems.finishMinigameAndAdvance?.(
            this,
            this.storySceneIndex,
            this.minigameId
        );
    }

    openPauseMenu() {
        if (this.completed) {
            return;
        }

        this.scene.pause();

        this.scene.launch(
            'PauseScene',
            {
                returnSceneKey: 'GameScene2'
            }
        );

        this.scene.bringToTop(
            'PauseScene'
        );
    }

    shutdown() {
        this.input.off('dragstart', this.onDragStart);
        this.input.off('drag', this.onDrag);
        this.input.off('dragend', this.onDragEnd);
    }
}
