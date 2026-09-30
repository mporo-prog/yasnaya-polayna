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

        this.layout?.onLayout(
            scene,
            this.handler
        );
    }

    update() {
        this.things.forEach((thing) => {
            thing.startX = thing.slot.x;
            thing.startY = thing.slot.y;

<<<<<<< HEAD
            if (thing.sprite && thing.sprite.scene && !thing.isLocked()) {
                thing.sprite.setPosition(thing.startX, thing.startY);
=======
        this.panel.setDepth(-1);

        return this.panel;
    }

    update(ui) {
        if (!ui) {
            return;
        }

        const panelWidth = ui.width * PANEL_RATIO;
        const panelX = ui.right - panelWidth;
        const panelCenterX = panelX + panelWidth / 2;

        if (this.panel) {
            this.panel.setPosition(
                panelX,
                ui.top
            );
            this.panel.setSize(
                panelWidth,
                ui.height
            );
        }

        const count = this.things.length;
        const totalHeight =
            ITEM_SIZE * count +
            ITEM_GAP * (count - 1);

        const firstCenterY =
            ui.top +
            (ui.height - totalHeight) / 2 +
            ITEM_SIZE / 2;

        this.things.forEach((thing, index) => {
            if (!thing.sprite || !thing.sprite.scene || thing.isLocked()) {
                return;
            }

            const x = panelCenterX;
            const y =
                firstCenterY +
                index * (ITEM_SIZE + ITEM_GAP);

            thing.startX = x;
            thing.startY = y;
            // Resize во время перетаскивания не вырывает предмет из-под указателя.
            // Возврат после ошибки должен закончиться уже в новом слоте панели.
            if (!thing.dragging) {
                this.scene.tweens.killTweensOf(thing.sprite);
                thing.sprite.setPosition(x, y);
>>>>>>> 5bf71c44ba3f9484241ec59f1142db2cde7dddb1
            }
        });

        if (this.pauseButton && this.pauseButton.scene) {
            this.pauseButton.setPosition(
                ui.left + PAUSE_BUTTON.left,
                ui.top + PAUSE_BUTTON.top
            );
        }
    }
}
