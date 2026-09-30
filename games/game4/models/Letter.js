export class Letter {

    constructor(envelope, image) {
        this.envelope = envelope;
        this.image = image;
        this.sprite = null;
        this.startX = 0;
        this.startY = 0;
        this.locked = false;
    }

    static textureKey(image) {
        return `game4-letter-${image}`;
    }

    createSprite(scene, x, y, width, height) {
        this.startX = x;
        this.startY = y;

        this.sprite = scene.add.image(
            x,
            y,
            Letter.textureKey(this.image)
        );

        // Вписываем картинку в рамку письма, сохраняя пропорции.
        const scale = Math.min(
            width / this.sprite.width,
            height / this.sprite.height
        );

        this.sprite.setScale(scale);

        return this.sprite;
    }

    isForEnvelope(envelopeId) {
        return this.envelope === envelopeId;
    }

    lock() {this.locked = true;}

    unlock() {this.locked = false;}

    isLocked() {return this.locked;}

    resetPosition() {
        if (this.sprite) {
            this.sprite.x = this.startX;
            this.sprite.y = this.startY;
        }
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
    }
}
