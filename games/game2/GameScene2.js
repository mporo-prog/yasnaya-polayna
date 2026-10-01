import { THINGS } from './data/things.js';
import { TARGETS } from './data/targets.js';
import {
    BASE_WIDTH,
    BASE_HEIGHT,
    TARGET_SIZE,
    ITEM_SIZE,
    PAUSE_BUTTON,
    INFO_PANEL,
    MESSAGE_PANELS,
    NEXT_BUTTON
} from './constants/Game2Constants.js';

// Текст плашки с правилами в начале игры.
const RULES_TEXT = 'Распредели предметы на карте усадьбы';

// Когда все предметы на местах: дневник пульсирует, внизу — реплика
// рассказчика (текст проявляется под озвучку, как в сюжете), затем по
// «далее» — плашка победы с интересным фактом.
const WIN_TITLE = 'Игра пройдена!';
const WIN_TEXT = 'Толстой любил пешие путешествия и не отказывался от них даже после 50–60 лет. В 1880-е годы он трижды ходил пешком из Москвы в Ясную Поляну';
const OUTRO_SPEAKER = 'РАССКАЗЧИК';
const OUTRO_TEXT = 'Дневник графа Толстого мог оказаться в любом месте, но свой самый важный последний дневник Лев Николаевич никому не показывал, даже жене, и хранил в сапоге';

// Озвучка рассказчика: правила и реплика про дневник — отдельные файлы.
const RULES_VOICE = 'voice_and_sound/scene2_gameplay2/gameplay_scene_2_rasskazchik.wav';
const OUTRO_VOICE = 'voice_and_sound/scene2_gameplay2/gameplay_scene_2_rasskazchik2.wav';
const WRONG_SOUND = 'voice_and_sound/scene2_gameplay2/GAMEPLAY2_NEW/gameplay2_neverniy_vybor.wav';
// Нажатие на предмет на панели.
const PICK_SOUND = 'voice_and_sound/scene2_gameplay2/GAMEPLAY2_NEW/gameplay3_nazhatie_na_object.wav';

// Предмет-«обманка», который пульсирует в конце игры.
const DIARY_ID = 'dnevnik';
const DIARY_PULSE = { scale: 1.15, duration: 600 };

// Цвета реплики, как в сюжете: ещё не проговорённый и проговорённый текст.
const OUTRO_TEXT_PENDING_COLOR = '#9A8D82';
const OUTRO_TEXT_COLOR = '#1B1A19';
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

        // Состояния Game 2:
        // rules → game → outro (реплика про дневник) → win
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
                    url: `${uiPath}text_bg.png`
                },
                {
                    key: 'game2-next',
                    url: `${uiPath}next_button.png`
                },
                {
                    key: 'game2-info-panel',
                    url: `${uiPath}dialog_text_bg.png`
                },
                {
                    key: 'game2-pause',
                    url: `${uiPath}pause_button.png`
                }
            ],

            audio: [
                ...THINGS.map((thing) => thing.sound).filter(Boolean),
                RULES_VOICE, OUTRO_VOICE, WRONG_SOUND, PICK_SOUND
            ]
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
        // Phaser переиспользует объект сцены при повторном запуске.
        this.completed = false;
        this.outroVoice = null;
        this.outroReveal = null;
        this.diaryPulse = null;

        window.VN?.systems.SceneAudio?.enter(this);

        this.createBackground();
        this.createTargets();
        this.createPauseButton();
        this.createThings();
        this.createPanelLayout();
        this.createInfoPanel();

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

    update() {
        // Часы сцены: в меню паузы они стоят, как и проявление текста.
        this.updateOutroReveal(this.time.now);
    }

    /**
     * Проигрывает озвучку рассказчика. Возвращает звук или null,
     * если аудио недоступно.
     */
    playNarrator(path) {
        const audio = window.VN?.systems.AudioManager;
        if (!audio) return null;
        try {
            const sound = audio.add(this, path);
            sound.play();
            return sound;
        } catch (error) {
            console.warn('[GameScene2]', error.message);
            return null;
        }
    }

    /**
     * Плашка поверх игры: картинка-рамка, её содержимое (children — в
     * координатах относительно центра плашки) и стрелка «далее». Вся
     * композиция стоит по центру экрана и уменьшается на узких экранах.
     */
    createMessageOverlay(config, children, onNext) {
        const panelWidth = BASE_WIDTH * config.widthFrac;
        const panelHeight = BASE_HEIGHT * config.heightFrac;

        // Дети используют координаты своей плашки, а весь экран — координаты макета.
        const panel = this.add.image(0, 0, 'game2-instruction-panel')
            .setOrigin(0.5)
            .setDisplaySize(
                panelWidth,
                panelHeight
            );

        const nextButton = this.add.image(
            BASE_WIDTH * (NEXT_BUTTON.xFrac - 0.5),
            BASE_HEIGHT * (NEXT_BUTTON.yFrac - 0.5),
            'game2-next'
        ).setDisplaySize(NEXT_BUTTON.size, NEXT_BUTTON.size);

        // И правила, и победа закрываются отдельным кликом.
        if (onNext) {
            nextButton.setInteractive({ useHandCursor: true });
            this.bindPanelClick(nextButton, onNext);
        }

        const overlay = this.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2, [
            panel, ...children, nextButton
        ]).setDepth(2100).setVisible(false);

        this.layout?.onLayout(this, (visible, ui) => {
            // Один масштаб для всей композиции сохраняет пропорции текста и картинок.
            const scale = Math.min(1, ui.width / BASE_WIDTH, ui.height / BASE_HEIGHT);
            // По центру экрана, как плашки остальных игр.
            overlay.setPosition(visible.centerX, visible.centerY).setScale(scale);
            // Стрелка — общего для всех сцен размера и места, независимо
            // от масштаба плашки (координаты переводим в систему контейнера).
            const size = this.layout.buttonSize(this, 'next') / scale;
            const center = this.layout.nextArrowCenter(visible);
            nextButton
                .setDisplaySize(size, size)
                .setPosition((center.x - overlay.x) / scale, (center.y - overlay.y) / scale);
        });

        return { overlay, panel, nextButton };
    }

    // Отпускание после перетаскивания или предыдущей плашки не считается кликом.
    bindPanelClick(object, onClick) {
        let pressedPointer = null;
        object.on('pointerdown', (pointer) => { pressedPointer = pointer.id; });
        object.on('pointerout', () => { pressedPointer = null; });
        object.on('pointerup', (pointer) => {
            const clicked = pressedPointer === pointer.id;
            pressedPointer = null;
            if (clicked) onClick();
        });
    }

    createRulesOverlay() {
        const config = MESSAGE_PANELS.rules;

        // Текст правил — без заголовка, как в остальных играх.
        const text = this.add
            .text(0, 0, RULES_TEXT, {
                fontFamily: 'Philosopher',
                fontSize: '64px',
                color: '#6E6056',
                align: 'center',
                wordWrap: {
                    width: BASE_WIDTH * config.widthFrac - 160
                }
            })
            .setOrigin(0.5);

        // Правила закрываются только нажатием: «далее» или сама плашка
        // сразу запускают игру и обрывают озвучку рассказчика.
        const skipRules = () => {
            if (this.phase !== 'rules') return;
            this.playClick();
            this.startGameAfterRules();
        };
        const { overlay, panel, nextButton } = this.createMessageOverlay(config, [text], skipRules);
        this.bindPanelClick(panel.setInteractive({ useHandCursor: true }), skipRules);
        this.rulesOverlay = overlay;
        this.rulesPanel = panel;
        this.rulesText = text;
        this.rulesNextButton = nextButton;
    }

    createWinOverlay() {
        // Небольшой заголовок «Игра пройдена!» и интересный факт под ним.
        const title = this.add
            .text(0, -130, WIN_TITLE, {
                fontFamily: 'Philosopher',
                fontSize: '48px',
                color: '#6E6056',
                align: 'center'
            })
            .setOrigin(0.5);

        const text = this.add
            .text(0, 35, WIN_TEXT, {
                fontFamily: 'Ysabeau',
                fontSize: '40px',
                color: '#1B1A19',
                align: 'center',
                lineSpacing: 2,
                wordWrap: {
                    width: 1050
                }
            })
            .setOrigin(0.5);

        // Плашка победы — последний экран игры: «далее» или нажатие на
        // плашку ведут дальше по сюжету.
        const finishFromWin = () => {
            if (this.phase !== 'win' || this.completed) return;
            this.playClick();
            this.finishGame();
        };
        const { overlay, panel, nextButton } = this.createMessageOverlay(
            MESSAGE_PANELS.win,
            [title, text],
            finishFromWin
        );
        this.bindPanelClick(panel.setInteractive({ useHandCursor: true }), finishFromWin);

        // Тёмный оверлей на весь экран, как на победных экранах остальных
        // игр (чёрный, 60% непрозрачности): под плашкой, над картой и
        // предметами; пауза (depth 2000) остаётся поверх. Нажатие на него —
        // тоже переход дальше.
        this.winDim = this.add
            .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.6)
            .setOrigin(0)
            .setDepth(1500)
            .setVisible(false)
            .setInteractive({ useHandCursor: true });
        this.bindPanelClick(this.winDim, finishFromWin);
        if (this.layout) {
            this.layout.fill(this, this.winDim);
        }

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
                {
                    keep: new Phaser.Geom.Rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT),
                    // Поля у края заполняет деревянная стена справа от карты — без зеркал.
                    fillFrom: new Phaser.Geom.Rectangle(1150, 0, BASE_WIDTH - 1150, BASE_HEIGHT)
                }
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
            () => {
                this.playClick();
                this.openPauseMenu();
            }
        );

        // Размер и привязка к левому верхнему углу — общие для всех сцен.
        this.layout?.pinPauseButton(this, this.pauseButton);
    }

    createPanelLayout() {
        this.things.forEach((thing) => {
            if (!thing.sprite) {
                thing.createSprite(
                    this,
                    thing.slot.x,
                    thing.slot.y,
                    ITEM_SIZE
                );
                thing.sprite.setDepth(1);
                // Нажатие на иконку показывает её название и описание.
                thing.sprite.on('pointerdown', () => {
                    if (this.phase !== 'game') return;
                    window.VN?.systems.AudioManager?.play(this, PICK_SOUND);
                    this.showThingInfo(thing);
                });
            }
        });

        // С общим Layout паузу ставит Layout.pinPauseButton (createPauseButton).
        this.panelLayout = new Game2PanelLayout(
            this,
            this.things,
            this.layout ? null : this.pauseButton
        );
    }

    /**
     * Плашка с названием и описанием предмета — та же картинка и
     * раскладка, что у реплики в сюжетной сцене: название слева от
     * вертикальной черты, описание справа. Скрыта до первого нажатия.
     */
    createInfoPanel() {
        // Позиции и размеры — в layoutInfoPanel() (компьютер / телефон).
        this.infoBackground = this.add.image(0, 0, 'game2-info-panel').setOrigin(0);
        this.infoName = this.add
            .text(0, 0, '', {
                fontFamily: 'Philosopher',
                color: '#6E6056',
                align: 'center'
            })
            .setOrigin(0.5);

        const textStyle = { fontFamily: 'Ysabeau', color: '#1B1A19', lineSpacing: 4 };
        this.infoDescription = this.add.text(0, 0, '', textStyle).setOrigin(0, 0);
        // Верхний слой реплики рассказчика: «проговорённая» часть текста
        // растёт поверх светлого слоя по мере озвучки (как в сюжете).
        this.infoDescriptionRevealed = this.add
            .text(0, 0, '', { ...textStyle, color: OUTRO_TEXT_COLOR })
            .setOrigin(0, 0)
            .setVisible(false);
        // «Далее» реплики рассказчика — появляется в конце игры.
        this.outroNextButton = this.add.image(0, 0, 'game2-next')
            .setInteractive({ useHandCursor: true })
            .setVisible(false);
        this.bindPanelClick(this.outroNextButton, () => this.onOutroNext());

        this.infoPanel = this.add
            .container(0, 0, [
                this.infoBackground, this.infoName, this.infoDescription,
                this.infoDescriptionRevealed, this.outroNextButton
            ])
            .setDepth(5)
            .setVisible(false);

        if (this.layout) {
            this.layout.onLayout(this, (visible, ui) => this.layoutInfoPanel(ui));
        } else {
            this.layoutInfoPanel(null);
        }
    }

    /**
     * Раскладка плашки предмета / реплики рассказчика. На компьютере — по
     * макету игры (INFO_PANEL), на телефоне — как диалоговая плашка сюжета
     * (Layout.dialogueLayout): тот же размер, место и шрифты.
     */
    infoPanelLayout(ui) {
        if (ui && this.layout?.isCompact(this)) {
            const L = this.layout.dialogueLayout(this, ui);
            // dialogueLayout считает от низа макета 1080 — переводим в координаты экрана.
            const dy = ui.bottom - BASE_HEIGHT;
            return {
                panel: { ...L.panel, y: L.panel.y + dy },
                name: { x: L.name.x, y: L.name.y + dy, originY: 0, wrap: L.name.wrap, size: L.name.size, minSize: L.name.minSize, style: 'normal' },
                text: { x: L.text.x, top: L.text.y + dy, wrap: L.text.wrap, outroWrap: L.text.wrap, maxHeight: L.text.maxHeight, size: L.text.size, minSize: L.text.minSize },
                next: { ...L.next, y: L.next.y + dy }
            };
        }
        const { x, y, width, height } = INFO_PANEL;
        const centerY = y + height / 2;
        // Название — посередине между рамкой (x≈32 из 1592) и чертой (x≈400).
        const nameLeft = x + width * (32 / 1592);
        const nameRight = x + width * (400 / 1592);
        // Вертикальная черта нарисована в картинке на x≈437 из 1589.
        const textX = x + width * (437 / 1589) + 65;
        // «Далее» — на правом краю плашки, как в сюжетной сцене.
        const nextSize = this.layout?.buttonSize(this, 'next') ?? 150;
        const next = { x: x + width - 30, y: centerY, size: nextSize };
        return {
            panel: { x, y, width, height },
            name: { x: (nameLeft + nameRight) / 2, y: centerY, originY: 0.5, wrap: nameRight - nameLeft - 40, size: 48, minSize: 32, style: 'bold' },
            text: {
                x: textX, top: null, wrap: x + width - textX - 90,
                outroWrap: next.x - next.size / 2 - 30 - textX,
                maxHeight: height - 50, size: 34, minSize: 28
            },
            next
        };
    }

    layoutInfoPanel(ui) {
        const L = this.infoPanelLayout(ui);
        this.infoLayout = L;
        this.infoBackground.setPosition(L.panel.x, L.panel.y).setDisplaySize(L.panel.width, L.panel.height);
        this.infoName
            .setOrigin(0.5, L.name.originY)
            .setPosition(L.name.x, L.name.y)
            .setFontStyle(L.name.style)
            .setWordWrapWidth(L.name.wrap);
        this.outroNextButton.setPosition(L.next.x, L.next.y).setDisplaySize(L.next.size, L.next.size);
        this.fitInfoText();
    }

    /**
     * Подгоняет имя и текст под плашку (шрифт уменьшается, если не влезает)
     * и ставит текст: на телефоне — от верхней точки, как в сюжете, на
     * компьютере — по центру высоты плашки. Оба слоя реплики — с одной точки.
     */
    fitInfoText() {
        const L = this.infoLayout;
        if (!L) return;
        const fit = (text, size, minSize, tooBig) => {
            text.setFontSize(size);
            while (size > minSize && tooBig()) {
                size -= 2;
                text.setFontSize(size);
            }
        };
        fit(this.infoName, L.name.size, L.name.minSize, () => this.infoName.width > L.name.wrap);

        const outro = this.phase === 'outro' || this.phase === 'win';
        const layers = [this.infoDescription, this.infoDescriptionRevealed];
        layers.forEach((text) => text.setWordWrapWidth(outro ? L.text.outroWrap : L.text.wrap));
        fit(this.infoDescription, L.text.size, L.text.minSize, () => this.infoDescription.height > L.text.maxHeight);
        this.infoDescriptionRevealed.setFontSize(this.infoDescription.style.fontSize);

        const top = L.text.top ?? L.panel.y + (L.panel.height - this.infoDescription.height) / 2;
        layers.forEach((text) => text.setPosition(L.text.x, top));

        // Реплика переносится заново — проявленную часть пересчитываем.
        if (outro && this.outroReveal) {
            this.outroReveal.text = this.infoDescription.getWrappedText(OUTRO_TEXT).join('\n');
        } else if (outro) {
            this.infoDescriptionRevealed.setText(this.infoDescription.getWrappedText(OUTRO_TEXT).join('\n'));
        }
    }

    showThingInfo(thing) {
        this.infoName.setText(thing.name || '');
        this.infoDescription.setText(thing.description || '');
        this.fitInfoText();
        this.infoPanel.setVisible(true);
    }

    /**
     * Места и размер иконок предметов. На компьютере — по макету (slot),
     * на телефоне — примерно вдвое крупнее, той же сеткой (3 сверху,
     * 2 снизу между ними) справа от карты и над плашкой предмета.
     */
    itemPlacement(ui) {
        if (!ui || !this.layout?.isCompact(this)) return null;
        const panelTop = this.infoPanelLayout(ui).panel.y;
        // Правый край карты на фоне — x≈1120 из 1920.
        const mapRight = this.stage.x + 1120 * this.stage.scaleX;
        const left = mapRight + 30;
        const right = ui.right - 30;
        const top = ui.top + 40;
        const bottom = panelTop - 30;
        const cellW = (right - left) / 3;
        const cellH = (bottom - top) / 2;
        const size = Math.min(ITEM_SIZE * 2, cellW - 24, cellH - 24);
        return {
            size,
            slots: this.things.map((thing, index) => (index < 3
                ? { x: left + cellW * (index + 0.5), y: top + cellH * 0.5 }
                : { x: left + cellW * (index - 2), y: top + cellH * 1.5 }))
        };
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
                if (thing.sound) {
                    window.VN?.systems.AudioManager?.play(
                        this,
                        thing.sound
                    );
                }

                this.checkCompletion();
            }
        });
    }

    returnThing(thing) {
        window.VN?.systems.AudioManager?.play(this, WRONG_SOUND);

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

        // Предмету-«обманке» (targetId: null) места на карте нет.
        const done = this.things.every(
            (thing) => !thing.targetId || thing.isLocked()
        );

        // Если ещё не все предметы
        // размещены правильно — ничего не делаем.
        if (!done) {
            return;
        }

        // Все предметы правильно размещены: дневник пульсирует,
        // рассказчик говорит о нём, затем — плашка победы.
        this.showOutro();
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

        // Реплика рассказчика не должна звучать поверх меню паузы:
        // обрываем её и сразу показываем текст целиком.
        if (this.phase === 'outro' && this.outroReveal) {
            this.stopOutroVoice();
            this.finishOutroReveal();
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
        this.stopOutroVoice();
        this.outroReveal = null;
        this.diaryPulse = null;

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

        // Озвучка правил — отдельный файл рассказчика.
        // Игра начнётся только по нажатию «далее».
        this.rulesVoice = this.playNarrator(RULES_VOICE);
    }

    showWinScreen() {
        // Если уже показываем победу,
        // повторно её не создаём.
        if (this.completed || this.phase === 'win') {
            return;
        }

        // Теперь игра находится
        // в состоянии "win".
        this.phase = 'win';

        // Реплика рассказчика закончилась — убираем её и пульсацию дневника.
        this.stopOutroVoice();
        this.stopDiaryPulse();
        this.infoPanel.setVisible(false);

        // Показываем экран победы поверх тёмного оверлея. Он закрывается
        // только нажатием («далее», плашка или оверлей) — дальше по сюжету.
        this.winDim.setVisible(true);
        this.winOverlay.setVisible(true);
    }

    playClick() {
        window.VN?.systems.AudioManager?.click?.(this);
    }

    /**
     * Все предметы на местах: дневник начинает пульсировать, внизу — плашка
     * рассказчика, текст которой проявляется под озвучку (как в сюжете).
     * «Далее» во время озвучки сразу дописывает реплику, после неё —
     * открывает плашку победы.
     */
    showOutro() {
        if (this.phase === 'outro' || this.completed) {
            return;
        }
        this.phase = 'outro';

        // Предметы больше не трогаются; заблокированные Game2PanelLayout
        // не двигает при смене размера экрана, поэтому пульсация не сбивается.
        this.things.forEach((thing) => {
            thing.lock();
            thing.sprite?.disableInteractive();
        });
        this.startDiaryPulse();

        // Место «далее», переносы и шрифт — в layoutInfoPanel()/fitInfoText().
        this.outroNextButton.setVisible(true);
        this.infoName.setText(OUTRO_SPEAKER);
        this.infoDescription.setColor(OUTRO_TEXT_PENDING_COLOR).setText(OUTRO_TEXT);
        this.infoDescriptionRevealed.setText('').setVisible(true);
        this.fitInfoText();
        this.infoDescriptionRevealed.setText('');
        this.infoPanel.setVisible(true);

        this.outroVoice = this.playNarrator(OUTRO_VOICE);
        if (!this.outroVoice) {
            this.finishOutroReveal();
            return;
        }
        this.outroVoice.once('complete', () => this.finishOutroReveal());
        this.outroReveal = {
            text: this.infoDescription.getWrappedText(OUTRO_TEXT).join('\n'),
            start: this.time.now,
            // Текст дописывается чуть раньше конца записи — как в сюжете.
            duration: Math.max(0.5, this.outroVoice.duration - 0.6) * 1000
        };
    }

    /** Побуквенное проявление реплики рассказчика синхронно с озвучкой. */
    updateOutroReveal(time) {
        const reveal = this.outroReveal;
        if (!reveal) return;
        const ratio = Phaser.Math.Clamp((time - reveal.start) / reveal.duration, 0, 1);
        const revealed = reveal.text.slice(0, Math.floor(ratio * reveal.text.length));
        if (revealed !== this.infoDescriptionRevealed.text) {
            this.infoDescriptionRevealed.setText(revealed);
        }
    }

    /** Реплика показана целиком (озвучка закончилась, её пропустили или её нет). */
    finishOutroReveal() {
        this.outroReveal = null;
        this.infoDescriptionRevealed.setText(this.infoDescription.getWrappedText(OUTRO_TEXT).join('\n'));
    }

    onOutroNext() {
        if (this.phase !== 'outro') return;
        this.playClick();
        // Во время озвучки первое нажатие только дописывает реплику.
        if (this.outroReveal) {
            this.stopOutroVoice();
            this.finishOutroReveal();
            return;
        }
        this.showWinScreen();
    }

    stopOutroVoice() {
        if (!this.outroVoice) return;
        this.outroVoice.stop();
        this.outroVoice.destroy();
        this.outroVoice = null;
    }

    startDiaryPulse() {
        const diary = this.things.find((thing) => thing.id === DIARY_ID)?.sprite;
        if (!diary) return;
        this.tweens.killTweensOf(diary);
        diary.setAlpha(1);
        this.diaryPulse = {
            sprite: diary,
            scaleX: diary.scaleX,
            scaleY: diary.scaleY,
            tween: this.tweens.add({
                targets: diary,
                scaleX: diary.scaleX * DIARY_PULSE.scale,
                scaleY: diary.scaleY * DIARY_PULSE.scale,
                duration: DIARY_PULSE.duration,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            })
        };
    }

    stopDiaryPulse() {
        const pulse = this.diaryPulse;
        if (!pulse) return;
        pulse.tween.remove();
        // Возвращаем дневнику исходный размер.
        if (pulse.sprite.scene) pulse.sprite.setScale(pulse.scaleX, pulse.scaleY);
        this.diaryPulse = null;
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
            this.background.backdrop?.setAlpha(0.45);
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
            this.background.backdrop?.setAlpha(1);
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
