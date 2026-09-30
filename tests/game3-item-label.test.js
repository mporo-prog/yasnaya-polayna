import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';

globalThis.Phaser = {
    Scene: class {},
    Scenes: { Events: { SHUTDOWN: 'shutdown' } }
};
const { GameScene3 } = await import('../games/game3/GameScene3.js');

class DisplayObject extends EventEmitter {
    constructor(x, y, width = 324, height = 340) {
        super();
        Object.assign(this, { x, y, width, height, visible: true });
    }
    setOrigin() { return this; }
    setInteractive() { this.interactive = true; return this; }
    disableInteractive() { this.interactive = false; return this; }
    destroy() {
        this.destroyed = true;
        for (const child of this.list ?? []) child.destroy();
    }
    setTexture(key) {
        this.texture = { key };
        const path = key.startsWith('game3-') ? `images/game3/${key.slice(6)}.png` : key;
        const png = readFileSync(new URL(`../public/${path}`, import.meta.url));
        this.width = png.readUInt32BE(16);
        this.height = png.readUInt32BE(20);
        return this;
    }
    setDisplaySize(width, height) {
        this.displayWidth = width;
        this.displayHeight = height;
        return this;
    }
    setVisible(value) { this.visible = value; return this; }
    setText(value) { this.text = value; return this; }
    setLineSpacing(value) { this.lineSpacing = value; return this; }
}

function fixture(t, coarse = false) {
    const media = new EventEmitter();
    const fonts = new EventEmitter();
    for (const source of [media, fonts]) {
        source.addEventListener = source.on.bind(source);
        source.removeEventListener = source.off.bind(source);
    }
    media.matches = coarse;
    globalThis.window = { matchMedia: () => media };
    globalThis.document = { fonts };
    const scene = new GameScene3();
    const animations = [];
    Object.assign(scene, {
        started: true, paused: false, finished: false, activeHint: null,
        arrivedCount: 0, hintDurationSeconds: 2,
        winOverlay: new DisplayObject(0, 0).setVisible(false),
        time: { delayedCall: () => ({ remove() {} }) },
        events: new EventEmitter(), input: new EventEmitter(),
        background: { stage: {
            list: [],
            add(item) { this.list.push(item); },
            bringToTop(item) { this.list.splice(this.list.indexOf(item), 1); this.list.push(item); }
        } },
        tweens: { killTweensOf() {}, add: config => animations.push(config) },
        add: {
            image: (x, y, key) => new DisplayObject(x, y).setTexture(key),
            container: (x, y, list) => Object.assign(new DisplayObject(x, y), { list }),
            text: (x, y, text, style) => Object.assign(new DisplayObject(x, y), {
                text, style: { ...style, metrics: { fontSize: 36 } }
            })
        }
    });
    scene.createItems();
    scene.createItemNamePanel();
    t.after(() => scene.events.emit('shutdown'));
    return { scene, media, fonts, animations };
}

const mouse = { wasTouch: false };
const touch = { wasTouch: true };

test('desktop hover shows each name and green panel; leaving restores the original panel', (t) => {
    const { scene } = fixture(t);
    assert.equal(scene.itemNamePanel.visible, false);
    const expected = new Map([
        ['egg', 'ЯЙЦО ВСМЯТКУ'],
        ['sandwich', 'БУТЕРБРОД С БУЖЕНИНОЙ'],
        ['porridge', 'ГРЕЧНЕВАЯ КАША'],
        ['macaroni-cheese', 'МАКАРОНЫ С СЫРОМ'],
        ['cup', 'ЧЁРНЫЙ ЧАЙ'],
        ['sparkling-water', 'МИНЕРАЛЬНАЯ ВОДА']
    ]);
    for (const item of scene.items) {
        const original = { texture: item.box.texture.key, width: item.box.width, height: item.box.height };
        item.box.emit('pointerover', mouse);
        assert.equal(scene.itemNamePanel.visible, true);
        assert.equal(scene.itemNameText.text, expected.get(item.id));
        assert.equal(item.box.texture.key, item.hoverPanelTexture);
        assert.equal(item.box.displayWidth, original.width);
        assert.equal(item.box.displayHeight, original.height);
        item.box.emit('pointerout', mouse);
        assert.equal(scene.itemNamePanel.visible, false);
        assert.equal(item.box.texture.key, original.texture);
        assert.equal(item.box.displayWidth, original.width);
        assert.equal(item.box.displayHeight, original.height);
    }
});

test('an old pointerout cannot clear the name of a newly hovered item', (t) => {
    const { scene } = fixture(t);
    const [egg, sandwich] = scene.items;
    egg.box.emit('pointerover', mouse);
    sandwich.box.emit('pointerover', mouse);
    egg.box.emit('pointerout', mouse);
    assert.equal(egg.box.texture.key, egg.panelTexture);
    assert.equal(sandwich.box.texture.key, sandwich.hoverPanelTexture);
    assert.equal(scene.itemNameText.text, 'БУТЕРБРОД С БУЖЕНИНОЙ');
    assert.equal(scene.itemNamePanel.visible, true);
    scene.input.emit('gameout');
    assert.equal(scene.itemNamePanel.visible, false);
    assert.equal(sandwich.box.texture.key, sandwich.panelTexture);
});

test('touch panel is always visible and retains the last tapped name after release', (t) => {
    const { scene } = fixture(t, true);
    const egg = scene.items.find(item => item.id === 'egg');
    const cup = scene.items.find(item => item.id === 'cup');
    assert.equal(scene.itemNamePanel.visible, true);
    assert.equal(scene.itemNameText.text, 'НАЖМИ НА ПРЕДМЕТ');
    egg.box.emit('pointerover', touch);
    assert.equal(scene.itemNameText.text, 'НАЖМИ НА ПРЕДМЕТ');
    egg.box.emit('pointerdown', touch);
    egg.box.emit('pointerout', touch);
    scene.input.emit('gameout');
    assert.equal(scene.itemNameText.text, 'ЯЙЦО ВСМЯТКУ');
    assert.equal(scene.itemNamePanel.visible, true);
    cup.box.emit('pointerdown', touch);
    cup.box.emit('pointerout', touch);
    assert.equal(scene.itemNameText.text, 'ЧЁРНЫЙ ЧАЙ');
    assert.equal(scene.itemNamePanel.visible, true);
    assert.deepEqual(scene.items.filter(item => item.placed).map(item => item.id), ['egg', 'cup']);
    assert.ok(scene.items.every(item => !item.removed));
    assert.ok(scene.items.every(item => item.box.texture.key === item.panelTexture));
});

test('touch on a hybrid device persists, then a mouse hover restores desktop behavior', (t) => {
    const { scene } = fixture(t);
    const [egg, sandwich] = scene.items;
    sandwich.box.emit('pointerover', mouse);
    egg.box.emit('pointerdown', touch);
    assert.ok(scene.items.every(item => item.box.texture.key === item.panelTexture));
    egg.box.emit('pointerout', touch);
    assert.equal(scene.itemNamePanel.visible, true);
    sandwich.box.emit('pointerover', mouse);
    assert.equal(sandwich.box.texture.key, sandwich.hoverPanelTexture);
    sandwich.box.emit('pointerout', mouse);
    assert.equal(scene.itemNamePanel.visible, false);
    assert.equal(sandwich.box.texture.key, sandwich.panelTexture);
});

test('labels do not react during an instruction, pause, or after the game ends', (t) => {
    const { scene } = fixture(t);
    const item = scene.items.find(item => item.id === 'sandwich');
    for (const [key, value] of [['started', false], ['paused', true], ['finished', true], ['activeHint', {}]]) {
        const original = scene[key];
        scene[key] = value;
        item.box.emit('pointerover', mouse);
        item.box.emit('pointerdown', mouse);
        assert.equal(scene.itemNamePanel.visible, false);
        assert.equal(item.box.texture.key, item.panelTexture);
        assert.equal(item.removed, false);
        scene[key] = original;
    }
});

for (const [mode, pointer, order] of [
    ['mouse', mouse, ['cup', 'porridge', 'egg']],
    ['touch', touch, ['egg', 'porridge', 'cup']]
]) {
    test(`${mode} selection hides the correct item's panel and moves its PNG to its own fixed position`, (t) => {
        const { scene, animations } = fixture(t, pointer.wasTouch);
        const positions = { cup: [651, 709], egg: [900, 510], porridge: [945, 773] };
        assert.deepEqual(scene.items.filter(item => item.correct).map(item => item.id), ['egg', 'porridge', 'cup']);
        for (const id of order) {
            const item = scene.items.find(item => item.id === id);
            item.box.emit('pointerover', pointer);
            item.box.emit('pointerdown', pointer);
            assert.equal(item.box.visible, false);
            assert.equal(item.box.interactive, false);
            assert.equal(item.image.visible, true);
            assert.equal(item.placed, true);
            assert.equal(item.removed, false);
            assert.equal(scene.background.stage.list.at(-2), item.container);
            assert.equal(scene.background.stage.list.at(-1), scene.itemNamePanel);
            assert.equal(scene.itemNamePanel.visible, pointer.wasTouch);
            const animation = animations.at(-1);
            assert.equal(animation.targets, item.container);
            assert.ok(Math.abs(animation.x - item.image.width / 2 - positions[id][0]) < 0.001);
            assert.ok(Math.abs(animation.y - item.image.height / 2 - positions[id][1]) < 0.001);
            const count = animations.length;
            const text = scene.itemNameText.text;
            item.box.emit('pointerdown', pointer);
            item.box.emit('pointerover', pointer);
            assert.equal(animations.length, count, 'a moving item cannot be selected again');
            assert.equal(scene.itemNameText.text, text);
            assert.equal(item.box.visible, false);
            assert.equal(scene.finished, false, 'wait for movement to finish');
        }
        assert.deepEqual(scene.rowItems.map(item => item.id), ['sandwich', 'macaroni-cheese', 'sparkling-water']);
        assert.ok(scene.rowItems.every(item => !item.removed && item.box.visible));
        for (const [index, animation] of animations.slice().reverse().entries()) {
            Object.assign(animation.targets, { x: animation.x, y: animation.y });
            animation.onComplete();
            assert.equal(scene.finished, index === animations.length - 1);
        }
        assert.equal(scene.winOverlay.visible, true);
        assert.equal(scene.arrivedCount, 3);
        for (const item of scene.items.filter(item => item.placed)) {
            const position = { x: item.container.x, y: item.container.y };
            item.box.emit('pointerdown', pointer);
            assert.equal(item.box.interactive, false);
            assert.equal(item.container.x, position.x);
            assert.equal(item.container.y, position.y);
        }
        assert.equal(animations.length, 3);
    });
}

for (const [mode, pointer] of [['mouse', mouse], ['touch', touch]]) {
    test(`${mode} selection removes only the three wrong items together with their panels`, (t) => {
        const { scene, animations } = fixture(t, pointer.wasTouch);
        const wrongIds = ['sandwich', 'macaroni-cheese', 'sparkling-water'];
        assert.deepEqual(scene.items.filter(item => item.correct === false).map(item => item.id), wrongIds);
        for (const id of wrongIds) {
            const item = scene.items.find(item => item.id === id);
            item.box.emit('pointerover', pointer);
            item.box.emit('pointerdown', pointer);
            assert.equal(item.removed, true);
            assert.equal(item.box.interactive, false);
            assert.ok(!scene.rowItems.includes(item));
            assert.equal(scene.hoveredItem, null);
            assert.equal(scene.itemNamePanel.visible, pointer.wasTouch);
            assert.equal(item.box.texture.key, item.panelTexture);
            const animation = animations.at(-1);
            assert.equal(animation.targets, item.container);
            assert.equal(animation.alpha, 0);
            const count = animations.length;
            item.box.emit('pointerdown', pointer);
            assert.equal(animations.length, count, 'repeated clicks cannot schedule removal twice');
            animation.onComplete();
            assert.ok(item.container.destroyed && item.image.destroyed && item.box.destroyed);
        }
        assert.equal(animations.length, 3);
        assert.deepEqual(scene.rowItems.map(item => item.id), ['egg', 'porridge', 'cup']);
        assert.ok(scene.rowItems.every(item => !item.removed && !item.container.destroyed));
        assert.equal(scene.finished, false);
    });
}

test('pause clears desktop hover, pointer changes update visibility, shutdown removes listeners', (t) => {
    const { scene, media, fonts } = fixture(t);
    scene.items[0].box.emit('pointerover', mouse);
    scene.events.emit('pause');
    assert.equal(scene.itemNamePanel.visible, false);
    assert.equal(scene.items[0].box.texture.key, scene.items[0].panelTexture);
    media.matches = true;
    media.emit('change');
    assert.equal(scene.itemNamePanel.visible, true);
    media.matches = false;
    media.emit('change');
    assert.equal(scene.itemNamePanel.visible, false);
    scene.events.emit('shutdown');
    assert.equal(scene.input.listenerCount('gameout'), 0);
    assert.equal(scene.events.listenerCount('pause'), 0);
    assert.equal(media.listenerCount('change'), 0);
    assert.equal(fonts.listenerCount('loadingdone'), 0);
});
