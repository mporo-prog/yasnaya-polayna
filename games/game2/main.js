// Отдельный URL открывает игру через общий запуск: тот же Layout, шрифты и меню паузы.
const gameUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
gameUrl.searchParams.set('game', '2');
window.location.replace(gameUrl.href);
