import { PAUSE_BUTTON } from '../constants/Game2Constants.js';

/**
 * Расставляет предметы по их местам справа от карты (slot в макете
 * 1920×1080 — там же, где фон, поэтому от размера экрана не зависит)
 * и прижимает кнопку паузы.
 */
export class Game2PanelLayout {

    constructor(scene, things, pauseButton) {
        this.scene = scene;
        this.things = things;
        this.pauseButton = pauseButton;

        this.layout = scene.layout;
        this.handler = () => this.update();

        this.layout.onLayout(
            scene,
            this.handler
        );
    }

    update() {
        this.things.forEach((thing) => {
            thing.startX = thing.slot.x;
            thing.startY = thing.slot.y;

            if (thing.sprite && thing.sprite.scene && !thing.isLocked()) {
                thing.sprite.setPosition(thing.startX, thing.startY);
            }
        });

        if (this.pauseButton && this.pauseButton.scene) {
            this.pauseButton.setPosition(
                PAUSE_BUTTON.left,
                PAUSE_BUTTON.top
            );
        }
    }
}
