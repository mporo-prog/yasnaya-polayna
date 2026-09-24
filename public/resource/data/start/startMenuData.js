/**
 * Весь контент начального экрана
 * логика  /resourse\scenes/start/StartScene.js 
 *
 
 */
window.VN.data.startMenuData = {
  title: 'ОДИН ДЕНЬ ЛЬВА НИКОЛАЕВИЧА',

  buttons: [
    { label: 'НАЧАТЬ', action: 'start' },
    { label: 'НАСТРОЙКИ', action: 'settings' },
    { label: 'АВТОРЫ', action: 'credits' },
  ],

  creditsText: 'Здесь будут авторы игры.\n\nСценарий — ...\nАрт — ...\nПрограммирование — ...',


  settingsPlaceholderText: 'Экран настроек ещё не готов.\n\nЗдесь появится регулировка громкости\nи скорости текста.',
};
