export class Target {

    constructor(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;

        this.sprite = null;
        this.revealed = false;
    }

    createSprite(scene, textureKey, size) {
        this.sprite = scene.add.image(
            this.x,
            this.y,
            textureKey
        );

        this.sprite
            .setDisplaySize(size, size)
            .setAlpha(0);

        this.sprite.setData('target', this);

        return this.sprite;
    }

    reveal() {
        this.revealed = true;

        if (this.sprite) {
            this.sprite.setAlpha(1);
        }
    }

    getWorldCenter() {
        if (!this.sprite) {
            return {
                x: this.x,
                y: this.y
            };
        }

        const bounds = this.sprite.getBounds();

        return {
            x: bounds.centerX,
            y: bounds.centerY
        };
    }
}
