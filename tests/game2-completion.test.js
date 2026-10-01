import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

globalThis.Phaser = { Scene: class {} };
const { GameScene2 } = await import('../games/game2/GameScene2.js');

test('the game 2 finish requires a fresh press and release on the same control', () => {
  const scene = new GameScene2();
  const button = new EventEmitter();
  let clicks = 0;
  scene.bindPanelClick(button, () => clicks++);
  const mouse = { id: 0 };
  button.emit('pointerup', mouse);
  assert.equal(clicks, 0, 'Releasing a drag or a click on the previous screen cannot advance');
  button.emit('pointerdown', mouse);
  button.emit('pointerout', mouse);
  button.emit('pointerup', mouse);
  assert.equal(clicks, 0, 'Dragging off cancels the click');
  button.emit('pointerdown', mouse);
  button.emit('pointerup', { id: 1 });
  assert.equal(clicks, 0, 'Another touch cannot finish the click');
  button.emit('pointerdown', mouse);
  button.emit('pointerup', mouse);
  button.emit('pointerup', mouse);
  assert.equal(clicks, 1, 'Exactly one transition per click');
});
