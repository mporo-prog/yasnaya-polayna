import { BASE_WIDTH, BASE_HEIGHT } from '../constants/Game2Constants.js';

// Координаты центров кружков на фоне background.png (1920×1080).
// Кружки уже нарисованы в самом фоне, поэтому отдельная графика зон не нужна.
export const TARGETS = [
    {
        id: 'stable',
        x: BASE_WIDTH * (323 / 1920),
        y: BASE_HEIGHT * (551 / 1080)
    },
    {
        id: 'greenhouse',
        x: BASE_WIDTH * (533 / 1920),
        y: BASE_HEIGHT * (748 / 1080)
    },
    {
        id: 'meadow',
        x: BASE_WIDTH * (1216 / 1920),
        y: BASE_HEIGHT * (401 / 1080)
    },
    {
        id: 'bench',
        x: BASE_WIDTH * (1208 / 1920),
        y: BASE_HEIGHT * (779 / 1080)
    }
];
