import { PAUSE_BUTTON } from '../constants/Game2Constants.js';

/**
 * Расставляет предметы по их местам справа от карты (slot в макете
 * 1920×1080 — там же, где фон; на телефоне места и размер задаёт
 * scene.itemPlacement) и прижимает кнопку паузы к левому верхнему углу
 * видимой области.
 */
export class Game2PanelLayout {

    constructor(scene, things, pauseButton) {
        this.scene = scene;
        this.things = things;
        this.pauseButton = pauseButton;

        this.layout = scene.layout;
        this.handler = (visible, ui) => this.update(ui);

        this.layout?.onLayout(
            scene,
            this.handler
        );
    }

    update(ui) {
        // На телефоне сцена задаёт свои места и размер иконок (крупнее);
        // иначе — места из макета (slot) и прежний размер.
        const placement = this.scene.itemPlacement?.(ui) ?? null;

        this.things.forEach((thing, index) => {
            const slot = placement ? placement.slots[index] : thing.slot;
            thing.startX = slot.x;
            thing.startY = slot.y;

            if (!thing.sprite || !thing.sprite.scene || thing.isLocked()) {
                return;
            }

            const size = placement ? placement.size : thing.size;
            if (size && thing.sprite.setDisplaySize) {
                thing.sprite.setDisplaySize(size, size);
            }

            // Resize во время перетаскивания не вырывает предмет из-под указателя.
            // Возврат после ошибки должен закончиться уже на своём месте.
            if (!thing.dragging) {
                this.scene.tweens.killTweensOf(thing.sprite);
                thing.sprite.setPosition(thing.startX, thing.startY);
            }
        });

        if (ui && this.pauseButton && this.pauseButton.scene) {
            this.pauseButton.setPosition(
                ui.left + PAUSE_BUTTON.left,
                ui.top + PAUSE_BUTTON.top
            );
        }
    }
}
