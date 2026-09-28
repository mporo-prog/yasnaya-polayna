export class Envelope {

    constructor(id, x, y, color) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        this.sprite = null;
    }

    createSprite(scene, width, height) {

        this.sprite = scene.add.rectangle(
            this.x,
            this.y,
            width,
            height,
            this.color
        ).setOrigin(0);

        return this.sprite;
    }

    containsPoint(x, y) {

        if (!this.sprite) {return false;}

        return this.sprite.getBounds().contains(x, y);
    }
}