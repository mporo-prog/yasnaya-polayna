export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

export const PANEL_RATIO = 0.25;

export const ITEM_SIZE = BASE_WIDTH * (148 / 1920);
export const ITEM_GAP = BASE_HEIGHT * (80 / 1080);

export const TARGET_SIZE = ITEM_SIZE;
export const MATCH_RADIUS = BASE_WIDTH * (70 / 1920);

export const PAUSE_BUTTON = {
    width: BASE_WIDTH * (150 / 1920),
    height: BASE_WIDTH * (150 / 1920),
    left: BASE_WIDTH * 0.015 + BASE_WIDTH * 0.13 / 2,
    top: BASE_HEIGHT * 0.023 + BASE_WIDTH * 0.08 / 2
};

// Все доли относятся к макету 1920×1080; текст — к своей плашке.
export const MESSAGE_PANELS = {
    rules: {
        widthFrac: 1200 / 1920,
        heightFrac: 577 / 1080,
        titleYFrac: 0.5 - 135 / 577,
        textYFrac: 0.5 + 15 / 577,
        textWidthFrac: 1100 / 1200,
        color: '#6E6056',
        lineSpacing: BASE_HEIGHT * (12 / 1080)
    },
    win: {
        widthFrac: 1300 / 1920,
        heightFrac: 577 / 1080,
        titleYFrac: 0.5 - 80 / 577,
        textYFrac: 0.5 + 25 / 577,
        textWidthFrac: 1050 / 1300,
        color: '#04151F',
        lineSpacing: 0
    }
};

export const NEXT_BUTTON = {
    xFrac: 0.85 + 0.13 / 2,
    yFrac: 0.46 + 0.8 / 2,
    size: PAUSE_BUTTON.width
};

export const MESSAGE_FONT_SIZE = BASE_WIDTH * (64 / 1920);
