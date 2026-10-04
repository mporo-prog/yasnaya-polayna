import { BASE_WIDTH, BASE_HEIGHT } from '../constants/Game2Constants.js';

// Координаты центров кружков на фоне background.webp (1920×1080).
// Кружки уже нарисованы в самом фоне, поэтому отдельная графика зон не нужна.
export const TARGETS = [
    {
        id: 'stable',
        x: 246,
        y: 368
    },
    {
        id: 'greenhouse',
        x: 373,
        y: 597
    },
    {
        id: 'meadow',
        x: 870,
        y: 308
    },
    {
        id: 'bench',
        x: 885,
        y: 541
    }
];
