// Phaser подключается глобально (resource/lib/phaser.min.js), как во всей игре.
import { createSubscribeForm } from './SubscribeForm.js';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const BACKGROUND_KEY = 'finishBackground';

const MAP = {
    key: 'finishMap',
    // Левый верхний угол: −3,33333% × 18,33333% макета 1920×1080.
    xFrac: -0.0333333,
    yFrac: 0.1833333,
    width: 1673.58,
    height: 975
};

const STATS_PANEL = {
    key: 'finishStatsPanel',
    // Левый верхний угол: 3,229167% × 2,962963% макета 1920×1080.
    xFrac: 0.03229167,
    yFrac: 0.02962963,
    width: 681,
    height: 344,
    color: '#6E6056',
    title: 'В Ясной Поляне Вы бы:',
    rows: [
        { icon: 'finish_steps', width: 31, height: 31, text: 'Прошли 22. 000 шагов' },
        { icon: 'finish_calories', width: 32, height: 32, text: 'Сожгли 5. 000 ккал' },
        { icon: 'finish_photos', width: 31, height: 27, text: 'Сделали 126 живописных фото' },
        { icon: 'finish_stories', width: 31, height: 31, text: 'Выложили 10 сториз.' }
    ]
};

const SUBSCRIBE_PANEL = {
    key: 'finishSubscribePanel',
    // Левый верхний угол: 83,85417% × 56,01852% макета 1920×1080.
    xFrac: 0.8385417,
    yFrac: 0.5601852,
    width: 290,
    height: 82,
    text: 'Подписывайтесь!',
    color: '#6E6056'
};

const EMAIL_FIELD = {
    key: 'finishEmailField',
    // Левый верхний угол: 85,3125% × 67,22222% макета 1920×1080.
    xFrac: 0.853125,
    yFrac: 0.6722222,
    width: 237,
    height: 41,
    placeholder: 'ваш email'
};

const SOCIAL_LINKS = {
    // Левый верхний угол: 85,52083% × 74,16667% макета 1920×1080.
    xFrac: 0.8552083,
    yFrac: 0.7416667,
    width: 190,
    height: 75,
    buttonSize: 75,
    items: [
        { name: 'ВКонтакте', image: 'finish_vk.png', href: 'https://vk.ru/yaspol' },
        { name: 'Telegram', image: 'finish_telegram.png', href: 'https://t.me/ypmuseum' }
    ]
};

const REPLAY_BUTTON = {
    // Левый верхний угол: 84,47917% × 89,90741% макета 1920×1080.
    xFrac: 0.8447917,
    yFrac: 0.8990741,
    width: 233,
    height: 66,
    text: 'Повторить'
};

const COLOR_BACKGROUND = 0x604c3f;

export class FinishScene extends Phaser.Scene {

    constructor() {
        super('FinishScene');
    }

    preload() {
        this.load.image(BACKGROUND_KEY, `${import.meta.env.BASE_URL}images/backgrounds/finish_screen.png`);
        this.load.image(MAP.key, `${import.meta.env.BASE_URL}images/backgrounds/finish_map.png`);
        this.load.image(STATS_PANEL.key, `${import.meta.env.BASE_URL}images/icon_UI/finish_stats_panel.png`);
        this.load.image(SUBSCRIBE_PANEL.key, `${import.meta.env.BASE_URL}images/icon_UI/finish_subscribe_panel.png`);
        this.load.image(EMAIL_FIELD.key, `${import.meta.env.BASE_URL}images/icon_UI/finish_email_field.png`);
        STATS_PANEL.rows.forEach(({ icon }) => {
            this.load.svg(icon, `${import.meta.env.BASE_URL}images/icon_UI/${icon}.svg`, { scale: 4 });
        });
    }

    create() {
        this.textObjects = [];
        this.createFrame();
        this.createBackground();
        this.createMap();
        this.createStatsPanel();
        this.createSubscribePanel();
        this.createEmailField();
        this.createSocialLinks();
        this.createReplayButton();
        this.refreshFonts();
    }

    createBackground() {
        this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);

        // Фон занимает только макет. Масштабирование всего холста делает FIT.
        this.background = this.add.image(0, 0, BACKGROUND_KEY)
            .setOrigin(0, 0)
            .setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
        this.frame.add(this.background);
    }

    createFrame() {
        this.frame = this.add.container(0, 0);

        // Clip content: содержимое не выходит за границы макета 1920×1080.
        const clip = this.make.graphics({ x: 0, y: 0 }, false);
        clip.fillStyle(0xffffff);
        clip.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        this.frame.setMask(clip.createGeometryMask());

        this.events.once('shutdown', () => {
            this.frame.clearMask(true);
            clip.destroy();
        });
    }

    createMap() {
        const map = this.add.image(BASE_WIDTH * MAP.xFrac, BASE_HEIGHT * MAP.yFrac, MAP.key)
            .setOrigin(0, 0)
            .setDisplaySize(MAP.width, MAP.height);
        this.frame.add(map);
    }

    createStatsPanel() {
        const { width, height, color } = STATS_PANEL;
        const panel = this.add.container(BASE_WIDTH * STATS_PANEL.xFrac, BASE_HEIGHT * STATS_PANEL.yFrac);
        this.statsPanel = panel;
        this.frame.add(panel);

        const background = this.add.image(0, 0, STATS_PANEL.key)
            .setOrigin(0, 0)
            .setDisplaySize(width, height);
        panel.add(background);

        // Все отступы и размеры — относительно родительской плашки.
        const title = this.add.text(width / 2, height * (44 / 344), STATS_PANEL.title, {
            fontFamily: 'Philosopher, Georgia, serif',
            fontStyle: 'bold',
            fontSize: height * (48 / 344),
            color,
            align: 'center',
            wordWrap: { width: width * (565 / 681) },
            resolution: 2
        }).setOrigin(0.5, 0);
        panel.add(title);

        this.textObjects.push(title);
        const textX = width * (132 / 681);
        const rightPadding = width * (38 / 681);
        const rowStep = height * (44 / 344);

        STATS_PANEL.rows.forEach((row, index) => {
            const centerY = height * (137 / 344) + rowStep * index;
            const icon = this.add.image(width * (96 / 681), centerY, row.icon)
                .setDisplaySize(width * (row.width / 681), height * (row.height / 344));
            const text = this.add.text(textX, centerY, row.text, {
                fontFamily: 'Ysabeau, Arial, sans-serif',
                fontSize: height * (36 / 344),
                color,
                wordWrap: { width: width - textX - rightPadding },
                resolution: 2
            }).setOrigin(0, 0.5);
            panel.add([icon, text]);
            this.textObjects.push(text);
        });
    }

    createSubscribePanel() {
        const { width, height, text, color } = SUBSCRIBE_PANEL;
        const panel = this.add.container(BASE_WIDTH * SUBSCRIBE_PANEL.xFrac, BASE_HEIGHT * SUBSCRIBE_PANEL.yFrac);
        this.subscribePanel = panel;
        this.frame.add(panel);

        const background = this.add.image(0, 0, SUBSCRIBE_PANEL.key)
            .setOrigin(0, 0)
            .setDisplaySize(width, height);
        const label = this.add.text(width / 2, height / 2, text, {
            fontFamily: 'Philosopher, Georgia, serif',
            fontStyle: 'bold',
            fontSize: height * (26 / 82),
            color,
            align: 'center',
            lineSpacing: 0,
            letterSpacing: 0,
            wordWrap: { width: width * (250 / 290) },
            resolution: 2
        }).setOrigin(0.5);
        panel.add([background, label]);
        this.textObjects.push(label);
    }

    createEmailField() {
        const { width, height, placeholder } = EMAIL_FIELD;
        const x = BASE_WIDTH * EMAIL_FIELD.xFrac;
        const y = BASE_HEIGHT * EMAIL_FIELD.yFrac;
        const background = this.add.image(x, y, EMAIL_FIELD.key)
            .setOrigin(0, 0)
            .setDisplaySize(width, height);
        this.frame.add(background);

        const form = createSubscribeForm({ width, height, placeholder });
        this.emailInput = this.add.dom(x, y, form.node)
            .setOrigin(0, 0);
        this.frame.add(this.emailInput);

        // Phaser отменяет стандартный mousedown холста, поэтому снимаем
        // фокус с поля явно при нажатии на остальную часть игры.
        const blurOnCanvas = () => form.input.blur();
        this.input.on('pointerdown', blurOnCanvas);
        this.events.once('shutdown', () => {
            this.input.off('pointerdown', blurOnCanvas);
            form.destroy();
        });
    }

    createSocialLinks() {
        const { width, height, buttonSize, items } = SOCIAL_LINKS;
        const nav = document.createElement('nav');
        nav.className = 'finish-social-links';
        nav.setAttribute('aria-label', 'Ясная Поляна в социальных сетях');
        nav.style.width = `${width}px`;
        nav.style.height = `${height}px`;

        items.forEach(({ name, image, href }, index) => {
            const link = document.createElement('a');
            link.className = 'finish-social-link';
            link.href = href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('aria-label', `${name} — открыть в новой вкладке`);
            link.style.left = `${index * (width - buttonSize)}px`;
            link.style.width = `${buttonSize}px`;
            link.style.height = `${buttonSize}px`;

            const icon = document.createElement('img');
            icon.src = `${import.meta.env.BASE_URL}images/icon_UI/${image}`;
            icon.alt = '';
            icon.width = buttonSize;
            icon.height = buttonSize;
            icon.draggable = false;
            link.append(icon);
            nav.append(link);
        });

        this.socialLinks = this.add.dom(
            BASE_WIDTH * SOCIAL_LINKS.xFrac,
            BASE_HEIGHT * SOCIAL_LINKS.yFrac,
            nav
        ).setOrigin(0, 0);
        this.frame.add(this.socialLinks);
    }

    createReplayButton() {
        const { width, height, text } = REPLAY_BUTTON;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'finish-replay-button';
        button.textContent = text;
        button.style.width = `${width}px`;
        button.style.height = `${height}px`;
        button.style.backgroundImage = `url("${import.meta.env.BASE_URL}images/icon_UI/finish_replay_button.png")`;

        const returnToMenu = () => {
            // При входе основная страница должна открыть меню, а не сохранённую сцену.
            window.VN.systems.GameState.markAtMenu();
            window.location.assign(import.meta.env.BASE_URL);
        };
        button.addEventListener('click', returnToMenu);
        this.events.once('shutdown', () => button.removeEventListener('click', returnToMenu));

        this.replayButton = this.add.dom(
            BASE_WIDTH * REPLAY_BUTTON.xFrac,
            BASE_HEIGHT * REPLAY_BUTTON.yFrac,
            button
        ).setOrigin(0, 0);
        this.frame.add(this.replayButton);
    }

    refreshFonts() {
        // Phaser рисует текст в текстуры: обновляем их после загрузки веб-шрифтов.
        const textObjects = this.textObjects;
        if (document.fonts) {
            Promise.all([
                document.fonts.load('bold 48px Philosopher', STATS_PANEL.title),
                document.fonts.load('bold 26px Philosopher', SUBSCRIBE_PANEL.text),
                document.fonts.load('36px Ysabeau', STATS_PANEL.rows.map(row => row.text).join(' '))
            ]).then(() => {
                textObjects.forEach(text => {
                    if (text.scene) text.style.update(true);
                });
            }).catch(() => { /* При недоступном шрифте остаётся системный запасной. */ });
        }
    }

}
