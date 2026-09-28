export class Letter {

    constructor(envelope, color) {
        this.envelope = envelope;
        this.color = color;
        this.sprite = null;
        this.startX = 0;
        this.startY = 0;
        this.locked = false;
    }

    createSprite(scene, x, y, width, height) {
        this.startX = x;
        this.startY = y;

        this.sprite = scene.add.rectangle(
            x,
            y,
            width,
            height,
            this.color
        );

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