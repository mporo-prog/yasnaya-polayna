import assert from 'node:assert/strict';
import test from 'node:test';
import { Game2PanelLayout } from '../games/game2/systems/Game2PanelLayout.js';
import { Thing } from '../games/game2/models/Thing.js';
import { ITEM_SIZE, PAUSE_BUTTON } from '../games/game2/constants/Game2Constants.js';

function rect(left, top, width, height) {
    return { left, top, width, height, right: left + width, bottom: top + height };
}

function fixture() {
    const cancelled = [];
    const object = () => ({
        scene: {}, x: 0, y: 0,
        setPosition(x, y) { Object.assign(this, { x, y }); }
    });
    // Места предметов справа от карты — как в data/things.js.
    const slots = [{ x: 1343, y: 296 }, { x: 1530, y: 296 }, { x: 1445, y: 457 }, { x: 1632, y: 457 }];
    const things = slots.map((slot, id) => {
        const thing = new Thing({ id, slot }, 'item');
        thing.sprite = object();
        return thing;
    });
    const pause = object();
    const panel = new Game2PanelLayout({
        layout: null,
        tweens: { killTweensOf: sprite => cancelled.push(sprite) }
    }, things, pause);
    return { panel, things, pause, cancelled };
}

test('inventory and pause stay inside the safe UI through repeated aspect-ratio changes', () => {
    const { panel, things, pause } = fixture();
    for (const ui of [
        rect(0, 0, 1920, 1080), rect(-300, 0, 2520, 1080),
        rect(0, -180, 1920, 1440), rect(0, -420, 1920, 1920),
        rect(-210, -100, 2240, 1180), rect(0, 0, 1920, 1080)
    ]) {
        panel.update(ui);
        for (const thing of things) {
            assert.ok(thing.sprite.x - ITEM_SIZE / 2 >= ui.left);
            assert.ok(thing.sprite.x + ITEM_SIZE / 2 <= ui.right);
            assert.ok(thing.sprite.y - ITEM_SIZE / 2 >= ui.top);
            assert.ok(thing.sprite.y + ITEM_SIZE / 2 <= ui.bottom);
            assert.equal(thing.startX, thing.sprite.x);
            assert.equal(thing.startY, thing.sprite.y);
        }
        assert.ok(Math.abs(pause.x - ui.left - PAUSE_BUTTON.left) < 0.001);
        assert.ok(Math.abs(pause.y - ui.top - PAUSE_BUTTON.top) < 0.001);
    }
});

test('resize updates a dragged item return slot without moving the item under the pointer', () => {
    const { panel, things, cancelled } = fixture();
    panel.update(rect(0, 0, 1920, 1080));
    const thing = things[0];
    thing.dragging = true;
    thing.sprite.setPosition(450, 570);
    cancelled.length = 0;
    panel.update(rect(-300, 0, 2520, 1080));
    assert.deepEqual([thing.sprite.x, thing.sprite.y], [450, 570]);
    // Место предмета привязано к карте, а не к краю экрана.
    assert.deepEqual([thing.startX, thing.startY], [thing.slot.x, thing.slot.y]);
    assert.ok(!cancelled.includes(thing.sprite));
    thing.dragging = false;
    thing.resetPosition();
    assert.deepEqual([thing.sprite.x, thing.sprite.y], [thing.startX, thing.startY]);
});

test('resize cancels a stale return animation, but preserves the fade of a placed item', () => {
    const { panel, things, cancelled } = fixture();
    panel.update(rect(0, 0, 1920, 1080));
    const [returning, placed] = things;
    placed.lock();
    placed.sprite.setPosition(320, 550);
    cancelled.length = 0;
    panel.update(rect(0, -180, 1920, 1440));
    assert.ok(cancelled.includes(returning.sprite));
    assert.equal(returning.sprite.y, returning.startY);
    assert.ok(!cancelled.includes(placed.sprite));
    assert.deepEqual([placed.sprite.x, placed.sprite.y], [320, 550]);
});
