/**
 * Цвета, размеры и позиции элементов начального экрана.
 * xFrac/yFrac задают левый верхний угол в долях макета 1920×1080.
 * width/height — размеры в пикселях этого макета.
 */
window.VN.data.startStyle = {
  textColor: '#6E6056',
  buttonFontSize: '48px',
  title: { xFrac: 0.4765, yFrac: 0.237, width: 844.05, height: 439 },

  buttons: [
    // Равный шаг 180,414 px: между кнопками остаётся по 22,174 px.
    { xFrac: 0.0833, yFrac: 0.283, width: 579, height: 158.24 },
    { xFrac: 0.0833, yFrac: 0.45005, width: 579, height: 158.24 },
    { xFrac: 0.0833, yFrac: 0.6171, width: 579, height: 158.24 },
  ],
};
