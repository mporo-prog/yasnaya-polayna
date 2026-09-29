import { MATCH_RADIUS } from '../constants/Game2Constants.js';

export class Game2Matcher {

    findMatchingTarget(thing, point, targets) {
        for (const target of targets) {
            if (target.id !== thing.targetId) {
                continue;
            }

            const center = target.getWorldCenter();

            const distance = Phaser.Math.Distance.Between(
                point.x,
                point.y,
                center.x,
                center.y
            );

            if (distance <= MATCH_RADIUS) {
                return target;
            }
        }

        return null;
    }
}
