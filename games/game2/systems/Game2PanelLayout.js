import {
    PANEL_RATIO,
    ITEM_SIZE,
    ITEM_GAP,
    PAUSE_BUTTON
} from '../constants/Game2Constants.js';

export class Game2PanelLayout {

    constructor(scene, things, pauseButton) {
        this.scene = scene;
        this.things = things;
        this.pauseButton = pauseButton;
        this.panel = null;

        this.layout = scene.layout;
        this.handler = (visible, ui) => {
            this.update(ui);
        };

        this.layout?.onLayout(
            scene,
            this.handler
        );
    }

    createPanel() {
        this.panel = this.scene.add.rectangle(
            0,
            0,
            0,
            0,
            0x000000,
            0
        ).setOrigin(0);

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
