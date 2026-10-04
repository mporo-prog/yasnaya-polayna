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
import {
    letterList,
    letterImages,
    letterImagesByEnvelope
} from './data/letterLists.js';

const PAUSE_BUTTON = {
    x: 100,
    y: 90,
    size: 148,
    texture: 'images/icon_UI/pause_button.png'
};

// Зоны сброса — лотки на фоне (координаты картинки 1920×1080).
// stack — центр дна лотка и размер, в который вписываются уложенные письма.
const TRAYS = [
    {   // «Н.»
        id: 'blue', x: 270, y: 175, width: 485, height: 350,
        stack: { x: 540, y: 360, width: 280, height: 190 }
    },
    {   // «Р.»
        id: 'black', x: 750, y: 140, width: 520, height: 350,
        stack: { x: 1040, y: 330, width: 280, height: 190 }
    },
    {   // «О.»
        id: 'pink', x: 1245, y: 110, width: 515, height: 345,
        stack: { x: 1530, y: 290, width: 280, height: 190 }
    },
    {   // «С.А.»
        id: 'yellow', x: 555, y: 550, width: 455, height: 255,
        stack: { x: 790, y: 650, width: 250, height: 170 }
    }
];

// Письма в лотке лежат не идеально ровно: случайный сдвиг
// до ±x / ±y пикселей и поворот до ±angle градусов.
const STACK_JITTER = { x: 14, y: 28, angle: 6 };

// Центр стопки писем.
const LETTER_SPAWN = { x: 1420, y: 650 };

const TIME_LIMIT = 30;

// Пути относительно resource/sound.
const SOUNDS = {
    // Запись длится ровно 10 секунд — до конца таймера.
    timer: 'voice_and_sound/scene4_gameplay4/GAMEPLAY4_NEW/gameplay_timer.wav',
    correct: 'voice_and_sound/scene4_gameplay4/GAMEPLAY4_NEW/gameplay_vernyi_vybor.wav',
    // Взяли письмо из стопки.
    grab: 'voice_and_sound/scene4_gameplay4/GAMEPLAY4_NEW/gameplay3_nazhatie_na_object.wav',
    // Сверху стопки появилось следующее письмо.
    appear: 'voice_and_sound/scene4_gameplay4/GAMEPLAY4_NEW/gameplay_poyavlenie_new_object.wav',
    wrong: 'voice_and_sound/scene4_gameplay4/GAMEPLAY4_NEW/gameplay2_neverniy_vybor.wav'
};

// За сколько секунд до конца включается звук таймера.
const TIMER_SOUND_FROM = 10;

// Круглый таймер в левом нижнем углу: сверху счётчик писем, снизу секунды.
// left/bottom — отступ центра часов от краёв экрана.
const CLOCK = {
    left: 160,
    bottom: 190,
    size: 200,
    textGap: 12,
    emptyTexture: 'game4-clock-empty',
    fullTexture: 'game4-clock-full'
};

const CLOCK_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontSize: '44px',
    color: '#FFF0DD'
};

// Экраны правил, победы и поражения — как в игре 1.
const HINT_NEXT_ARROW = {
    x: 1600,
    y: 825,
    size: 150,
    texture: 'images/icon_UI/next_button.png'
};

const RESULT_MESSAGE_PANEL = {
    x: 572,
    y: 430,
    width: 776.03,
    height: 220,
    texture: 'images/icon_UI/result_message_panel.png'
};

const INSTRUCTION_PANEL = {
    x: 310,
    y: 251,
    width: 1300,
    height: 577.04,
    texture: 'images/icon_UI/text_bg.png'
};

const COLOR_OVERLAY = 0x000000;
const OVERLAY_ALPHA = 0.6;

const RESULT_MESSAGE_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontSize: '64px',
    color: '#04151F'
};

const INSTRUCTION_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontSize: '64px',
    color: '#6E6056',
    align: 'center',
    wordWrap: { width: INSTRUCTION_PANEL.width - 160 }
};

// Тексты экранов правил и результатов.
const TEXTS = {
    intro: 'Распредели корреспонденцию',
    winTitle: 'Игра пройдена!',
    win: 'Ежедневно Толстой получал по 20–30 писем и делил их на категории: «Б.О.» (без ответа), просительные, ругательные, «Б.С.» (без содержания)',
    lose: 'Попробуй снова'
};

// Обучение: под текстом правил — какое письмо в какой лоток. Координаты —
// от левого верхнего угла плашки правил; icon — центр картинки письма,
// которая вписывается в ICON_BOX; label — левый край подписи.
const INTRO_TITLE_Y = 150;
const INTRO_ICON_BOX = { width: 135, height: 140 };
const INTRO_LEGEND = [
    { envelope: 'yellow', label: 'Без содержания', icon: { x: 125, y: 291 }, labelX: 215 },
    { envelope: 'pink', label: 'Просительные', icon: { x: 740, y: 291 }, labelX: 830 },
    { envelope: 'black', label: 'Без ответа', icon: { x: 125, y: 448 }, labelX: 215 },
    { envelope: 'blue', label: 'Ругательные', icon: { x: 740, y: 448 }, labelX: 830 }
];

const INTRO_TITLE_TEXT_STYLE = {
    ...INSTRUCTION_TEXT_STYLE,
    fontSize: '56px',
    wordWrap: { width: 1000 }
};

const INTRO_LABEL_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontSize: '48px',
    color: '#6E6056'
};

// Экран победы: небольшой заголовок и интересный факт.
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

// Экран поражения закрывается через 2 секунды, факт на победе — через 7.
const RESULT_HINT_SECONDS = 2;

// Слои: письма 0–200, экраны поверх писем, кнопка паузы поверх экранов.
const OVERLAY_DEPTH = 300;
const PAUSE_DEPTH = 310;

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

    getAssetManifest() {
        const imagesPath =
            `${import.meta.env.BASE_URL}images/game4/`;

        return {
            images: [
                {
                    key: 'game4-background',
                    url: `${imagesPath}background.png`
                },
                {
                    key: CLOCK.emptyTexture,
                    url: `${imagesPath}clock_timer_empty.png`
                },
                {
                    key: CLOCK.fullTexture,
                    url: `${imagesPath}clock_timer_full.png`
                },
                ...[
                    PAUSE_BUTTON,
                    HINT_NEXT_ARROW,
                    RESULT_MESSAGE_PANEL,
                    INSTRUCTION_PANEL
                ].map(({ texture }) => ({
                    key: texture,
                    url: `${import.meta.env.BASE_URL}${texture}`
                })),
                ...letterImages.map((image) => ({
                    key: Letter.textureKey(image),
                    url: `${imagesPath}letters/${image}.png`
                }))
            ],

            audio: Object.values(SOUNDS)
        };
    }

    preload() {
        if (window.VN?.systems.SceneAssets) {
            window.VN.systems.SceneAssets.preload(this);
            return;
        }
        window.VN?.systems.SceneAudio?.preload(this);

        // Отдельная страница games/game4/index.html.
        const assets = this.getAssetManifest();

        assets.images.forEach(({ key, url }) => {
            this.load.image(key, url);
        });

        assets.audio.forEach((path) => {
            window.VN?.systems.AudioManager?.load(this, path);
        });
    }

    create() {

        this.storage = new Game4Storage(GAME4_SAVE_KEY);

        this.completed = false;
        this.timeLeft = undefined;
        this.timer = null;
        this.timerStarted = false;
        this.activeHint = null;
        this.trayLetters = [];
        this.timerSound = null;

        this.sceneAudio = null;
        this.layout = window.VN.systems.Layout;
        this.createBackground();
        this.createEnvelopes();
        this.createPauseButton();
        this.setupDrag();
        this.input.keyboard?.on('keydown-ESC', () => this.openPauseMenu());
        this.createLetters();
        this.createCounter();
        this.createTimer();
        this.createOverlays();
        window.VN?.systems.SceneAssets?.prefetchNext(this);

        // Перезагрузка возможна и во время анимации последнего отсортированного письма.
        const sceneAudio = window.VN?.systems.SceneAudio;
        if (this.checkGameFinished()) {
            // Восстановленная победа пропускает правила и их озвучку.
            this.sceneAudio = sceneAudio?.enter(this, { ...sceneAudio.getConfig(this), sounds: [] });
            this.winGame();
        } else {
            // Таймер и письма оживают только после экрана с правилами.
            // Правила закрываются только нажатием (см. createOverlay).
            this.showHint(this.introOverlay, () => this.startGame(), null);
            this.sceneAudio = sceneAudio?.enter(this);
            this.unlockAudio();
        }

        window.addEventListener(
            'pagehide',
            this.handlePageHide
        );

        // Звук таймера замирает вместе с игрой под меню паузы.
        const pauseSound = () => this.timerSound?.pause();
        const resumeSound = () => this.timerSound?.resume();
        this.events.on('pause', pauseSound);
        this.events.on('resume', resumeSound);

        this.events.once('shutdown', () => {
            window.removeEventListener(
                'pagehide',
                this.handlePageHide
            );

            this.events.off('pause', pauseSound);
            this.events.off('resume', resumeSound);

            // Уход в другую игру или в меню завершает попытку.
            // Сохранение переживает только перезагрузку страницы (pagehide).
            this.stopTimerSound();
            this.stopBackgroundSound();
            this.clearHint();
            this.timer?.destroy();
            this.completed = true;
            this.clearGame4Save();
        });
    }

    createBackground() {
        // Фон — на весь экран, включая поля по краям.
        this.background = this.layout.addBackground(
            this,
            'game4-background'
        );
    }

    createPauseButton() {
        const button = this.add.image(PAUSE_BUTTON.x, PAUSE_BUTTON.y, PAUSE_BUTTON.texture)
            .setDisplaySize(PAUSE_BUTTON.size, PAUSE_BUTTON.size)
            .setDepth(PAUSE_DEPTH)
            .setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => {
            window.VN?.systems.AudioManager?.click?.(this);
            this.openPauseMenu();
        });

        // Размер и привязка к левому верхнему углу — как в сюжетной сцене.
        // Размер и привязка к левому верхнему углу — общие для всех сцен.
        this.layout.pinPauseButton(this, button);
    }

    openPauseMenu() {

        this.scene.launch('PauseScene', {
            returnSceneKey: 'GameScene4'
        });

        this.scene.pause();

        this.scene.bringToTop('PauseScene');
    }

    createLetters() {

        let saved = this.loadGame4State();

        // Сохранение с письмами, которых больше нет в игре (например,
        // удалённые розовые), не восстанавливаем — попытка начинается заново.
        const known = new Set(letterImages);
        const isKnown = ({ image }) => !image || known.has(image);
        if (saved && ![...saved.letters, ...(saved.trayLetters ?? [])].every(isKnown)) {
            this.clearGame4Save();
            saved = null;
        }

        let letters;

        if (saved) {

            letters = saved.letters.map(letter => {
                return new Letter(
                    letter.envelope,
                    // Старые сохранения хранили цвет вместо картинки.
                    letter.image ??
                        letterImagesByEnvelope[letter.envelope][0]
                );
            });

            this.sortedLetters = saved.sortedLetters;
            this.totalLetters = saved.totalLetters;

            // Уже разложенные письма снова лежат в своих лотках.
            (saved.trayLetters ?? []).forEach(({ envelope, image }) => {
                const letter = new Letter(envelope, image);
                letter.sprite = this.add.image(0, 0, Letter.textureKey(image));
                this.placeInTray(letter, false);
            });
            // После перезагрузки письма остаются, а таймер начинается заново.
            this.timeLeft = TIME_LIMIT;

        } else {

            const randomList =
                Phaser.Utils.Array.Shuffle([...letterList]);

            letters = randomList.map(letter => {
                return new Letter(
                    letter.envelope,
                    letter.image
                );
            });

            this.totalLetters = letters.length;
            this.sortedLetters = 0;
            this.timeLeft = TIME_LIMIT;
        }

        const letterWidth = 525;
        const letterHeight = 375;

        const startLetterX = LETTER_SPAWN.x;
        const startLetterY = LETTER_SPAWN.y;

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
    }

    saveGame4State() {
        if (this.completed || !this.letterStack) return;
        this.storage.save({

            letters: this.letterStack
                .getAll()
                .map(letter => ({
                    envelope: letter.envelope,
                    image: letter.image
                })),

            trayLetters: this.trayLetters.map(letter => ({
                envelope: letter.envelope,
                image: letter.image
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

    // Добавляет объект к часам: центр часов + смещение по вертикали,
    // всё вместе прижато к левому нижнему углу экрана.
    addClockPart(obj, offsetY = 0) {
        obj.setDepth(20);
        this.layout.pin(this, obj, {
            left: CLOCK.left,
            bottom: CLOCK.bottom - offsetY
        });
        return obj;
    }

    createCounter() {

        this.counterText = this.addClockPart(
            this.add.text(
                0,
                0,
                `${this.sortedLetters}/${this.totalLetters}`,
                CLOCK_TEXT_STYLE
            ).setOrigin(0.5, 1),
            -(CLOCK.size / 2 + CLOCK.textGap)
        );
    }

    createTimer() {

        this.addClockPart(
            this.add.image(0, 0, CLOCK.emptyTexture)
                .setDisplaySize(CLOCK.size, CLOCK.size)
        );

        // Заполненные часы видны только внутри сектора оставшегося времени.
        this.clockFull = this.addClockPart(
            this.add.image(0, 0, CLOCK.fullTexture)
                .setDisplaySize(CLOCK.size, CLOCK.size)
        );
        this.clockMaskShape = this.make.graphics({}, false);
        this.clockFull.setMask(
            this.clockMaskShape.createGeometryMask()
        );

        this.timerText = this.addClockPart(
            this.add.text(0, 0, '', CLOCK_TEXT_STYLE)
                .setOrigin(0.5, 0),
            CLOCK.size / 2 + CLOCK.textGap
        );

        this.timer = new Game4Timer(
            this,
            TIME_LIMIT,

            (timeLeft) => {

                this.timeLeft = timeLeft;

                this.updateTimerText();

                if (
                    timeLeft > 0 &&
                    timeLeft <= TIMER_SOUND_FROM &&
                    !this.timerSound
                ) {
                    this.startTimerSound();
                }

                this.saveGame4State();
            },

            () => {

                this.loseGame();
            }
        );

        this.updateTimerText();
        this.updateClock();
    }

    startGame() {
        // Письма оживают сразу, а таймер — только при первом нажатии на
        // письмо (см. startTimerOnce): время не идёт, пока игрок осматривается.
        this.timerStarted = false;
        this.activateTopLetter();
    }

    /** Запускает таймер при первом нажатии на письмо; повторно — ничего. */
    startTimerOnce() {
        if (this.timerStarted || this.completed || !this.timer) {
            return;
        }
        this.timerStarted = true;
        this.timer.start(this.timeLeft);
    }

    unlockAudio() {
        const context = this.sound?.context;
        if (context?.state === 'suspended') {
            context.resume();
        }
    }

    playSound(path) {
        return window.VN?.systems.AudioManager?.play(this, path) ?? null;
    }

    startTimerSound() {
        const sound = this.playSound(SOUNDS.timer);

        if (!sound) {
            return;
        }

        this.timerSound = sound;
        // Одноразовый звук удаляется сам после окончания.
        sound.once('destroy', () => {
            if (this.timerSound === sound) {
                this.timerSound = null;
            }
        });
    }

    // Фон игры (sceneAudio.js → GameScene4.music) звучит только здесь.
    // Сцены без своей настройки музыки иначе продолжили бы его играть.
    stopBackgroundSound() {
        const path = window.VN?.data.sceneAudio?.GameScene4?.music?.path;
        const MusicController = window.VN?.systems.MusicController;

        if (!path || !MusicController) {
            return;
        }

        const music = MusicController.forScene(this);

        // Следующая сцена могла уже включить свою музыку — её не трогаем.
        if (music.current?.path === path) {
            music.fadeOut({ duration: 0.5 });
        }
    }

    stopTimerSound() {
        this.timerSound?.stop();
        this.timerSound?.destroy();
        this.timerSound = null;
    }

    update() {
        this.updateClock();

        if (this.activeHint?.autoDismiss) {
            this.dismissHint();
        }
    }

    // Плавно «съедает» кремовую заливку по часовой стрелке от 12 часов.
    updateClock() {

        if (!this.clockFull) {
            return;
        }

        const tick = this.timer?.timerEvent;
        const remaining = tick
            ? this.timeLeft - tick.getProgress()
            : this.timeLeft;
        const fraction = Phaser.Math.Clamp(remaining / TIME_LIMIT, 0, 1);

        const top = -Math.PI / 2;
        const hand = top + (1 - fraction) * Math.PI * 2;

        this.clockMaskShape.clear();

        if (fraction <= 0) {
            return;
        }

        this.clockMaskShape
            .fillStyle(0xffffff)
            .slice(
                this.clockFull.x,
                this.clockFull.y,
                CLOCK.size / 2,
                hand,
                top + Math.PI * 2,
                false
            )
            .fillPath();
    }

    updateTimerText() {

        const seconds = Math.max(
            0,
            this.timeLeft
        );

        this.timerText.setText(`${seconds}`);
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

        this.envelopes = TRAYS.map(({ id, x, y, width, height }) => {
            return new Envelope(id, x, y, width, height);
        });

        this.envelopes.forEach(envelope => {

            envelope.createSprite(this);

            // Зона двигается и масштабируется вместе с фоном,
            // поэтому всегда лежит точно на своём лотке.
            this.background.stage.add(envelope.sprite);
        });
    }

    setupDrag() {

        // Первое нажатие на доступное письмо запускает таймер.
        this.input.on('gameobjectdown', (pointer, gameObject) => {
            const letter = this.letterStack
                ?.getAll()
                .find(item => item.sprite === gameObject);
            if (letter && !letter.isLocked()) {
                this.startTimerOnce();
            }
        });

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

                this.startTimerOnce();
                gameObject.setDepth(200);

                this.playSound(SOUNDS.grab);
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
                    this.sortLetter(letter);
                } else {
                    // Звук ошибки — только если письмо бросили в чужой лоток.
                    if (envelope) {
                        this.playSound(SOUNDS.wrong);
                    }

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

    sortLetter(letter) {

        letter.lock();

        this.letterStack.removeLetter(letter);

        this.sortedLetters++;

        this.updateCounter();

        const finished = this.checkGameFinished();

        this.playSound(SOUNDS.correct);

        // Время не должно закончиться, пока последнее письмо ложится в лоток.
        if (finished) {
            this.timer?.stop();
            this.stopTimerSound();
        }

        this.placeInTray(letter, true, () => {

            if (finished) {
                this.winGame();
                return;
            }

            this.activateTopLetter();
            if (!this.letterStack.isEmpty()) this.playSound(SOUNDS.appear);
        });

        this.saveGame4State();
    }

    // Кладёт письмо сверху стопки в его лоток. Лоток — часть фона,
    // поэтому письмо переносится в контейнер фона и дальше
    // двигается и масштабируется вместе с ним.
    placeInTray(letter, animate, onComplete) {

        const tray = TRAYS.find(item => item.id === letter.envelope).stack;
        const stage = this.background.stage;
        const sprite = letter.sprite;

        // Из координат экрана — в координаты фона (макет 1920×1080).
        sprite.disableInteractive();
        stage.add(sprite);
        sprite
            .setPosition(
                (sprite.x - stage.x) / stage.scaleX,
                (sprite.y - stage.y) / stage.scaleY
            )
            .setScale(sprite.scale / stage.scaleX);

        const target = {
            x: tray.x + Phaser.Math.Between(-STACK_JITTER.x, STACK_JITTER.x),
            y: tray.y + Phaser.Math.Between(-STACK_JITTER.y, STACK_JITTER.y),
            angle: Phaser.Math.Between(-STACK_JITTER.angle, STACK_JITTER.angle),
            scale: Math.min(
                tray.width / sprite.width,
                tray.height / sprite.height
            )
        };

        this.trayLetters.push(letter);

        if (!animate) {
            sprite.setPosition(target.x, target.y)
                .setAngle(target.angle)
                .setScale(target.scale);
            onComplete?.();
            return;
        }

        this.tweens.add({
            targets: sprite,
            ...target,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => onComplete?.()
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

    // Останавливает попытку: дальше письма не двигаются и не сохраняются.
    endAttempt() {

        if (this.completed) {
            return false;
        }

        this.completed = true;

        this.timer?.stop();

        this.stopTimerSound();

        this.clearGame4Save();

        this.letterStack.getAll().forEach(letter => {
            letter.lock();
            letter.sprite.disableInteractive();
            letter.resetPosition();
        });

        return true;
    }

    winGame() {

        if (!this.endAttempt()) {
            return;
        }

        // Факт читают сколько нужно: экран закрывается только нажатием.
        this.showHint(
            this.winOverlay,
            () => window.VN.systems.finishMinigameAndAdvance(
                this,
                this.storySceneIndex,
                this.minigameId
            ),
            null
        );
        this.sceneAudio?.stopSounds();
        this.sceneAudio?.showScreen(1);
    }

    loseGame() {

        if (!this.endAttempt()) {
            return;
        }

        this.showHint(
            this.loseOverlay,
            () => this.restartGame(),
            RESULT_HINT_SECONDS
        );
    }

    createOverlays() {

        this.introOverlay = this.createOverlay(
            TEXTS.intro,
            { panel: INSTRUCTION_PANEL, textStyle: INTRO_TITLE_TEXT_STYLE }
        );
        this.addIntroLegend(this.introOverlay);

        this.winOverlay = this.createOverlay(
            TEXTS.win,
            { panel: INSTRUCTION_PANEL, textStyle: WIN_FACT_TEXT_STYLE }
        );
        this.addWinTitle(this.winOverlay);

        this.loseOverlay = this.createOverlay(
            TEXTS.lose,
            { panel: RESULT_MESSAGE_PANEL, textStyle: RESULT_MESSAGE_TEXT_STYLE }
        );
    }

    // Затемнение на весь экран, панель с текстом и стрелка «далее».
    // Клик по экрану или стрелке сразу закрывает его и обрывает озвучку.
    createOverlay(text, { panel: panelConfig, textStyle }) {

        const background = this.add.rectangle(
            0,
            0,
            BASE_WIDTH,
            BASE_HEIGHT,
            COLOR_OVERLAY,
            OVERLAY_ALPHA
        ).setOrigin(0);

        const onClick = () => {
            this.unlockAudio();
            window.VN?.systems.AudioManager?.click?.(this);
            this.sceneAudio?.stopSounds?.();
            this.dismissHint();
        };
        background.setInteractive({ useHandCursor: true });
        background.on('pointerdown', onClick);

        const panel = this.add.image(panelConfig.x, panelConfig.y, panelConfig.texture)
            .setOrigin(0)
            .setDisplaySize(panelConfig.width, panelConfig.height);

        const label = this.add.text(0, 0, text, textStyle).setOrigin(0.5);

        const nextArrow = this.add.image(HINT_NEXT_ARROW.x, HINT_NEXT_ARROW.y, HINT_NEXT_ARROW.texture)
            .setOrigin(0)
            .setDisplaySize(HINT_NEXT_ARROW.size, HINT_NEXT_ARROW.size)
            .setInteractive({ useHandCursor: true });
        nextArrow.on('pointerdown', onClick);

        const overlay = this.add.container(0, 0, [background, panel, label, nextArrow])
            .setDepth(OVERLAY_DEPTH)
            .setVisible(false);

        // Панель и стрелка — в тех же долях видимой области, что и в игре 1.
        this.layout.onLayout(this, (visible) => {
            // Плашка — от центра экрана, как в макете (не от краёв).
            const { x, y } = this.layout.fromCenter(visible, panelConfig.x, panelConfig.y);
            panel.setPosition(x, y);
            label.setPosition(x + panelConfig.width / 2, y + panelConfig.height / 2);
            this.layout.placeNextArrow(this, nextArrow, visible);
        });

        this.layout.fill(this, background);

        return overlay;
    }

    /**
     * Обучение на плашке правил: текст сверху, под ним в две колонки —
     * образец письма и подпись, в какой лоток его класть.
     */
    addIntroLegend(overlay) {

        const [, panel] = overlay.list;
        const title = overlay.list.find(object => object.type === 'Text');

        const rows = INTRO_LEGEND.map(({ envelope, label }) => {
            const image = letterImagesByEnvelope[envelope][0];
            const icon = this.add.image(0, 0, Letter.textureKey(image));
            // Письмо вписывается в рамку, сохраняя пропорции.
            icon.setScale(Math.min(
                INTRO_ICON_BOX.width / icon.width,
                INTRO_ICON_BOX.height / icon.height
            ));
            const text = this.add.text(0, 0, label, INTRO_LABEL_TEXT_STYLE).setOrigin(0, 0.5);
            overlay.add([icon, text]);
            return { icon, text };
        });

        // Срабатывает после раскладки плашки в createOverlay().
        this.layout.onLayout(this, () => {
            title.setPosition(panel.x + panel.displayWidth / 2, panel.y + INTRO_TITLE_Y);
            rows.forEach(({ icon, text }, index) => {
                const item = INTRO_LEGEND[index];
                icon.setPosition(panel.x + item.icon.x, panel.y + item.icon.y);
                text.setPosition(panel.x + item.labelX, panel.y + item.icon.y);
            });
        });
    }

    /** Небольшой заголовок «Игра пройдена!» над фактом на той же плашке. */
    addWinTitle(overlay) {

        const [, panel] = overlay.list;
        const fact = overlay.list.find(object => object.type === 'Text');
        const title = this.add.text(0, 0, TEXTS.winTitle, WIN_TITLE_TEXT_STYLE).setOrigin(0.5);
        overlay.add(title);

        // Срабатывает после раскладки плашки в createOverlay().
        this.layout.onLayout(this, () => {
            title.setPosition(panel.x + panel.displayWidth / 2, panel.y + 120);
            fact.setPosition(panel.x + panel.displayWidth / 2, panel.y + panel.displayHeight / 2 + 45);
        });
    }

    // durationSeconds = null — экран ждёт клика.
    showHint(overlay, onDismiss, durationSeconds) {

        this.clearHint();
        overlay.setVisible(true);

        const hint = { overlay, onDismiss, autoDismiss: false, timer: null };
        this.activeHint = hint;

        if (durationSeconds != null) {
            hint.timer = this.time.delayedCall(durationSeconds * 1000, () => {
                hint.autoDismiss = true;
            });
        }
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
