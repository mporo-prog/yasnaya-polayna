/**
 * Внешний вид мини-игры «Продолжите цитату». Все координаты — в макете
 * 1920×1080 (как и в остальных сценах; адаптивность даёт Layout).
 */
window.VN.data.quoteStyle = {
  // Фон: картинка plug.png с прозрачностью backgroundAlpha поверх
  // сплошной заливки backgroundColor.
  backgroundColor: 0xd9d9d9,
  backgroundAlpha: 0.4,

  // Текст цитаты и вариантов ответа
  textColor: '#6E6056',
  quoteFontFamily: 'Philosopher',
  quoteFontSize: 46,
  answerFontSize: 44,

  // Цитата: левый край текста и верх первой строки
  quoteX: 965,
  quoteY: 285,
  quoteWrapWidth: 820,
  // Пустая рамка на месте пропущенной части цитаты
  blankWidth: 787,
  blankHeight: 76,
  blankStrokeColor: 0x6e6056,
  blankStrokeWidth: 2,
  // После правильного ответа цитата собирается в две строки и опускается
  // ниже; вторая строка сдвинута вправо, как в макете.
  solvedQuoteY: 380,
  solvedSecondLineIndent: 200,

  // Неправильный ответ: поверх плашки накладывается красная накладка той
  // же формы, что и плашка.
  colorWrong: 0xff3b30,
  overlayAlpha: 0.45,

  // Кнопки-варианты (картинка images/icon_UI/rectangle_game5.png).
  // Размер — родной размер картинки; ширина растягивается под длинный
  // текст (answerPaddingX — отступ текста от краёв). Ниже — центры плашек.
  answerPaddingX: 40,
  slots: [
    { x: 1105, y: 568 },
    { x: 1580, y: 568 },
    { x: 1362, y: 737 },
  ],
  // Y, под которую подобраны координаты в slots выше — высота "обычной"
  // короткой цитаты в 1-2 строки. Если у конкретной цитаты текст длиннее
  // (перенёсся на лишнюю строку, режим 'middle' даёт 3 строки и т.п.) —
  // QuoteMinigameScene.buildAnswerButtons() сдвигает все плашки вниз ровно
  // настолько, насколько цитата вышла ниже этой линии (см. quoteBottomY).
  answerAreaDesignedTopY: 480,

  // Портрет героя: центр по x и нижний край, масштаб картинки 900×900
  hero: { x: 490, bottom: 995, scale: 0.95 },

  // Диалоговая плашка — та же картинка, что в сюжетной сцене (1589×325)
  panelBottomMargin: 35,
  nameFontSize: 44,
  replyFontSize: 30,
};