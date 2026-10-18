import { MAP_BACKGROUND } from '../constants/Game2Constants.js';

// Центры кружков в исходном background.webp (1920×1080), до увеличения.
// В конце переводим их в координаты сцены тем же преобразованием, что и фон.
export const TARGETS = [
    {
        id: 'stable',
        x: 407.5,
        y: 542.5
    },
    {
        id: 'greenhouse',
        x: 537,
        y: 280.5
    },
    {
        id: 'meadow',
        x: 885,
        y: 299.5
    },
    {
        id: 'bench',
        x: 877.5,
        y: 563
    }
].map(({ x, y, ...target }) => ({
    ...target,
    x: MAP_BACKGROUND.x + x * MAP_BACKGROUND.scale,
    y: MAP_BACKGROUND.y + y * MAP_BACKGROUND.scale,
}));
