// Невидимая зона сброса над лотком, нарисованным на фоне.
export class Envelope {

    constructor(id, x, y, width, height) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.sprite = null;
    }

    createSprite(scene) {

        this.sprite = scene.add.zone(
            this.x,
            this.y,
            this.width,
            this.height
        ).setOrigin(0);

        return this.sprite;
    }

    containsPoint(x, y) {

        if (!this.sprite) {return false;}

        return this.sprite.getBounds().contains(x, y);
    }
}
