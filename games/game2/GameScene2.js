import { THINGS } from './data/things.js';
import { TARGETS } from './data/targets.js';
import {
    BASE_WIDTH,
    BASE_HEIGHT,
    TARGET_SIZE,
    ITEM_SIZE,
    PAUSE_BUTTON,
    MESSAGE_PANELS,
    MESSAGE_FONT_SIZE,
    NEXT_BUTTON
} from './constants/Game2Constants.js';
import { Thing } from './models/Thing.js';
import { Target } from './models/Target.js';
import { Game2Matcher } from './systems/Game2Matcher.js';
import { Game2Audio } from './systems/Game2Audio.js';
import { Game2PanelLayout } from './systems/Game2PanelLayout.js';

export class GameScene2 extends Phaser.Scene {

    // constructor() {
    //     super('GameScene2');

    //     this.matcher = new Game2Matcher();
    //     this.audio = new Game2Audio(this);

    //     this.things = [];
    //     this.targets = [];
    //     this.completed = false;
    // }

    constructor() {
        super('GameScene2');

        // Отдельный класс отвечает только
        // за проверку соответствия предмета и target.
        this.matcher = new Game2Matcher();
        this.audio = new Game2Audio(this);

        this.things = [];
        this.targets = [];

        // Игра ещё не закончена.
        this.completed = false;

        // Три состояния Game 2:
        // rules → game → win
        this.phase = 'rules';

        // Объекты, связанные с озвучкой правил.
        this.rulesVoice = null;
        this.rulesTimer = null;

        // Элементы экрана правил.
        this.rulesOverlay = null;
        this.rulesPanel = null;
        this.rulesText = null;
        this.rulesNextButton = null;

        // Элементы экрана победы.
        this.winOverlay = null;
        this.winPanel = null;
        this.winText = null;
        this.winNextButton = null;
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
                    key: 'game2-instruction-panel',
                    url: `${uiPath}instruction_panel.png`
                },
                {
                    key: 'game2-next',
                    url: `${uiPath}next_button.png`
                },
                {
                    key: 'game2-pause',
                    url: `${uiPath}pause_button.png`
                }
            ],

            audio: [...THINGS.map((thing) => thing.sound), 'voice_and_sound/gameplay_scene_2_rasskazchik_all.wav', 'voice_and_sound/gameplay2_neverniy_vybor.wav']
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

        if (window.VN?.systems.AudioManager) {
        assets.audio.forEach((path) => {
            window.VN.systems.AudioManager.load(
                this,
                path
            );
        });
    }
    }

    create() {
        this.layout =
            window.VN?.systems.Layout || null;

        window.VN?.systems.SceneAudio?.enter(this);

        this.createBackground();
        this.createTargets();
        this.createPauseButton();
        this.createThings();
        this.createPanelLayout();

        // Сначала создаём overlay.
        this.createRulesOverlay();
        this.createWinOverlay();

        this.setupDrag();

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            this.shutdown,
            this
        );

        this.events.on(
            Phaser.Scenes.Events.RESUME,
            this.handleResume,
            this
        );

        window.VN?.systems.SceneAssets?.prefetchNext(this);

        // И только ПОСЛЕ создания overlay
        // показываем правила.
        this.showRulesScreen();
    }

    handleResume() {
        // Если вернулись из паузы во время правил —
        // запускаем озвучку правил заново.
        if (this.phase === 'rules') {
            this.showRulesScreen();
        }
    }

    createMessageOverlay(config, heading, message, onNext) {
        const panelWidth = BASE_WIDTH * config.widthFrac;
        const panelHeight = BASE_HEIGHT * config.heightFrac;
        const panelTop = -panelHeight / 2;
        const textWidth = panelWidth * config.textWidthFrac;
        const style = {
            fontFamily: 'Philosopher',
            fontStyle: 'normal',
            fontSize: `${MESSAGE_FONT_SIZE}px`,
            color: config.color,
            align: 'center',
            lineSpacing: config.lineSpacing,
            wordWrap: { width: textWidth }
        };

        // Дети используют координаты своей плашки, а весь экран — координаты макета.
        const panel = this.add.image(0, 0, 'game2-instruction-panel')
            .setOrigin(0.5)
            .setDisplaySize(panelWidth, panelHeight);
        const title = this.add.text(0, panelTop + panelHeight * config.titleYFrac, heading, style)
            .setOrigin(0.5);
        const text = this.add.text(0, panelTop + panelHeight * config.textYFrac, message, style)
            .setOrigin(0.5);
        const nextButton = this.add.image(
            BASE_WIDTH * (NEXT_BUTTON.xFrac - 0.5),
            BASE_HEIGHT * (NEXT_BUTTON.yFrac - 0.5),
            'game2-next'
        ).setDisplaySize(NEXT_BUTTON.size, NEXT_BUTTON.size);

        // Правила заканчиваются после озвучки; на победе стрелка доступна для нажатия.
        if (onNext) {
            nextButton.setInteractive({ useHandCursor: true });
            nextButton.on('pointerup', onNext);
        }

        const overlay = this.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2, [
            panel, title, text, nextButton
        ]).setDepth(2100).setVisible(false);

        this.layout?.onLayout(this, (visible, ui) => {
            // Один масштаб для всей композиции сохраняет пропорции текста и картинок.
            overlay.setPosition(ui.centerX, ui.centerY).setScale(Math.min(
                1, ui.width / BASE_WIDTH, ui.height / BASE_HEIGHT
            ));
        });

        return { overlay, panel, text, nextButton };
    }

    createRulesOverlay() {
        const { overlay, panel, text, nextButton } = this.createMessageOverlay(
            MESSAGE_PANELS.rules,
            'Правила игры',
            'Распредели предметы на карте усадьбы.'
        );
        this.rulesOverlay = overlay;
        this.rulesPanel = panel;
        this.rulesText = text;
        this.rulesNextButton = nextButton;
    }

    createWinOverlay() {
        const { overlay, panel, text, nextButton } = this.createMessageOverlay(
            MESSAGE_PANELS.win,
            'Игра пройдена!',
            'Все предметы нашли свои места.',
            () => this.finishGame()
        );
        this.winOverlay = overlay;
        this.winPanel = panel;
        this.winText = text;
        this.winNextButton = nextButton;
    }

    createBackground() {
        if (this.layout) {
            this.background = this.layout.addBackground(
                this,
                'game2-background',
                // Карта и её зоны сохраняются целиком при любых пропорциях окна.
                { keep: new Phaser.Geom.Rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT) }
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
        })
        .setDepth(1100);

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

            // Перетаскивание разрешено
            // только во время основной игры.
            if (
                this.phase !== 'game' ||
                !thing ||
                thing.isLocked()
            ) {
                return;
            }

            this.tweens.killTweensOf(gameObject);
            thing.dragging = true;
            gameObject.setDepth(100);
        };

        this.onDrag = (
            pointer,
            gameObject,
            dragX,
            dragY
        ) => {
            const thing =
                gameObject.getData('thing');

            if (
                this.phase !== 'game' ||
                !thing ||
                thing.isLocked()
            ) {
                return;
            }

            gameObject.setPosition(
                dragX,
                dragY
            );
        };

        this.onDragEnd = (
            pointer,
            gameObject
        ) => {
            const thing =
                gameObject.getData('thing');

            if (thing) thing.dragging = false;

            if (
                this.phase !== 'game' ||
                !thing ||
                thing.isLocked()
            ) {
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

        this.input.on(
            'dragstart',
            this.onDragStart
        );

        this.input.on(
            'drag',
            this.onDrag
        );

        this.input.on(
            'dragend',
            this.onDragEnd
        );
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
        // Больше нельзя перетащить этот предмет.
        thing.lock();

        thing.sprite.disableInteractive();

        this.tweens.add({
            targets: thing.sprite,

            // Перетаскиваемый предмет исчезает.
            alpha: 0,

            duration: 180,

            onComplete: () => {
                thing.sprite.destroy();
                thing.sprite = null;

                // Полупрозрачный target
                // становится полностью видимым.
                target.reveal();

                // Проигрывается звук именно этого предмета.
                //
                // Например:
                // book → game2_book.wav
                // hat  → game2_hat.wav
                window.VN?.systems.AudioManager?.play(
                    this,
                    thing.sound
                );

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

        // Если ещё не все предметы
        // размещены правильно — ничего не делаем.
        if (!done) {
            return;
        }

        // Все предметы правильно размещены.
        // Показываем экран победы.
        this.showWinScreen();
    }

   openPauseMenu() {
        // После завершения игры пауза больше не нужна.
        if (this.completed) {
            return;
        }

        // Если сейчас идут правила —
        // перед паузой полностью останавливаем их озвучку.
        if (this.phase === 'rules') {
            this.pauseRulesVoice();
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

    pauseRulesVoice() {
        // Если озвучки сейчас нет — ничего не делаем.
        if (!this.rulesVoice) {
            return;
        }

        // Останавливаем запасной таймер.
        if (this.rulesTimer) {
            this.rulesTimer.remove();
            this.rulesTimer = null;
        }

        // Полностью останавливаем текущую озвучку.
        this.rulesVoice.stop();
        this.rulesVoice.destroy();
        this.rulesVoice = null;
    }

    shutdown() {
        this.stopRulesVoice();

        this.events.off(
            Phaser.Scenes.Events.RESUME,
            this.handleResume,
            this
        );

        this.input.off('dragstart', this.onDragStart);
        this.input.off('drag', this.onDrag);
        this.input.off('dragend', this.onDragEnd);
    }

    startGameAfterRules() {
        // Останавливаем всё,
        // что осталось от озвучки правил.
        this.stopRulesVoice();

        // Скрываем экран правил.
        if (this.rulesOverlay) {
            this.rulesOverlay.setVisible(false);
        }

        this.restoreGameScene();

        // Возвращаем возможность нажимать паузу.
        if (this.pauseButton) {
            this.pauseButton.setInteractive({
                useHandCursor: true
            })
            .setDepth(2000);
        }

        // Теперь разрешено взаимодействовать
        // с предметами.
        this.phase = 'game';
    }

    stopRulesVoice() {
        // Удаляем запасной таймер.
        if (this.rulesTimer) {
            this.rulesTimer.remove();
            this.rulesTimer = null;
        }

        // Останавливаем и уничтожаем объект озвучки.
        if (this.rulesVoice) {
            this.rulesVoice.stop();
            this.rulesVoice.destroy();
            this.rulesVoice = null;
        }
    }

    showRulesScreen() {
        // Пока показываем правила,
        // игра находится в состоянии "rules".
        this.phase = 'rules';

        this.dimGameScene();

        // Показываем экран.
        this.rulesOverlay.setVisible(true);

        // На всякий случай останавливаем предыдущую озвучку.
        this.stopRulesVoice();

        // Если AudioManager отсутствует,
        // не блокируем игрока навсегда.
        if (!window.VN?.systems.AudioManager) {
            this.startGameAfterRules();
            return;
        }

        // Получаем загруженный звук правил.
        this.rulesVoice =
            window.VN.systems.AudioManager.add(
                this,
                'voice_and_sound/gameplay_scene_2_rasskazchik_all.wav'
            );

        // Когда озвучка закончилась,
        // автоматически запускаем игру.
        const finishRules = () => {
            this.startGameAfterRules();
        };

        this.rulesVoice.once(
            'complete',
            finishRules
        );

        // Запускаем озвучку.
        this.rulesVoice.play();

        /*
        * Запасной таймер.
        *
        * Если браузер по какой-то причине
        * не вызовет событие complete,
        * игра всё равно продолжится.
        */
        const duration =
            Math.max(
                4000,
                (this.rulesVoice.totalDuration || 0) * 1000 + 500
            );

        this.rulesTimer =
            this.time.delayedCall(
                duration,
                finishRules
            );
    }

    showWinScreen() {
        // Если уже показываем победу,
        // повторно её не создаём.
        if (this.completed) {
            return;
        }

        // Теперь игра находится
        // в состоянии "win".
        this.phase = 'win';

        // Запрещаем перетаскивание предметов.
        this.things.forEach((thing) => {
            if (thing.sprite) {
                thing.sprite.disableInteractive();
            }
        });

        // Показываем экран победы.
        this.winOverlay.setVisible(true);
    }

    finishGame() {
        if (this.completed) {
            return;
        }

        this.completed = true;

        // Передаём управление общей системе
        // перехода между сценами.
        window.VN?.systems.finishMinigameAndAdvance?.(
            this,
            this.storySceneIndex,
            this.minigameId
        );
    }

    dimGameScene() {
        /*
        * Делаем уже существующие элементы игры
        * полупрозрачными.
        *
        * Никакого дополнительного чёрного
        * прямоугольника не создаём.
        */

        // Фон + targets находятся внутри stage.
        if (this.stage) {
            this.stage.setAlpha(0.45);
        }

        // Панель с предметами.
        if (this.panel) {
            this.panel.setAlpha(0.45);
        }

        // Все перетаскиваемые предметы.
        this.things.forEach((thing) => {
            if (thing.sprite) {
                thing.sprite.setAlpha(0.45);
            }
        });

        /*
        * Кнопку паузы НЕ затемняем.
        * Она должна оставаться полностью видимой
        * и доступной.
        */
        if (this.pauseButton) {
            this.pauseButton.setAlpha(1);
            this.pauseButton.setDepth(2000);
        }
    }

    restoreGameScene() {
        /*
        * Возвращаем обычную прозрачность
        * всем элементам игры после экрана правил.
        */

        if (this.stage) {
            this.stage.setAlpha(1);
        }

        if (this.panel) {
            this.panel.setAlpha(1);
        }

        this.things.forEach((thing) => {
            if (thing.sprite) {
                thing.sprite.setAlpha(1);
            }
        });

        // Пауза всегда полностью видима.
        if (this.pauseButton) {
            this.pauseButton.setAlpha(1);
            this.pauseButton.setDepth(2000);
        }
    }
}
