// Phaser подключается глобально (resource/lib/phaser.min.js), как во всей игре.

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const FINISH_IMAGES = `${import.meta.env.BASE_URL}images/icon_UI/`;

const BACKGROUND = {
    image: 'game5.png',
    color: '#8fa3a3'
};

const MAP = {
    key: 'finishRouteMap',
    image: 'map.png',
    x: 0,
    y: 250,
    width: 1420,
    height: 831
};

const STATS_PANEL = {
    key: 'finishStatsPanel',
    x: 122,
    y: 58,
    width: 846,
    height: 420,
    color: '#231f20',
    title: 'Маршрут в Ясной Поляне',
    iconX: 268,
    textX: 315,
    firstRowY: 152,
    rowStep: 65,
    rows: [
        { icon: 'finishBoot', image: 'boot.png', width: 43, height: 46, text: '5 350 шагов' },
        { icon: 'finishKilometers', image: 'kilometrs.png', width: 51, height: 53, text: '4 километра' },
        { icon: 'finishPhoto', image: 'photo.png', width: 40, height: 31, text: '126 живописных фото' },
        { icon: 'finishStories', image: 'stories.png', width: 27, height: 44, text: '10 сториз' }
    ]
};

const SOCIAL_LINKS = {
    x: 1540,
    size: 221,
    items: [
        { name: 'ВКонтакте', image: 'Group 60.png', href: 'https://vk.ru/yaspol', y: 120 },
        { name: 'Telegram', image: 'Group 62.png', href: 'https://t.me/ypmuseum', y: 380 }
    ]
};

const REPLAY_BUTTON = {
    x: 1253,
    y: 832,
    width: 575,
    height: 153,
    text: 'Повторить'
};

export class FinishScene extends Phaser.Scene {

    constructor() {
        super('FinishScene');
    }

    preload() {
        const progress = window.VN.systems.StartupScreen.track(this);
        if (progress) {
            this.load.on('progress', progress);
            this.events.once('shutdown', () => this.load.off('progress', progress));
        }
        // DOM-кнопки и CSS-фон тоже должны загрузиться до снятия заставки.
        this.load.image('finishBackground', `${import.meta.env.BASE_URL}images/backgrounds/${BACKGROUND.image}`);
        this.load.image('finishReplay', `${FINISH_IMAGES}main_button.png`);
        SOCIAL_LINKS.items.forEach(({ image }, index) => {
            this.load.image(`finishSocial${index}`, `${FINISH_IMAGES}${image}`);
        });
        this.load.image(MAP.key, `${FINISH_IMAGES}${MAP.image}`);
        this.load.image(STATS_PANEL.key, `${import.meta.env.BASE_URL}images/icon_UI/finish_stats_panel.png`);
        STATS_PANEL.rows.forEach(({ icon, image }) => {
            this.load.image(icon, `${FINISH_IMAGES}${image}`);
        });
    }

    create() {
        this.textObjects = [];
        this.createFrame();
        this.createBackground();
        this.createMap();
        this.createStatsPanel();
        this.createSocialLinks();
        this.createReplayButton();
        this.refreshFonts();
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

    createBackground() {
        // Холст прозрачный, а обои лежат под ним на всё окно (cover):
        // так они заполняют и поля, которые оставляет FIT, без стыков.
        const app = this.game.canvas.parentElement;
        // Используем уже загруженный Image: повторный CSS-запрос при no-store
        // мог бы оставить финал без фона после снятия заставки.
        const background = this.textures.get('finishBackground').getSourceImage();
        background.className = 'finish-background';
        background.alt = '';
        background.draggable = false;
        app.style.background = BACKGROUND.color;
        app.prepend(background);
        this.events.once('shutdown', () => {
            background.remove();
            app.style.background = '';
        });
    }

    createMap() {
        const map = this.add.image(MAP.x, MAP.y, MAP.key)
            .setOrigin(0, 0)
            .setDisplaySize(MAP.width, MAP.height);
        this.frame.add(map);
    }

    createStatsPanel() {
        const { width, height, color } = STATS_PANEL;
        const panel = this.add.container(STATS_PANEL.x, STATS_PANEL.y);
        this.statsPanel = panel;
        this.frame.add(panel);

        const background = this.add.image(0, 0, STATS_PANEL.key)
            .setOrigin(0, 0)
            .setDisplaySize(width, height);
        panel.add(background);

        const title = this.add.text(width / 2, 50, STATS_PANEL.title, {
            fontFamily: 'Philosopher, Georgia, serif',
            fontStyle: 'bold',
            fontSize: 60,
            color,
            align: 'center',
            resolution: 2
        }).setOrigin(0.5, 0);
        panel.add(title);
        this.textObjects.push(title);

        STATS_PANEL.rows.forEach((row, index) => {
            const centerY = STATS_PANEL.firstRowY + STATS_PANEL.rowStep * index;
            const icon = this.add.image(STATS_PANEL.iconX, centerY, row.icon)
                .setDisplaySize(row.width, row.height);
            const text = this.add.text(STATS_PANEL.textX, centerY, row.text, {
                fontFamily: 'Ysabeau, Arial, sans-serif',
                fontSize: 40,
                color,
                resolution: 2
            }).setOrigin(0, 0.5);
            panel.add([icon, text]);
            this.textObjects.push(text);
        });
    }

    createSocialLinks() {
        const { x, size, items } = SOCIAL_LINKS;
        this.socialLinks = items.map(({ name, href, y }, index) => {
            const link = document.createElement('a');
            link.className = 'finish-social-link';
            link.href = href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('aria-label', `${name} — открыть в новой вкладке`);
            link.style.width = `${size}px`;
            link.style.height = `${size}px`;

            const icon = this.textures.get(`finishSocial${index}`).getSourceImage();
            icon.alt = '';
            icon.width = size;
            icon.height = size;
            icon.draggable = false;
            link.append(icon);

            const element = this.add.dom(x, y, link).setOrigin(0, 0);
            this.frame.add(element);
            return element;
        });
    }

    createReplayButton() {
        const { width, height, text } = REPLAY_BUTTON;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'finish-replay-button';
        const background = this.textures.get('finishReplay').getSourceImage();
        background.alt = '';
        background.draggable = false;
        const label = document.createElement('span');
        label.textContent = text;
        button.append(background, label);
        button.style.width = `${width}px`;
        button.style.height = `${height}px`;
        const returnToMenu = () => {
            // При входе основная страница должна открыть меню, а не сохранённую сцену.
            window.VN.systems.GameState.markAtMenu();
            window.location.assign(import.meta.env.BASE_URL);
        };
        button.addEventListener('click', returnToMenu);
        this.events.once('shutdown', () => button.removeEventListener('click', returnToMenu));

        this.replayButton = this.add.dom(REPLAY_BUTTON.x, REPLAY_BUTTON.y, button)
            .setOrigin(0, 0);
        this.frame.add(this.replayButton);
    }

    refreshFonts() {
        // Phaser рисует текст в текстуры: обновляем их после загрузки веб-шрифтов.
        const textObjects = this.textObjects;
        if (document.fonts) {
            Promise.all([
                document.fonts.load('bold 60px Philosopher', STATS_PANEL.title),
                document.fonts.load('40px Ysabeau', STATS_PANEL.rows.map(row => row.text).join(' '))
            ]).then(() => {
                textObjects.forEach(text => {
                    if (text.scene) text.style.update(true);
                });
            }).catch(() => { /* При недоступном шрифте остаётся системный запасной. */ });
        }
    }

}
