// import Phaser from 'phaser';
import { ITEMS } from './data/items.js';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const BACKGROUND_TEXTURE = 'game3-background';
const READY_ITEMS = ITEMS.filter(({ panel, image }) => panel && image);
// const BASE_WIDTH = window.innerWidth;
// const BASE_HEIGHT = window.innerHeight;

// Общий UI — тот же макет 1920×1080, что и в GameScene1.
const PAUSE_BUTTON = {
    xFrac: 100 / BASE_WIDTH,
    yFrac: 90 / BASE_HEIGHT,
    size: 110,
    texture: 'images/icon_UI/pause_button.webp'
};

const HINT_NEXT_ARROW = {
    xFrac: 1600 / BASE_WIDTH,
    yFrac: 825 / BASE_HEIGHT,
    size: 150,
    texture: 'images/icon_UI/next_button.webp'
};

const INSTRUCTION_PANEL = {
    xFrac: 310 / BASE_WIDTH,
    yFrac: 251 / BASE_HEIGHT,
    width: 1300,
    height: 577.04,
    texture: 'images/icon_UI/text_bg.webp'
};

// Картинка — подложка заголовков в настройках и «Авторах»; размер прежний.
const ITEM_NAME_PANEL = {
    xFrac: 39.58333 / 100,
    yFrac: 81.48148 / 100,
    width: 477,
    height: 136,
    texture: 'images/icon_UI/result_message_panel.webp'
};

const COLOR_BACKGROUND = 0xffffff;
const COLOR_OVERLAY = 0x000000;
const OVERLAY_ALPHA = 0.6;

const FONT_FAMILY = 'Inter, sans-serif';

const INSTRUCTION_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontStyle: 'normal',
    fontSize: '64px',
    color: '#6E6056',
    letterSpacing: 0,
    wordWrap: { width: INSTRUCTION_PANEL.width * (1 - 160 / 1300) }
};

// Экран победы: небольшой заголовок и интересный факт.
const WIN_TITLE = 'Игра пройдена!';
const WIN_FACT = 'В возрасте 55 лет граф Толстой стал вегетарианцем – он полностью отказался от мяса, но не от яиц и молочных продуктов. Завтрак писателя, как правило, состоял из одного яйца всмятку, которое он распускал в небольшом стаканчике, куда крошил несколько кусочков белого хлеба; потом съедал небольшую порцию гречневой каши';

const WIN_TITLE_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontSize: '48px',
    color: '#6E6056',
    align: 'center'
};

const WIN_FACT_TEXT_STYLE = {
    fontFamily: 'Ysabeau',
    fontSize: '40px',
    color: '#1B1A19',
    align: 'center',
    lineSpacing: 2,
    wordWrap: { width: INSTRUCTION_PANEL.width - 200 }
};

// Время показа подсказок; можно переопределить через hintDurationSeconds в данных сцены.
const DEFAULT_HINT_DURATION_SECONDS = 2;
// Сколько неправильный предмет остаётся на экране с нажатой подложкой.
const WRONG_ITEM_REMOVE_DELAY = 2000;
// Звучит после озвучки названия неправильного предмета.
const WRONG_SOUND = 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay3_nevernyi_vybor.mp3';

export class GameScene3 extends Phaser.Scene {

    constructor() {
        super('GameScene3');
    }

    init(data = {}) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
        this.hintDurationSeconds = Number.isFinite(data.hintDurationSeconds) && data.hintDurationSeconds >= 0
            ? data.hintDurationSeconds
            : DEFAULT_HINT_DURATION_SECONDS;
    }

    getAssetManifest() {
        return {
            images: [
                { key: BACKGROUND_TEXTURE, url: `${import.meta.env.BASE_URL}images/game3/background.webp` },
                ...[PAUSE_BUTTON, HINT_NEXT_ARROW, INSTRUCTION_PANEL, ITEM_NAME_PANEL].map(({ texture }) => ({
                    key: texture,
                    url: `${import.meta.env.BASE_URL}${texture}`
                })),
                ...[...new Set(READY_ITEMS.flatMap(({ panel, hoverPanel, clickPanel, image }) =>
                    [panel, hoverPanel, clickPanel, image].filter(Boolean)
                ))].map(name => ({
                    key: `game3-${name}`,
                    url: `${import.meta.env.BASE_URL}images/game3/${name}.webp`
                }))
            ],
            audio: [...READY_ITEMS.map(({ voice }) => voice).filter(Boolean), WRONG_SOUND]
        };
    }

    preload() {
        if (window.VN?.systems.SceneAssets) {
            window.VN.systems.SceneAssets.preload(this);
            return;
        }
        const assets = this.getAssetManifest();
        for (const { key, url } of assets.images) this.load.image(key, url);
        window.VN?.systems.SceneAudio?.preload(this);
        for (const path of assets.audio) window.VN?.systems.AudioManager?.load(this, path);
    }

    create() {
        this.sceneAudio = null;
        this.started = false;
        this.paused = false;
        this.finished = false;
        this.completed = false;
        this.arrivedCount = 0;
        this.activeHint = null;

        this.layout = window.VN.systems.Layout;
        this.createBackground();
        this.createItems();
        this.createItemNamePanel();
        this.createPauseOverlay();
        this.createPauseButton();
        this.createWinOverlay();
        this.createIntroOverlay();
        this.setupInput();
        window.VN?.systems.SceneAssets?.prefetchNext(this);
    }

    createBackground() {
        this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);

        // Сохраняем весь макет и поднос в кадре; поля заполняет Layout.
        this.background = this.layout.addBackground(this, BACKGROUND_TEXTURE, {
            keep: new Phaser.Geom.Rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT)
        });
    }

    createItems() {
        this.items = READY_ITEMS.map(data => {
            const item = {
                id: data.id,
                voice: data.voice ?? null,
                label: data.label,
                panelTexture: `game3-${data.panel}`,
                hoverPanelTexture: `game3-${data.hoverPanel ?? data.panel}`,
                clickPanelTexture: data.clickPanel ? `game3-${data.clickPanel}` : null,
                tablePosition: data.tablePosition,
                correct: data.correct ?? null,
                placed: false,
                removed: false
            };

            // Без setDisplaySize: оба PNG имеют исходные размеры в координатах макета.
            item.box = this.add.image(0, 0, item.panelTexture).setOrigin(0.5);
            item.panelWidth = item.box.width;
            item.panelHeight = item.box.height;
            item.image = this.add.image(0, 0, `game3-${data.image}`).setOrigin(0.5);
            const x = BASE_WIDTH * data.xFrac + item.box.width / 2;
            const y = BASE_HEIGHT * data.yFrac + item.box.height / 2;
            item.container = this.add.container(x, y, [item.box, item.image]);
            this.background.stage.add(item.container);

            item.box.setInteractive({ useHandCursor: true });
            item.box.on('pointerover', (pointer) => {
                // Сенсорное наведение не меняет название до нажатия.
                if (!pointer.wasTouch && !this.itemNameTouchQuery?.matches) {
                    this.showItemName(item, pointer);
                }
            });
            item.box.on('pointerout', () => this.hideItemName(item));
            item.box.on('pointerdown', (pointer) => {
                this.showItemName(item, pointer);
                this.selectItem(item);
            });

            return item;
        });

        this.rowItems = [...this.items];
    }

    createItemNamePanel() {
        this.itemNameTouchQuery = window.matchMedia?.('(pointer: coarse)');
        this.itemNameTouchMode = Boolean(this.itemNameTouchQuery?.matches);
        this.hoveredItem = null;

        const { width, height } = ITEM_NAME_PANEL;
        const panel = this.add.image(0, 0, ITEM_NAME_PANEL.texture).setOrigin(0).setDisplaySize(width, height);
        this.itemNameText = this.add.text(width / 2, height / 2, 'НАЖМИ НА ПРЕДМЕТ', {
            fontFamily: 'Ysabeau',
            fontStyle: 'normal',
            fontSize: '36px',
            color: '#04151F',
            align: 'center',
            letterSpacing: 0,
            wordWrap: { width: width * 0.86, useAdvancedWrap: true }
        }).setOrigin(0.5);

        // Размер PNG остаётся исходным; координаты — от макета 1920×1080.
        this.itemNamePanel = this.add.container(
            BASE_WIDTH * ITEM_NAME_PANEL.xFrac,
            BASE_HEIGHT * ITEM_NAME_PANEL.yFrac,
            [panel, this.itemNameText]
        ).setVisible(this.itemNameTouchMode);
        this.background.stage.add(this.itemNamePanel);

        const updateLineHeight = () => this.itemNameText.setLineSpacing(
            36 - this.itemNameText.style.metrics.fontSize
        );
        updateLineHeight();
        const fonts = globalThis.document?.fonts;
        fonts?.addEventListener('loadingdone', updateLineHeight);

        const clearHover = () => this.hideItemName();
        const updatePointerMode = () => {
            this.itemNameTouchMode = this.itemNameTouchQuery.matches;
            clearHover();
        };
        this.itemNameTouchQuery?.addEventListener('change', updatePointerMode);
        this.input.on('gameout', clearHover);
        this.events.on('pause', clearHover);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            fonts?.removeEventListener('loadingdone', updateLineHeight);
            this.itemNameTouchQuery?.removeEventListener('change', updatePointerMode);
            this.input.off('gameout', clearHover);
            this.events.off('pause', clearHover);
        });
    }

    showItemName(item, pointer) {
        if (!this.started || this.paused || this.finished || this.activeHint || item.placed || item.removed) {
            return;
        }
        this.clearItemHover();
        this.itemNameTouchMode = Boolean(pointer?.wasTouch || this.itemNameTouchQuery?.matches);
        this.hoveredItem = this.itemNameTouchMode ? null : item;
        if (this.hoveredItem) {
            // Экспорт зелёной подложки может иметь другой размер: геометрию карточки сохраняем.
            item.box.setTexture(item.hoverPanelTexture).setDisplaySize(item.panelWidth, item.panelHeight);
        }
        this.itemNameText.setText(item.label.toLocaleUpperCase('ru-RU'));
        this.itemNamePanel.setVisible(true);
    }

    clearItemHover() {
        const item = this.hoveredItem;
        if (item) {
            item.box.setTexture(item.panelTexture).setDisplaySize(item.panelWidth, item.panelHeight);
        }
        this.hoveredItem = null;
    }

    hideItemName(item) {
        if (item && this.hoveredItem !== item) return;
        this.clearItemHover();
        this.itemNamePanel.setVisible(this.itemNameTouchMode);
    }

    selectItem(item) {
        if (!this.started || this.paused || this.finished || this.activeHint) {
            return;
        }

        if (item.placed || item.removed || typeof item.correct !== 'boolean') {
            return;
        }

        this.playItemVoice(item);

        if (item.correct) {
            this.placeItem(item);
        } else {
            this.removeItem(item);
        }
    }

    /** Озвучка названия; у неправильного предмета после неё — звук ошибки. */
    playItemVoice(item) {
        const audio = window.VN?.systems.AudioManager;
        if (!audio) return;
        // Новое нажатие обрывает предыдущую озвучку, чтобы реплики не накладывались.
        this.itemVoice?.destroy();
        this.itemVoice = null;
        const playWrong = () => {
            if (!item.correct) this.safeSound(() => audio.play(this, WRONG_SOUND));
        };
        const voice = item.voice ? this.safeSound(() => audio.play(this, item.voice)) : null;
        if (!voice) {
            playWrong();
            return;
        }
        this.itemVoice = voice;
        voice.once('complete', () => {
            if (this.itemVoice === voice) this.itemVoice = null;
            playWrong();
        });
        voice.once('destroy', () => {
            if (this.itemVoice === voice) this.itemVoice = null;
        });
    }

    safeSound(action) {
        try {
            return action();
        } catch (error) {
            console.warn('[GameScene3]', error.message);
            return null;
        }
    }

    placeItem(item) {
        item.placed = true;
        this.hideItemName(item);
        item.box.disableInteractive().setVisible(false);
        this.rowItems = this.rowItems.filter(other => other !== item);
        this.background.stage.bringToTop(item.container);
        this.background.stage.bringToTop(this.itemNamePanel);

        // Задана позиция угла самого предмета; контейнер и PNG имеют центр в (0, 0).
        const x = BASE_WIDTH * item.tablePosition.xFrac + item.image.width / 2;
        const y = BASE_HEIGHT * item.tablePosition.yFrac + item.image.height / 2;

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
    }

    removeItem(item) {
        item.removed = true;
        this.rowItems = this.rowItems.filter(other => other !== item);
        this.hideItemName(item);
        item.box.disableInteractive();

        // Неправильный предмет: подложка в состоянии click, через 2 секунды предмет исчезает.
        if (item.clickPanelTexture) {
            item.box.setTexture(item.clickPanelTexture).setDisplaySize(item.panelWidth, item.panelHeight);
        }

        this.tweens.killTweensOf(item.container);

        this.time.delayedCall(WRONG_ITEM_REMOVE_DELAY, () => {
            this.tweens.add({
                targets: item.container,
                alpha: 0,
                duration: 250,
                ease: 'Power2',
                onComplete: () => item.container.destroy()
            });
        });
    }

    checkCompletion() {
        // Пока список пуст или ответы не назначены всем предметам, победы нет.
        const correctTotal = this.items.filter(item => item.correct === true).length;
        if (this.finished || correctTotal === 0 || this.items.length !== ITEMS.length ||
            this.items.some(item => typeof item.correct !== 'boolean') ||
            this.arrivedCount < correctTotal) {
            return;
        }

        this.finished = true;
        this.showHint(this.winOverlay, () => this.finishGame(), null);
    }

    createPauseButton() {
        const x = BASE_WIDTH * PAUSE_BUTTON.xFrac;
        const y = BASE_HEIGHT * PAUSE_BUTTON.yFrac;
        const button = this.add.image(x, y, PAUSE_BUTTON.texture)
            .setDisplaySize(PAUSE_BUTTON.size, PAUSE_BUTTON.size)
            .setDepth(20)
            .setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => {
            window.VN?.systems.AudioManager?.click?.(this);
            this.openPauseMenu();
        });

        // Размер и привязка к левому верхнему углу — общие для всех сцен.
        this.layout.pinPauseButton(this, button);
    }

    showHint(overlay, onDismiss, durationSeconds = this.hintDurationSeconds) {
        this.clearHint();
        this.hideItemName();
        overlay.setVisible(true);

        this.activeHint = {
            overlay,
            onDismiss,
            // durationSeconds = null — экран ждёт нажатия.
            timer: durationSeconds == null
                ? null
                : this.time.delayedCall(durationSeconds * 1000, () => this.dismissHint())
        };
    }

    clearHint() {
        if (!this.activeHint) {
            return;
        }

        this.activeHint.timer?.remove();
        this.activeHint.overlay.setVisible(false);
        this.activeHint = null;
    }

    dismissHint() {
        const hint = this.activeHint;
        if (!hint || (hint.waitForAudio && this.sceneAudio?.hasActiveSounds)) {
            return;
        }

        this.clearHint();
        hint.onDismiss();
    }

    update() {
        if (!this.paused && this.activeHint?.waitForAudio) {
            this.dismissHint();
        }
    }

    createOverlay(text, onClick, { panel: panelConfig = null, textStyle = {}, lineHeight = null } = {}) {
        const background = this.add.rectangle(
            0,
            0,
            BASE_WIDTH,
            BASE_HEIGHT,
            COLOR_OVERLAY,
            OVERLAY_ALPHA
        ).setOrigin(0);

        const label = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2, text, {
            fontFamily: FONT_FAMILY,
            fontSize: '40px',
            color: '#ffffff',
            align: 'center',
            ...textStyle
        }).setOrigin(0.5);

        if (lineHeight !== null) {
            const updateLineHeight = () => label.setLineSpacing(lineHeight - label.style.metrics.fontSize);
            updateLineHeight();
            const fonts = globalThis.document?.fonts;
            fonts?.addEventListener('loadingdone', updateLineHeight);
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                fonts?.removeEventListener('loadingdone', updateLineHeight);
            });
        }

        background.setInteractive({ useHandCursor: Boolean(onClick) });

        const elements = [background];
        if (panelConfig) {
            const panel = this.add.image(0, 0, panelConfig.texture)
                .setOrigin(0)
                .setDisplaySize(panelConfig.width, panelConfig.height);
            elements.push(panel);
            this.layout.onLayout(this, (visible) => {
                // Плашка — от центра экрана, как в макете (не от краёв).
                const { x, y } = this.layout.fromCenter(
                    visible, BASE_WIDTH * panelConfig.xFrac, BASE_HEIGHT * panelConfig.yFrac
                );
                panel.setPosition(x, y);
                label.setPosition(x + panelConfig.width / 2, y + panelConfig.height / 2);
            });
        }
        elements.push(label);

        if (onClick) {
            const onPress = () => {
                window.VN?.systems.AudioManager?.click?.(this);
                onClick();
            };
            background.on('pointerdown', onPress);

            // Как в GameScene1: клик принимает вся подложка, стрелка обозначает переход.
            const nextArrow = this.add.image(0, 0, HINT_NEXT_ARROW.texture)
                .setOrigin(0)
                .setDisplaySize(HINT_NEXT_ARROW.size, HINT_NEXT_ARROW.size)
                .setInteractive({ useHandCursor: true });
            nextArrow.on('pointerdown', onPress);
            elements.push(nextArrow);
            this.layout.onLayout(this, (visible) => this.layout.placeNextArrow(this, nextArrow, visible));
        }

        const overlay = this.add.container(0, 0, elements).setDepth(10).setVisible(false);

        // Затемнение закрывает фон и предметы; кнопка паузы остаётся доступна сверху.
        this.layout.fill(this, background);

        return overlay;
    }

    createPauseOverlay() {
        this.pauseOverlay = this.createOverlay('Пауза');
    }

    createWinOverlay() {
        this.winOverlay = this.createOverlay(
            WIN_FACT,
            () => this.dismissHint(),
            { panel: INSTRUCTION_PANEL, textStyle: WIN_FACT_TEXT_STYLE }
        );
        this.addWinTitle(this.winOverlay);
    }

    /** Небольшой заголовок «Игра пройдена!» над фактом на той же плашке. */
    addWinTitle(overlay) {
        const [, panel] = overlay.list;
        const fact = overlay.list.find(object => object.type === 'Text');
        const title = this.add.text(0, 0, WIN_TITLE, WIN_TITLE_TEXT_STYLE).setOrigin(0.5);
        overlay.add(title);
        // Срабатывает после раскладки плашки в createOverlay().
        this.layout.onLayout(this, () => {
            title.setPosition(panel.x + panel.displayWidth / 2, panel.y + 120);
            fact.setPosition(panel.x + panel.displayWidth / 2, panel.y + panel.displayHeight / 2 + 45);
        });
    }

    createIntroOverlay() {
        this.introOverlay = this.createOverlay(
            'Собери завтрак графа Толстого',
            () => {
                // Правила закрываются только нажатием; «далее» обрывает озвучку рассказчика.
                this.unlockAudio();
                this.sceneAudio?.stopSounds?.();
                this.dismissHint();
            },
            { panel: INSTRUCTION_PANEL, textStyle: INSTRUCTION_TEXT_STYLE, lineHeight: 64 }
        );

        this.showHint(this.introOverlay, () => this.startGame(), null);
        this.sceneAudio = window.VN?.systems.SceneAudio?.enter(this);
        this.unlockAudio();
    }

    unlockAudio() {
        const context = this.sound?.context;
        if (context?.state === 'suspended') {
            context.resume();
        }
    }

    startGame() {
        this.started = true;
        this.introOverlay.setVisible(false);
    }

    openPauseMenu() {
        this.scene.launch('PauseScene', {
            returnSceneKey: 'GameScene3'
        });

        this.scene.pause();

        this.scene.bringToTop('PauseScene');
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
        this.input.keyboard.on('keydown-ESC', () => this.openPauseMenu());

        // Подстройку под размер экрана делает Layout (подписка и отписка — внутри).
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearHint();
        });
    }
}
