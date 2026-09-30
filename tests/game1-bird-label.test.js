import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';

globalThis.Phaser = {
    Scene: class {},
    Scenes: { Events: { SHUTDOWN: 'shutdown' } }
};
const { GameScene1 } = await import('../games/game1/GameScene1.js');

class DisplayObject extends EventEmitter {
    constructor(x, y) { super(); Object.assign(this, { x, y, visible: true }); }
    setOrigin() { return this; }
    setInteractive() { return this; }
    setTexture(key) { this.texture = key; return this; }
    setDisplaySize(width, height) { Object.assign(this, { width, height }); return this; }
    setVisible(visible) { this.visible = visible; return this; }
    setText(text) { this.text = text; return this; }
    setLineSpacing(lineSpacing) { this.lineSpacing = lineSpacing; return this; }
}

function fixture(t, { coarse = false, audio = true } = {}) {
    const media = new EventEmitter();
    const fonts = new EventEmitter();
    for (const source of [media, fonts]) {
        source.addEventListener = source.on.bind(source);
        source.removeEventListener = source.off.bind(source);
    }
    media.matches = coarse;
    globalThis.document = { fonts };
    globalThis.window = {
        matchMedia: () => media,
        VN: { systems: { AudioManager: { add: () => ({
            totalDuration: audio ? 1 : 0,
            isPlaying: false, isPaused: false, plays: 0,
            play() { this.plays += 1; this.isPlaying = audio; return audio; },
            stop() { this.isPlaying = false; this.isPaused = false; },
            destroy() { this.stop(); }
        }) } } }
    };
    const scene = new GameScene1();
    scene.init();
    let now = 0;
    let timers = [];
    Object.assign(scene, {
        phase: 'input', paused: false, completed: false, activeHint: null,
        sequence: [0, 1, 2, 3], inputIndex: 0, demoStep: 0,
        input: Object.assign(new EventEmitter(), { enabled: true, keyboard: new EventEmitter() }),
        events: new EventEmitter(), stage: { add() {} },
        add: {
            image(x, y, key) {
                const image = new DisplayObject(x, y).setTexture(key);
                if (key === 'images/game3/item_label_panel.png') {
                    const png = readFileSync(new URL(`../public/${key}`, import.meta.url));
                    image.width = png.readUInt32BE(16);
                    image.height = png.readUInt32BE(20);
                }
                return image;
            },
            text: (x, y, text, style) => Object.assign(new DisplayObject(x, y), {
                text, style: { ...style, metrics: { fontSize: 36 } }
            }),
            container: (x, y, list) => Object.assign(new DisplayObject(x, y), { list })
        },
        time: {
            delayedCall(delay, callback) {
                const timer = { at: now + delay, callback, removed: false,
                    remove() { this.removed = true; } };
                timers.push(timer);
                return timer;
            },
            removeAllEvents() { timers = []; }
        }
    });
    scene.repeatOverlay = new DisplayObject(0, 0).setVisible(false);
    scene.loseOverlay = new DisplayObject(0, 0).setVisible(false);
    scene.createBirds();
    scene.createBirdNamePanel();
    scene.setupInput();
    t.after(() => scene.events.emit('shutdown'));
    return { scene, media, fonts, advance(ms) {
        const end = now + ms;
        let timer;
        while ((timer = timers.filter(item => !item.removed && item.at <= end)
            .sort((a, b) => a.at - b.at)[0])) {
            now = timer.at;
            timer.removed = true;
            timer.callback();
            scene.update();
        }
        now = end;
        scene.update();
    } };
}

const mouse = { wasTouch: false };
const touch = { wasTouch: true };

test('desktop hover shows every bird name and leaving hides the panel', (t) => {
    const { scene } = fixture(t);
    assert.equal(scene.birdNamePanel.visible, false);
    const names = ['ЗЯБЛИК', 'ЗАРЯНКА', 'КОРОСТЕЛЬ', 'ДРОЗД'];
    for (const [index, bird] of scene.birds.entries()) {
        bird.box.emit('pointerover', mouse);
        assert.equal(scene.birdNamePanel.visible, true);
        assert.equal(scene.birdNameText.text, names[index]);
        assert.equal(bird.voice.plays, 0, 'Hover does not play a song or submit an answer');
        bird.box.emit('pointerout', mouse);
        assert.equal(scene.birdNamePanel.visible, false);
    }
    const [first, second] = scene.birds;
    first.box.emit('pointerover', mouse);
    second.box.emit('pointerover', mouse);
    first.box.emit('pointerout', mouse);
    assert.equal(scene.birdNamePanel.visible, true);
    assert.equal(scene.birdNameText.text, names[1]);
    scene.input.emit('gameout');
    assert.equal(scene.birdNamePanel.visible, false);
});

for (const [mode, pointer, coarse] of [
    ['mouse', mouse, false], ['touch', touch, true], ['hybrid touch', touch, false]
]) {
    test(`${mode}: click pins the name until the actual song ends, even after leaving or hovering elsewhere`, (t) => {
        const { scene, advance } = fixture(t, { coarse });
        const [first, second] = scene.birds;
        first.box.emit('pointerover', pointer);
        assert.equal(scene.birdNamePanel.visible, !pointer.wasTouch);
        first.box.emit('pointerdown', pointer);
        first.box.emit('pointerout', pointer);
        scene.input.emit('gameout');
        second.box.emit('pointerover', mouse);
        assert.equal(scene.birdNamePanel.visible, true);
        assert.equal(scene.birdNameText.text, 'ЗЯБЛИК');
        advance(1000);
        assert.equal(first.timer, null);
        assert.equal(scene.birdNamePanel.visible, true, 'The scene timer is not the end of the audio');
        first.voice.stop();
        scene.update();
        assert.equal(scene.birdNamePanel.visible, false);
        if (!coarse) {
            second.box.emit('pointerover', mouse);
            assert.equal(scene.birdNameText.text, 'ЗАРЯНКА');
            assert.equal(scene.birdNamePanel.visible, true, 'Mouse hover works again after playback');
        }
    });

    test(`${mode}: the next click replaces the name and older songs cannot hide or restore it`, (t) => {
        const { scene, advance } = fixture(t, { coarse });
        const [first, second] = scene.birds;
        first.voice.totalDuration = 5;
        first.box.emit('pointerdown', pointer);
        second.box.emit('pointerdown', pointer);
        first.box.emit('pointerout', pointer);
        second.box.emit('pointerout', pointer);
        assert.equal(scene.birdNameText.text, 'ЗАРЯНКА');
        advance(1000);
        assert.equal(scene.birdNamePanel.visible, true);
        second.voice.stop();
        scene.update();
        assert.equal(first.voice.isPlaying, true);
        assert.equal(scene.birdNamePanel.visible, false, 'Do not return to the older song');
        advance(4000);
        first.voice.stop();
        scene.update();
        assert.equal(scene.birdNamePanel.visible, false);
    });
}

test('finishing an earlier song cannot hide the newly selected bird name', (t) => {
    const { scene, advance } = fixture(t);
    scene.birds[0].box.emit('pointerdown', mouse);
    scene.birds[1].box.emit('pointerdown', mouse);
    scene.birds[0].voice.stop();
    advance(1000);
    assert.equal(scene.birdNamePanel.visible, true);
    assert.equal(scene.birdNameText.text, 'ЗАРЯНКА');
});

test('demonstration names follow the singing birds and disappear during the gaps', (t) => {
    const { scene, advance } = fixture(t);
    scene.sequence = [2, 3];
    scene.playDemo();
    advance(700);
    assert.equal(scene.birdNameText.text, 'КОРОСТЕЛЬ');
    assert.equal(scene.birdNamePanel.visible, true);
    scene.birds[0].box.emit('pointerover', mouse);
    scene.birds[0].box.emit('pointerdown', touch);
    assert.equal(scene.birdNameText.text, 'КОРОСТЕЛЬ');
    assert.equal(scene.inputIndex, 0);
    scene.birds[2].voice.stop();
    scene.update();
    assert.equal(scene.birdNamePanel.visible, false, 'Actual audio completion hides the label before the timer');
    advance(1250);
    assert.equal(scene.birdNameText.text, 'ДРОЗД');
    assert.equal(scene.birdNamePanel.visible, true);
    scene.birds[3].voice.stop();
    advance(1250);
    assert.equal(scene.repeatOverlay.visible, true);
    assert.equal(scene.birdNamePanel.visible, false);
});

test('an incorrect answer retains its label through the last song and hides it for the result', (t) => {
    const { scene, advance } = fixture(t);
    scene.birds[2].box.emit('pointerdown', mouse);
    assert.equal(scene.phase, 'finishing');
    advance(1000);
    assert.equal(scene.birdNameText.text, 'КОРОСТЕЛЬ');
    assert.equal(scene.birdNamePanel.visible, true);
    scene.birds[2].voice.stop();
    scene.update();
    assert.equal(scene.loseOverlay.visible, true);
    assert.equal(scene.birdNamePanel.visible, false);
});

test('silent mode keeps the name for the fallback animation, then clears it', (t) => {
    const { scene, advance } = fixture(t, { audio: false, coarse: true });
    scene.birds[0].box.emit('pointerdown', touch);
    advance(299);
    assert.equal(scene.birdNamePanel.visible, true);
    advance(1);
    assert.equal(scene.birdNamePanel.visible, false);
});

test('instructions, pause and completed games do not react to hover or clicks', (t) => {
    const { scene } = fixture(t);
    const bird = scene.birds[0];
    for (const [key, value] of [['phase', 'intro'], ['paused', true], ['completed', true], ['activeHint', {}]]) {
        const previous = scene[key];
        scene[key] = value;
        bird.box.emit('pointerover', mouse);
        bird.box.emit('pointerdown', touch);
        assert.equal(scene.birdNamePanel.visible, false);
        assert.equal(bird.voice.plays, 0);
        scene[key] = previous;
    }
});

test('pause clears hover but preserves an unfinished song; reset and shutdown clear names and listeners', (t) => {
    const { scene, media, fonts } = fixture(t);
    const bird = scene.birds[0];
    bird.box.emit('pointerover', mouse);
    scene.events.emit('pause');
    scene.events.emit('resume');
    assert.equal(scene.birdNamePanel.visible, false);
    bird.box.emit('pointerdown', mouse);
    scene.events.emit('pause');
    assert.equal(scene.birdNamePanel.visible, false);
    bird.voice.isPlaying = false;
    bird.voice.isPaused = true;
    scene.events.emit('resume');
    assert.equal(scene.birdNamePanel.visible, true);
    media.matches = true;
    media.emit('change');
    assert.equal(scene.birdNamePanel.visible, true, 'Changing input mode does not dismiss a song');
    scene.resetBirds();
    assert.equal(scene.birdNamePanel.visible, false);
    scene.events.emit('shutdown');
    assert.equal(scene.input.listenerCount('gameout'), 0);
    assert.equal(scene.events.listenerCount('pause'), 0);
    assert.equal(scene.events.listenerCount('resume'), 0);
    assert.equal(media.listenerCount('change'), 0);
    assert.equal(fonts.listenerCount('loadingdone'), 0);
});
