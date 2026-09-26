// import Phaser from 'phaser';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

const BIRD_WIDTH = 162;
const BIRD_HEIGHT = 153;

// Координаты левого верхнего угла каждой птицы взяты из макета.
// У каждой птицы своя запись относительно resource/sound.
const BIRDS = [
    {
        x: 709,
        y: 151,
        voice: 'voice_and_sound/test_bird_1.mp3'
    },
    {
        x: 972,
        y: 276,
        voice: 'voice_and_sound/test_bird_2.mp3'
    },
    {
        x: 960,
        y: 591,
        voice: 'voice_and_sound/test_bird_3.mp3'
    },
    {
        x: 1404,
        y: 525,
        voice: 'voice_and_sound/test_bird_4.mp3'
    }
];

const MENU_BUTTON = {
    x: 1830,
    y: 14,
    width: 72,
    height: 66
};

const COLOR_BACKGROUND = 0xe5e5e5;
const COLOR_BIRD = 0x5bd055;
const COLOR_BIRD_ACTIVE = 0xff334a;
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

    preload() {
        window.VN?.systems.SceneAudio?.preload(this);
        for (const bird of BIRDS) {
            window.VN.systems.AudioManager.load(this, bird.voice);
        }
    }

    create() {
        window.VN?.systems.SceneAudio?.enter(this);
        this.phase = 'intro';
        this.paused = false;
        this.completed = false;
        this.sequence = [];
        this.inputIndex = 0;
        this.demoStep = 0;
        this.round_number = 2;
        this.activeHint = null;

        this.calculateScale();
        this.createRoot();
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
    }

    calculateScale() {
        const width = this.scale.width || BASE_WIDTH;
        const height = this.scale.height || BASE_HEIGHT;

        this.gameScale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
        this.offsetX = (width - BASE_WIDTH * this.gameScale) / 2;
        this.offsetY = (height - BASE_HEIGHT * this.gameScale) / 2;
    }

    createRoot() {
        this.root = this.add.container(this.offsetX, this.offsetY);
        this.root.setScale(this.gameScale);
    }

    createBackground() {
        this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);

        const background = this.add.rectangle(
            0,
            0,
            BASE_WIDTH,
            BASE_HEIGHT,
            COLOR_BACKGROUND
        ).setOrigin(0);

        this.root.add(background);
    }

    createBirds() {
        this.birds = BIRDS.map((data, index) => {
            const bird = {
                voice: window.VN.systems.AudioManager.add(this, data.voice),
                timer: null
            };

            bird.box = this.add.rectangle(
                data.x,
                data.y,
                BIRD_WIDTH,
                BIRD_HEIGHT,
                COLOR_BIRD
            ).setOrigin(0);

            bird.box.setInteractive({ useHandCursor: true });
            bird.box.on('pointerdown', () => this.selectBird(index));

            this.root.add(bird.box);

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
            this.failRound();
            return;
        }

        this.inputIndex += 1;

        if (this.inputIndex >= this.sequence.length) {
            this.winRound();
        }
    }

    flashBird(index, duration) {
        const bird = this.birds[index];

        this.playVoice(index);
        bird.box.setFillStyle(COLOR_BIRD_ACTIVE);

        if (bird.timer) {
            bird.timer.remove();
        }

        bird.timer = this.time.delayedCall(duration, () => {
            bird.box.setFillStyle(COLOR_BIRD);
            bird.timer = null;
        });
    }

    resetBirds() {
        this.time.removeAllEvents();

        this.birds.forEach(bird => {
            bird.voice.stop();
            bird.timer = null;
            bird.box.setFillStyle(COLOR_BIRD);
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

        this.root.add([button, label]);
    }

    showHint(overlay, onDismiss) {
        this.clearHint();
        overlay.setVisible(true);

        this.activeHint = {
            overlay,
            onDismiss,
            timer: this.time.delayedCall(this.hintDurationSeconds * 1000, () => this.dismissHint())
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

        this.root.add(overlay);

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
        this.introOverlay = this.createOverlay(
            'Прослушайте песню птиц и попробуйте повторить ее.',
            () => this.dismissHint()
        );

        this.showHint(this.introOverlay, () => this.startRound());
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
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());

        this.scale.on('resize', this.handleResize, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.clearHint();
            this.birds.forEach(bird => bird.voice.destroy());
            this.scale.off('resize', this.handleResize, this);
        });
    }

    handleResize() {
        this.calculateScale();

        this.root.setPosition(this.offsetX, this.offsetY);
        this.root.setScale(this.gameScale);
    }
}
