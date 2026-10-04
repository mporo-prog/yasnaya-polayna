// Координаты левого верхнего угла подложки относительно макета 1920×1080.
// PNG отображаются в исходном размере; предмет расположен по центру подложки.
// tablePosition — левый верхний угол PNG предмета после перемещения на поднос.
// panel/image: null — координаты получены, ждём соответствующие PNG.
// clickPanel — подложка неправильного предмета после нажатия.
// voice — озвучка названия при нажатии (относительно resource/sound).
export const ITEMS = [
    {
        id: 'egg',
        voice: 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay3_egg.mp3',
        label: 'Яйцо всмятку',
        panel: 'egg_panel',
        hoverPanel: 'egg_panel_hover',
        image: 'egg',
        xFrac: 3.854167 / 100,
        yFrac: 26.66667 / 100,
        correct: true,
        tablePosition: { xFrac: 46.875 / 100, yFrac: 47.22222 / 100 }
    },
    {
        id: 'sandwich',
        voice: 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay3_buterbrod.mp3',
        label: 'Бутерброд с бужениной',
        panel: 'wide_panel',
        hoverPanel: 'wide_panel_hover',
        clickPanel: 'wide_panel_click',
        image: 'sandwich',
        xFrac: 19.16667 / 100,
        yFrac: 13.05556 / 100,
        correct: false
    },
    {
        id: 'macaroni-cheese',
        voice: 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay3_makarony.mp3',
        label: 'Макароны с сыром',
        panel: 'wide_panel',
        hoverPanel: 'wide_panel_hover',
        clickPanel: 'wide_panel_click',
        image: 'macaroni_cheese',
        xFrac: 50.83333 / 100,
        yFrac: 13.05556 / 100,
        correct: false
    },
    {
        id: 'porridge',
        voice: 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay3_grechka5!.mp3',
        label: 'Гречневая каша',
        panel: 'wide_panel',
        hoverPanel: 'wide_panel_hover',
        image: 'porridge',
        xFrac: 31.66667 / 100,
        yFrac: 36.11111 / 100,
        correct: true,
        tablePosition: { xFrac: 49.21875 / 100, yFrac: 71.57407 / 100 }
    },
    {
        id: 'sparkling-water',
        voice: 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay3_mineral_voda.mp3',
        label: 'Минеральная вода',
        panel: 'sparkling_water_panel',
        hoverPanel: 'sparkling_water_panel_hover',
        clickPanel: 'sparkling_water_panel_click',
        image: 'sparkling_water',
        xFrac: 84.6875 / 100,
        yFrac: 9.074074 / 100,
        correct: false
    },
    {
        id: 'cup',
        voice: 'voice_and_sound/scene3_gameplay3/GAMEPLAY3_NEW/gameplay3_chai.mp3',
        label: 'Чёрный чай',
        panel: 'cup_panel',
        hoverPanel: 'cup_panel_hover',
        image: 'cup',
        xFrac: 67.8125 / 100,
        yFrac: 35.09259 / 100,
        correct: true,
        tablePosition: { xFrac: 33.90625 / 100, yFrac: 65.64815 / 100 }
    }
];
