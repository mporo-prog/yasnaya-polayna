// import Phaser from 'phaser';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
// const BASE_WIDTH = window.innerWidth;
// const BASE_HEIGHT = window.innerHeight;

const BIRD_WIDTH = 350;
const BIRD_HEIGHT = 330;

// Координаты левого верхнего угла каждой птицы взяты из макета.
// У каждой птицы своя запись относительно resource/sound.
const BIRDS = [
    {
        x: 1120,
        y: 75,
        image: 'Zyablik',
        voice: 'voice_and_sound/zyablik_2.wav'
    },
    {
        x: 400,
        y: 0,
        image: 'Zaryanka',
        voice: 'voice_and_sound/zaryanka_2.wav'
    },
    {
        // Увеличение в 1,3 раза относительно точки опоры между лапками.
        x: 1311.43,
        y: 469.96,
        width: 455,
        height: 429,
        image: 'Korostel',
        voice: 'voice_and_sound/korostel_2.wav'
    },
    {
        // Увеличение в 1,1 раза относительно точки опоры между лапками.
        x: 159.35,
        y: 503.65,
        width: 385,
        height: 363,
        image: 'Drozd',
        voice: 'voice_and_sound/drozd_2.wav'
    }
];

// Область, которую нельзя обрезать ни на каком экране: все птицы
// (в поющем состоянии они крупнее) с запасом 10px. Фон при этом
// растягивается на весь экран, насколько позволяет эта область.
const BIRDS_AREA = { x: 197, y: 15, width: 1539, height: 894 };

const PAUSE_BUTTON = {
    x: 100,
    y: 90,
    size: 148,
    texture: 'images/icon_UI/pause_button.png'
};

const HINT_NEXT_ARROW = {
    // Координаты левого верхнего угла, как Left/Top в макете.
    x: 1600,
    y: 825,
    size: 150,
    texture: 'images/icon_UI/next_button.png'
};

const RESULT_MESSAGE_PANEL = {
    // Левый верхний угол: 29,792% × 39,815% макета 1920×1080.
    x: 572,
    y: 430,
    width: 776.03,
    height: 220,
    texture: 'images/icon_UI/result_message_panel.png'
};

const INSTRUCTION_PANEL = {
    // Левый верхний угол: 16,146% × 23,241% макета 1920×1080.
    x: 310,
    y: 251,
    width: 1300,
    height: 577.04,
    texture: 'images/icon_UI/instruction_panel.png'
};

const COLOR_BACKGROUND = 0xe5e5e5;
const COLOR_OVERLAY = 0x000000;
// 40% прозрачности — 60% непрозрачности чёрного слоя.
const OVERLAY_ALPHA = 0.6;

const FONT_FAMILY = 'Inter, sans-serif';
const COLOR_TEXT = '#ffffff';

const RESULT_MESSAGE_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontStyle: 'normal',
    fontSize: '64px',
    color: '#04151F',
    lineSpacing: 0,
    letterSpacing: 0
};

const INSTRUCTION_TEXT_STYLE = {
    fontFamily: 'Philosopher',
    fontStyle: 'normal',
    fontSize: '64px',
    color: '#6E6056',
    letterSpacing: 0,
    wordWrap: { width: INSTRUCTION_PANEL.width - 160 }
};

const DEMO_START_DELAY = 700;
const DEMO_FLASH_DURATION = 500;
const DEMO_FLASH_GAP = 250;
const INPUT_FLASH_DURATION = 300;
// Время показа подсказок; можно переопределить через hintDurationSeconds в данных сцены.
const DEFAULT_HINT_DURATION_SECONDS = 2;

export class GameScene1 extends Phaser.Scene {

    constructor() {
        super('GameScene1');
    }

    init(data = {}) {
        this.storySceneIndex = data.storySceneIndex;
        this.minigameId = data.minigameId;
        this.hintDurationSeconds = Number.isFinite(data.hintDurationSeconds) && data.hintDurationSeconds >= 0
            ? data.hintDurationSeconds
            : DEFAULT_HINT_DURATION_SECONDS;
    }

    getAssetManifest() {
        const imagesPath = `${import.meta.env.BASE_URL}images/game1/`;
        return {
            images: [
                { key: 'game1-background', url: `${imagesPath}bacground_game1.png` },
                { key: PAUSE_BUTTON.texture, url: `${import.meta.env.BASE_URL}${PAUSE_BUTTON.texture}` },
                { key: HINT_NEXT_ARROW.texture, url: `${import.meta.env.BASE_URL}${HINT_NEXT_ARROW.texture}` },
                { key: RESULT_MESSAGE_PANEL.texture, url: `${import.meta.env.BASE_URL}${RESULT_MESSAGE_PANEL.texture}` },
                { key: INSTRUCTION_PANEL.texture, url: `${import.meta.env.BASE_URL}${INSTRUCTION_PANEL.texture}` },
                ...BIRDS.flatMap((bird) => [
                    { key: `${bird.image}_idle`, url: `${imagesPath}${bird.image}_1.png` },
                    { key: `${bird.image}_sing`, url: `${imagesPath}${bird.image}_2.png` },
                ]),
            ],
            audio: BIRDS.map((bird) => bird.voice),
        };
    }

    preload() {
        if (window.VN?.systems.SceneAssets) {
            window.VN.systems.SceneAssets.preload(this);
            return;
        }
        // Сохраняем отдельный запуск games/game1/index.html.
        const assets = this.getAssetManifest();
        for (const { key, url } of assets.images) this.load.image(key, url);
        window.VN?.systems.SceneAudio?.preload(this);
        for (const path of assets.audio) window.VN.systems.AudioManager.load(this, path);
    }

    create() {
        this.sceneAudio = null;
        this.phase = 'intro';
        this.paused = false;
        this.completed = false;
        this.input.enabled = true;
        this.input.keyboard.enabled = true;
        this.sequence = [];
        this.playedBirds = new Set();
        this.inputIndex = 0;
        this.demoStep = 0;
        this.round_number = 2;
        this.activeHint = null;

        this.layout = window.VN.systems.Layout;
        this.createBackground();
        this.createBirds();
        this.createPauseOverlay();
        this.createPauseButton();
        this.createRepeatOverlay();
        this.createLoseOverlay();
        this.createWinOverlay();
        this.createIntroOverlay();
        this.setupInput();
        window.VN?.systems.SceneAssets?.prefetchNext(this);
    }

    createBackground() {
        this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);

        // Фон на весь экран. Птицы сидят на ветках фона, поэтому кладём их
        // в тот же контейнер (stage) — они двигаются и масштабируются
        // вместе с фоном и не «съезжают» с веток ни на каком экране.
        const { Rectangle } = Phaser.Geom;
        this.background = this.layout.addBackground(this, 'game1-background', {
            keep: new Rectangle(BIRDS_AREA.x, BIRDS_AREA.y, BIRDS_AREA.width, BIRDS_AREA.height)
        });
        this.stage = this.background.stage;
    }

    createBirds() {
        this.birds = BIRDS.map((data, index) => {
            const bird = {
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

    buildSequence(sequence_len) {
        const indices = Phaser.Utils.Array.Shuffle(this.birds.map((_, index) => index));
        const unplayed = indices.filter(index => !this.playedBirds.has(index));
        const played = indices.filter(index => this.playedBirds.has(index));

        // Сначала включаем ещё не звучавших птиц, затем перемешиваем порядок.
        // Каждая птица встречается в раунде не более одного раза.
        return Phaser.Utils.Array.Shuffle([...unplayed, ...played].slice(0, sequence_len));
    }

    startRound() {
        this.introOverlay.setVisible(false);
        this.resetBirds();

        this.sequence = this.buildSequence(this.round_number);
        this.inputIndex = 0;
        this.demoStep = 0;

        this.unlockAudio();
        this.playDemo();
    }

    playDemo() {
        this.phase = 'demo';

        this.time.delayedCall(DEMO_START_DELAY, () => this.playDemoStep());
    }

    playDemoStep() {
        if (this.phase !== 'demo') {
            return;
        }

        if (this.demoStep >= this.sequence.length) {
            this.phase = 'repeat';
            this.showHint(this.repeatOverlay, () => this.startInput());
            return;
        }

        const index = this.sequence[this.demoStep];
        // Следующая птица поёт только после окончания текущей записи.
        const duration = Math.max(DEMO_FLASH_DURATION, this.birds[index].voice.totalDuration * 1000);
        this.flashBird(index, duration);
        this.demoStep += 1;

        this.time.delayedCall(
            duration + DEMO_FLASH_GAP,
            () => this.playDemoStep()
        );
    }

    startInput() {
        this.repeatOverlay.setVisible(false);
        this.phase = 'input';
    }

    selectBird(index) {
        if (this.phase !== 'input' || this.paused) {
            return;
        }

        this.flashBird(index, INPUT_FLASH_DURATION);

        if (index !== this.sequence[this.inputIndex]) {
            this.finishRound(false);
            return;
        }

        this.inputIndex += 1;

        if (this.inputIndex >= this.sequence.length) {
            this.finishRound(true);
        }
    }

    finishRound(won) {
        this.phase = 'finishing';
        this.roundWon = won;
        // Блокируем ввод до окончания пения и появления подсказки.
        this.input.enabled = false;
        this.input.keyboard.enabled = false;
    }

    update() {
        if (this.paused) {
            return;
        }

        if (this.activeHint?.autoDismiss) {
            this.dismissHint();
        }

        if (this.phase !== 'finishing') {
            return;
        }

        // При быстрых нажатиях могут одновременно допевать несколько птиц.
        // Ждём реального окончания звуков и возврата птиц в обычное состояние.
        if (this.birds.some(bird => bird.timer || bird.voice.isPlaying || bird.voice.isPaused)) {
            return;
        }

        if (this.roundWon) {
            this.winRound();
        } else {
            this.failRound();
        }
    }

    flashBird(index, duration) {
        const bird = this.birds[index];

        if (bird.timer) {
            bird.timer.remove();
        }

        this.playVoice(index);

        bird.box
            .setTexture(bird.singKey)
            .setDisplaySize(bird.width, bird.height);

        // Показываем поющую птицу как минимум до конца записи.
        const activeDuration = Math.max(
            duration,
            bird.voice.totalDuration * 1000
        );

        bird.timer = this.time.delayedCall(activeDuration, () => {
            bird.box
                .setTexture(bird.idleKey)
                .setDisplaySize(bird.width, bird.height);

            bird.timer = null;
        });
    }

    resetBirds() {
        this.time.removeAllEvents();

        this.birds.forEach(bird => {
            bird.voice.stop();
            bird.timer = null;
            bird.box.setTexture(bird.idleKey).setDisplaySize(bird.width, bird.height);
        });
    }

    failRound() {
        this.phase = 'over';
        this.showHint(this.loseOverlay, () => this.restartRound());
    }

    winRound() {
        this.phase = 'over';
        // Неудачные попытки не учитываем: все птицы должны войти в два пройденных раунда.
        this.sequence.forEach(index => this.playedBirds.add(index));
        if (this.round_number === 3) {
            this.showHint(this.winOverlay, () => this.finishGame());
            return;
        }
        this.nextRound();
    }

    restartRound() {
        this.loseOverlay.setVisible(false);
        this.resetBirds();

        this.phase = 'intro';
        this.showHint(this.introOverlay, () => this.startRound());
    }

    unlockAudio() {
        const context = this.sound && this.sound.context;

        if (!context) {
            return;
        }

        if (context.state === 'suspended') {
            context.resume();
        }
    }

    playVoice(index) {
        // Только пользовательская громкость AudioManager, без фейдов и эффектов.
        this.birds[index].voice.play();
    }

    createPauseButton() {
        const button = this.add.image(PAUSE_BUTTON.x, PAUSE_BUTTON.y, PAUSE_BUTTON.texture)
            .setDisplaySize(PAUSE_BUTTON.size, PAUSE_BUTTON.size)
            .setDepth(20)
            .setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.openPauseMenu());

        // Размер и привязка к левому верхнему углу — как в сюжетной сцене.
        this.layout.pin(this, button, { left: PAUSE_BUTTON.x, top: PAUSE_BUTTON.y });
    }

    showHint(overlay, onDismiss, durationSeconds = this.hintDurationSeconds) {
        this.clearHint();
        overlay.setVisible(true);
        this.input.enabled = true;
        this.input.keyboard.enabled = true;

        const hint = {
            overlay,
            onDismiss,
            autoDismiss: false,
            timer: null
        };
        this.activeHint = hint;
        hint.timer = this.time.delayedCall(durationSeconds * 1000, () => {
            hint.autoDismiss = true;
            if (this.activeHint === hint) this.dismissHint();
        });
    }

    clearHint() {
        if (!this.activeHint) {
            return;
        }

        this.activeHint.timer.remove();
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
            color: panelConfig ? '#6e6056' : COLOR_TEXT,
            align: 'center',
            ...textStyle
        }).setOrigin(0.5);

        if (lineHeight !== null) {
            // В Phaser межстрочный шаг складывается из метрик шрифта и lineSpacing.
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
            const panel = this.add.image(panelConfig.x, panelConfig.y, panelConfig.texture)
                .setOrigin(0)
                .setDisplaySize(panelConfig.width, panelConfig.height);
            elements.push(panel);
            this.layout.onLayout(this, (visible) => {
                const x = visible.x + visible.width * panelConfig.x / BASE_WIDTH;
                const y = visible.y + visible.height * panelConfig.y / BASE_HEIGHT;
                panel.setPosition(x, y);
                label.setPosition(x + panelConfig.width / 2, y + panelConfig.height / 2);
            });
        }
        elements.push(label);
        if (onClick) {
            background.on('pointerdown', onClick);

            // Стрелка только обозначает переход: клик принимает вся подложка.
            const nextArrow = this.add.image(HINT_NEXT_ARROW.x, HINT_NEXT_ARROW.y, HINT_NEXT_ARROW.texture)
                .setOrigin(0)
                .setDisplaySize(HINT_NEXT_ARROW.size, HINT_NEXT_ARROW.size);
            elements.push(nextArrow);
            this.layout.onLayout(this, (visible) => {
                nextArrow.setPosition(
                    visible.x + visible.width * HINT_NEXT_ARROW.x / BASE_WIDTH,
                    visible.y + visible.height * HINT_NEXT_ARROW.y / BASE_HEIGHT
                );
            });
        }

        const overlay = this.add.container(0, 0, elements).setDepth(10).setVisible(false);

        // Затемняем весь игровой фон и птиц; UI паузы остаётся выше подложки.
        this.layout.fill(this, background);

        return overlay;
    }

    createPauseOverlay() {
        this.pauseOverlay = this.createOverlay('Пауза');
    }

    createRepeatOverlay() {
        this.repeatOverlay = this.createOverlay(
            'Повторите песню',
            () => this.dismissHint(),
            { panel: INSTRUCTION_PANEL, textStyle: INSTRUCTION_TEXT_STYLE, lineHeight: 64 }
        );
    }

    createLoseOverlay() {
        this.loseOverlay = this.createOverlay(
            'Попробуйте снова',
            () => this.dismissHint(),
            { panel: RESULT_MESSAGE_PANEL, textStyle: RESULT_MESSAGE_TEXT_STYLE }
        );
    }

    createWinOverlay() {
        this.winOverlay = this.createOverlay(
            'Ура пабеда едем дальше',
            () => this.dismissHint(),
            { panel: RESULT_MESSAGE_PANEL, textStyle: RESULT_MESSAGE_TEXT_STYLE }
        );
    }

    nextRound(){
        this.round_number += 1;
        this.phase = 'intro';
        this.showHint(this.introOverlay, () => this.startRound());
    }

    createIntroOverlay() {
        this.introOverlay = this.createOverlay(
            'Прослушайте песню птиц и попробуйте повторить ее.',
            () => {
                // Если браузер запретил автозапуск, первый клик запускает голос,
                // но не закрывает инструкцию до окончания записи.
                this.unlockAudio();
                this.dismissHint();
            },
            { panel: INSTRUCTION_PANEL, textStyle: INSTRUCTION_TEXT_STYLE, lineHeight: 64 }
        );

        this.showHint(this.introOverlay, () => this.startRound(), 4);
        // Только первый показ ждёт озвучку; повторные подсказки работают по таймеру.
        this.activeHint.waitForAudio = true;
        this.sceneAudio = window.VN?.systems.SceneAudio?.enter(this);
        this.unlockAudio();
    }

    openPauseMenu() {
        this.scene.launch('PauseScene', {
            returnSceneKey: 'GameScene1'
        });

        this.scene.pause();

        this.scene.bringToTop('PauseScene');
    }

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
        // Раньше здесь вызывался несуществующий this.togglePause() —
        // Esc ронял сцену. Открываем то же меню паузы, что и кнопка.
        this.input.keyboard.on('keydown-ESC', () => this.openPauseMenu());

        // Подстройку под размер экрана делает Layout (подписка и отписка — внутри).
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearHint();
            this.birds.forEach(bird => bird.voice.destroy());
        });
    }
}
