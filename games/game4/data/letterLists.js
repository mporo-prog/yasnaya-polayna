// image — имя файла из public/images/game4/letters/ без расширения.

export const letterImagesByEnvelope = {
    pink: ['red1', 'red2', 'red3', 'red4'],
    blue: ['blue1', 'blue2', 'blue3', 'blue4'],
    yellow: ['yellow1', 'yellow2', 'yellow3', 'yellow4', 'pink1', 'pink2', 'pink3', 'pink4'],
    black: ['brown1', 'brown2', 'brown3', 'brown4', 'brown5']
};

export const letterImages = Object.values(letterImagesByEnvelope).flat();

// Все письма по одному разу; порядок перемешивает сцена.
export const letterList = Object.entries(letterImagesByEnvelope)
    .flatMap(([envelope, images]) =>
        images.map(image => ({ envelope, image }))
    );
