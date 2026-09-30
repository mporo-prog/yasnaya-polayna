export class Thing {

    constructor(data, textureKey) {
        this.id = data.id;
        this.textureKey = textureKey;
        this.targetId = data.targetId;
        this.sound = data.sound;

        this.sprite = null;
        this.startX = 0;
        this.startY = 0;
        this.locked = false;
        this.dragging = false;
    }

    createSprite(scene, x, y, size) {
        this.startX = x;
        this.startY = y;

        this.sprite = scene.add.image(
            x,
            y,
            this.textureKey
        );

        this.sprite
            .setDisplaySize(size, size)
            .setInteractive({
                draggable: true,
                useHandCursor: true
            });

        this.sprite.setData('thing', this);

        return this.sprite;
    }

    lock() {
        this.locked = true;
    }

    isLocked() {
        return this.locked;
    }

    resetPosition() {
        if (!this.sprite) return;

        this.sprite.setPosition(
            this.startX,
            this.startY
        );
    }
}
