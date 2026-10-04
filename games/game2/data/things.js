// Предметы справа от карты (макет 1920×1080): slot — центр иконки.
// targetId: null — предмет-«обманка», его место не на карте.
// name и description показываются на плашке при нажатии на иконку.
export const THINGS = [
    {
        id: 'book',
        image: 'book',
        targetId: 'bench',
        sound: 'voice_and_sound/scene2_gameplay2/GAMEPLAY2_NEW/gameplay2_skameika.wav',
        slot: { x: 1343, y: 296 },
        name: 'Книга',
        description: 'В 1901 г. Лев Николаевич получил от Великого князя Николая Михайловича книгу «Князья Долгорукие, сподвижники императора Александра I в первые годы его царствования», её же он брал на прогулку'
    },
    {
        id: 'dnevnik',
        image: 'dnevnik',
        targetId: null,
        sound: null,
        slot: { x: 1530, y: 296 },
        name: 'Дневник',
        // Загадка: что это за дневник, рассказчик объясняет в конце игры.
        description: '???'
    },
    {
        id: 'hat',
        image: 'hat',
        targetId: 'greenhouse',
        sound: 'voice_and_sound/scene2_gameplay2/GAMEPLAY2_NEW/gameplay2_teplitsa.wav',
        slot: { x: 1717, y: 296 },
        name: 'Шляпа',
        description: 'Шляпа с широкими полями спасала Толстого от летней жары, в ней же писатель отправлялся купаться на реку Воронку. В Ясной Поляне сохранились три такие шляпы: две из них — полотняные, одна — соломенная'
    },
    {
        id: 'trost',
        image: 'trost',
        targetId: 'stable',
        sound: 'voice_and_sound/scene2_gameplay2/GAMEPLAY2_NEW/gameplay2_konushya.wav',
        slot: { x: 1445, y: 457 },
        name: 'Трость',
        description: 'Трость-стул — подарок П. А. Сергеенко. Толстой брал её на многочасовые пешие прогулки по окрестностям усадьбы: при ходьбе на неё можно было опереться, а во время остановки ненадолго присесть, раскрыв сидение'
    },
    {
        id: 'sledi',
        image: 'sledi',
        targetId: 'meadow',
        sound: 'voice_and_sound/scene2_gameplay2/GAMEPLAY2_NEW/gameplay2_kalinov_lug.wav',
        slot: { x: 1632, y: 457 },
        name: 'Следы',
        description: '«Босяк с корзинкой в лесу, а осанка военного», — так описывал Репин Льва Николаевича, когда тот, сразу же после купания, босым шел в одиночку собирать грибы'
    }
];
