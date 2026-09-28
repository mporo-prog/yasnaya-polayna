window.VN.data.quoteStyle = {
  // Кнопки-варианты ответа теперь рисуются картинкой (plazka_game_5.png),
  // поэтому цвет ошибки/правильного ответа накладывается СВЕРХУ полупрозрачным
  // прямоугольником (overlay), а не через fillStyle — см. buildOneAnswerButton().
  colorWrong: 0xff3b30, // накладка при неправильном ответе
  colorCorrect: 0x7bd35c, // накладка при правильном ответе
  overlayAlpha: 0.45,
  colorBlank: 0xff9999, // плейсхолдер невыбранного варианта в самой цитате (buildQuoteRow)

  portraitColor: 0x4d4d4d,
  backgroundColor: 0xd9d9d9,


  slots: [
    { xFrac: 0.53, yFrac: 0.46, w: 270, h: 80 },
    { xFrac: 0.9, yFrac: 0.465, w: 270, h: 80 },
    { xFrac: 0.71, yFrac: 0.63, w: 420, h: 80 },
  ],
};