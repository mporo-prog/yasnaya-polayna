export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

export const ITEM_SIZE = 152;

// Иконка на кружке карты — чуть больше самого кружка (≈127 px).
export const TARGET_SIZE = 132;
export const MATCH_RADIUS = 70;

// Плашка с названием и описанием предмета (как в сюжетной сцене).
export const INFO_PANEL = {
    x: 160,
    y: 738,
    width: 1585,
    height: 305
};

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
