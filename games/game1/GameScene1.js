import Phaser from 'phaser';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

const BIRD_WIDTH = 162;
const BIRD_HEIGHT = 153;

// Координаты левого верхнего угла каждой птицы взяты из макета.
// voice — синтезированный голос вместо настоящей записи: набор коротких
// росчерков, у каждого частота едет от from к to за duration, затем пауза gap.
const BIRDS = [
    {
        x: 709,
        y: 151,
        // Две нисходящие свистовые ноты.
        voice: [
            { from: 4400, to: 3600, duration: 0.10, gap: 0.07 },
            { from: 4400, to: 3400, duration: 0.12, gap: 0 }
        ]
    },
    {
        x: 972,
        y: 276,
        // Быстрая восходящая трель в четыре счёта.
        voice: [
            { from: 2900, to: 3500, duration: 0.05, gap: 0.035 },
            { from: 3100, to: 3800, duration: 0.05, gap: 0.035 },
            { from: 3300, to: 4100, duration: 0.05, gap: 0.035 },
            { from: 3500, to: 4400, duration: 0.07, gap: 0 }
        ]
    },
    {
        x: 960,
        y: 591,
        // Переливчатый росчерк вверх и обратно вниз.
        voice: [
            { from: 2400, to: 4000, duration: 0.11, gap: 0.04 },
            { from: 4000, to: 2300, duration: 0.13, gap: 0 }
        ]
    },
    {
        x: 1404,
        y: 525,
        // Низкое короткое чириканье в два счёта.
        voice: [
            { from: 2100, to: 2500, duration: 0.06, gap: 0.05 },
            { from: 2000, to: 2300, duration: 0.07, gap: 0 }
        ]
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

const SEQUENCE_LENGTH = 4;

const DEMO_START_DELAY = 700;
const DEMO_FLASH_DURATION = 500;
const DEMO_FLASH_GAP = 250;
const INPUT_FLASH_DURATION = 300;

const CHIRP_VOLUME = 0.16;

export class GameScene1 extends Phaser.Scene {

    constructor() {
        super('GameScene1');
    }

    create() {
        this.phase = 'intro';
        this.paused = false;
        this.completed = false;
        this.sequence = [];
        this.inputIndex = 0;
        this.demoStep = 0;

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
                voice: data.voice,
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

    buildSequence() {
        const sequence = [];

        while (sequence.length < SEQUENCE_LENGTH) {
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

        this.sequence = this.buildSequence();
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
            this.repeatOverlay.setVisible(true);
            return;
        }

        this.flashBird(this.sequence[this.demoStep], DEMO_FLASH_DURATION);
        this.demoStep += 1;

        this.time.delayedCall(
            DEMO_FLASH_DURATION + DEMO_FLASH_GAP,
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
            bird.timer = null;
            bird.box.setFillStyle(COLOR_BIRD);
        });
    }

    failRound() {
        this.phase = 'over';
        this.loseOverlay.setVisible(true);
    }

    winRound() {
        this.phase = 'over';
        this.winOverlay.setVisible(true);
    }

    restartRound() {
        this.loseOverlay.setVisible(false);
        this.resetBirds();

        this.phase = 'intro';
        this.introOverlay.setVisible(true);
    }

    unlockAudio() {
        const context = this.sound && this.sound.context;

        if (!context) {
            return;
        }

        this.audioContext = context;

        if (context.state === 'suspended') {
            context.resume();
        }
    }

    // Заглушка вместо голосов птиц: настоящих аудиозаписей в проекте пока нет.
    playVoice(index) {
        const context = this.audioContext;

        if (!context) {
            return;
        }

        let startTime = context.currentTime;

        this.birds[index].voice.forEach(chirp => {
            this.playChirp(context, startTime, chirp);
            startTime += chirp.duration + chirp.gap;
        });
    }

    playChirp(context, startTime, chirp) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const endTime = startTime + chirp.duration;

        // Треугольная волна ярче синуса — ближе к птичьему тембру.
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(chirp.from, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(chirp.to, endTime);

        // Экспоненциальный спад не умеет приходить в ноль, поэтому берём
        // пренебрежимо малое значение как тишину.
        // Держим громкость почти до конца росчерка: именно съезжающая частота
        // делает звук птичьим, и при быстром затухании её не слышно.
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(
            CHIRP_VOLUME,
            startTime + chirp.duration * 0.12
        );
        gain.gain.setValueAtTime(
            CHIRP_VOLUME,
            startTime + chirp.duration * 0.75
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(startTime);
        oscillator.stop(endTime + 0.02);
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
        button.on('pointerdown', () => this.togglePause());

        this.root.add([button, label]);
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
            () => this.startInput()
        );
    }

    createLoseOverlay() {
        this.loseOverlay = this.createOverlay(
            'Попробуйте снова',
            () => this.restartRound()
        );
    }

    createWinOverlay() {
        this.winOverlay = this.createOverlay(
            'Ура пабеда едем дальше',
            () => this.finishGame()
        );
    }

    createIntroOverlay() {
        this.introOverlay = this.createOverlay(
            'Прослушайте песню птиц и попробуйте повторить ее.',
            () => this.startRound()
        );

        this.introOverlay.setVisible(true);
    }

    togglePause() {
        if (this.phase === 'intro' || this.phase === 'over') {
            return;
        }

        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
        this.time.paused = this.paused;
    }

    finishGame() {
        if (this.completed) {
            return;
        }

        this.completed = true;
        this.events.emit('game1:complete');
    }

    setupInput() {
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());

        this.scale.on('resize', this.handleResize, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
        });
    }

    handleResize() {
        this.calculateScale();

        this.root.setPosition(this.offsetX, this.offsetY);
        this.root.setScale(this.gameScale);
    }
}
