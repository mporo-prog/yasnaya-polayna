export class Game4Timer {

    constructor(scene, duration, onTick, onFinish) {

        this.scene = scene;

        this.duration = duration;
        this.timeLeft = duration;

        this.onTick = onTick;
        this.onFinish = onFinish;

        this.timerEvent = null;
    }

    start(timeLeft = this.duration) {

        this.stop();

        this.timeLeft = timeLeft;

        if (this.onTick) {
            this.onTick(this.timeLeft);
        }

        this.timerEvent = this.scene.time.addEvent({

            delay: 1000,

            repeat: Math.max(0, this.timeLeft - 1),

            callback: () => {

                this.timeLeft--;

                if (this.onTick) {
                    this.onTick(this.timeLeft);
                }

                if (this.timeLeft <= 0) {

                    this.stop();

                    if (this.onFinish) {
                        this.onFinish();
                    }
                }
            }
        });
    }

    stop() {

        if (this.timerEvent) {

            this.timerEvent.remove();

            this.timerEvent = null;
        }
    }

    pause() {

        if (this.timerEvent) {
            this.timerEvent.paused = true;
        }
    }

    resume() {

        if (this.timerEvent) {
            this.timerEvent.paused = false;
        }
    }

    reset() {

        this.start(this.duration);
    }

    getTimeLeft() {

        return this.timeLeft;
    }

    destroy() {

        this.stop();
    }
}