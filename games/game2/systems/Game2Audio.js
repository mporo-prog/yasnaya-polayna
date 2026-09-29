export class Game2Audio {

    constructor(scene) {
        this.scene = scene;
    }

    getContext() {
        return this.scene.sound?.context || null;
    }

    unlock() {
        const context = this.getContext();

        if (!context) {
            return;
        }

        if (context.state === 'suspended') {
            context.resume();
        }
    }

    playThingSound(sound = {}) {
        const context = this.getContext();

        if (!context) {
            return;
        }

        if (context.state === 'suspended') {
            context.resume();
        }

        const now = context.currentTime;
        const frequency = sound.frequency ?? 440;
        const type = sound.type;

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(
            frequency,
            now
        );
        oscillator.frequency.linearRampToValueAtTime(
            frequency * 1.18,
            now + 0.12
        );

        gain.gain.setValueAtTime(
            0.0001,
            now
        );
        gain.gain.exponentialRampToValueAtTime(
            0.16,
            now + 0.015
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + 0.18
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.18);
    }
}
