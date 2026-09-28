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

const MENU_BUTTON = {
    x: 1830,
    y: 14,
    width: 72,
    height: 66
};

const COLOR_BACKGROUND = 0xe5e5e5;
const COLOR_MENU = 0x6f6f6f;
const COLOR_OVERLAY = 0xd9d9d9;

const FONT_FAMILY = 'Inter, sans-serif';
const COLOR_TEXT = '#000000';

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
        window.VN?.systems.SceneAudio?.enter(this);
        this.phase = 'intro';
        this.paused = false;
        this.completed = false;
        this.input.enabled = true;
        this.input.keyboard.enabled = true;
        this.sequence = [];
        this.inputIndex = 0;
        this.demoStep = 0;
        this.round_number = 2;
        this.activeHint = null;

        this.layout = window.VN.systems.Layout;
        this.createBackground();
        this.createBirds();
        this.createPauseOverlay();
        this.createButtonMenu();
        this.createRepeatOverlay();
        this.createLoseOverlay();
        this.createWinOverlay();
        this.createIntroOverlay();
        this.createWinRoundOverlay();
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
        const sequence = [];

        while (sequence.length < sequence_len) {
            const index = Phaser.Math.Between(0, this.birds.length - 1);

            // Одна и та же птица подряд читается неоднозначно — пропускаем.
            if (index === sequence[sequence.length - 1]) {
                continue;
            }

            sequence.push(index);
        }

        return sequence;
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
        if (this.phase !== 'finishing' || this.paused) {
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
        if (this.round_number == 4){
            this.showHint(this.winOverlay, () => this.finishGame());
            return
        }
        this.showHint(this.winRoundOverlay, () => this.nextRound());
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

    createButtonMenu() {
        const button = this.add.rectangle(
            MENU_BUTTON.x,
            MENU_BUTTON.y,
            MENU_BUTTON.width,
            MENU_BUTTON.height,
            COLOR_MENU
        ).setOrigin(0);

        const label = this.add.text(
            MENU_BUTTON.x + MENU_BUTTON.width / 2,
            MENU_BUTTON.y + MENU_BUTTON.height / 2,
            'меню',
            {
                fontFamily: FONT_FAMILY,
                fontSize: '16px',
                color: COLOR_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.openPauseMenu());

        // Кнопка меню — в правом верхнем углу экрана (с учётом выреза).
        this.layout.pin(this, button, { right: BASE_WIDTH - MENU_BUTTON.x, top: MENU_BUTTON.y });
        this.layout.pin(this, label, {
            right: BASE_WIDTH - MENU_BUTTON.x - MENU_BUTTON.width / 2,
            top: MENU_BUTTON.y + MENU_BUTTON.height / 2
        });
    }

    showHint(overlay, onDismiss, durationSeconds = this.hintDurationSeconds) {
        this.clearHint();
        overlay.setVisible(true);
        this.input.enabled = true;
        this.input.keyboard.enabled = true;

        this.activeHint = {
            overlay,
            onDismiss,
            timer: this.time.delayedCall(durationSeconds * 1000, () => this.dismissHint())
        };
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
        if (!hint) {
            return;
        }

        this.clearHint();
        hint.onDismiss();
    }

    createOverlay(text, onClick) {
        const background = this.add.rectangle(
            0,
            0,
            BASE_WIDTH,
            BASE_HEIGHT,
            COLOR_OVERLAY
        ).setOrigin(0);

        const label = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2, text, {
            fontFamily: FONT_FAMILY,
            fontSize: '40px',
            color: COLOR_TEXT,
            align: 'center'
        }).setOrigin(0.5);

        background.setInteractive({ useHandCursor: Boolean(onClick) });

        if (onClick) {
            background.on('pointerdown', onClick);
        }

        const overlay = this.add.container(0, 0, [background, label]);
        overlay.setVisible(false);

        // Подложка подсказки закрывает весь экран, текст — по центру.
        this.layout.fill(this, background);

        return overlay;
    }

    createPauseOverlay() {
        this.pauseOverlay = this.createOverlay('Пауза');
    }

    createRepeatOverlay() {
        this.repeatOverlay = this.createOverlay(
            'Повторите песню',
            () => this.dismissHint()
        );
    }

    createLoseOverlay() {
        this.loseOverlay = this.createOverlay(
            'Попробуйте снова',
            () => this.dismissHint()
        );
    }

    createWinOverlay() {
        this.winOverlay = this.createOverlay(
            'Ура пабеда едем дальше',
            () => this.dismissHint()
        );
    }

    createWinRoundOverlay() {
        this.winRoundOverlay = this.createOverlay(
            'Раунд пройден, повышаем сложность...',
            () => this.dismissHint()
        );
    }

    nextRound(){
        this.round_number += 1;
        this.winRoundOverlay.setVisible(false);
        this.phase = 'intro';
        this.showHint(this.introOverlay, () => this.startRound());
    }

    createIntroOverlay() {
        // Первый показ правил нельзя пропустить; повторные показы — можно.
        let canSkip = false;
        this.introOverlay = this.createOverlay(
            'Прослушайте песню птиц и попробуйте повторить ее.',
            () => {
                if (canSkip) {
                    this.dismissHint();
                }
            }
        );

        this.showHint(this.introOverlay, () => {
            canSkip = true;
            this.startRound();
        }, 4);
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
