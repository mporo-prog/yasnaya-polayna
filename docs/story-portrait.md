# Финальный портрет (сюжетная сцена 6)

Настройки находятся в `public/resource/data/story/storyLines.js`, поле
`portraitReveal` последней сцены. `holdDuration: 4000` задаёт длительность
показа картины с подписью в миллисекундах.

Анимация, текст и озвучка начинаются вместе, когда готов первый кадр видео
и завершено появление сцены после мини-игры. Анимация проигрывается один раз
и не пропускается. Клик «Далее» раскрывает реплику целиком и останавливает
озвучку, но видео продолжает играть. Название появляется только после
окончания обоих: видео и озвучки (или её пропуска). После `holdDuration`
игра открывает `games/finish/index.html`.

`public/video/tolstoy-portrait-e1ebd194.webm` (VP9) и запасной
`public/video/tolstoy-portrait-e1ebd194.mp4` (H.264, для Safari/iOS без VP9)
получены из приложенного `C:\Users\marka\Downloads\Tolstoy.gif` (30 сентября 2026 года):
145 кадров, 9,67 секунды, все кадры и их временные отметки сохранены.
Phaser выбирает первый поддерживаемый браузером источник из `video` в
`storyLines.js`; WebM на 40% меньше MP4 при практически том же качестве.
SHA-256 исходного GIF:
`e1ebd1945c6b363519b76f537243e3b12d6a0666b438aca1b58380e5233c3d36`.
Суффикс имени соответствует исходному файлу и исключает загрузку старой
версии из кеша браузера.
Видео без звука позволяет дождаться реального окончания воспроизведения,
приостанавливать его вместе со сценой и сохранять последний кадр.
WebP `tolstoy-portrait-start-e1ebd194.webp` — первый кадр того же GIF,
показанный до готовности видео.

Для замены анимации (FFmpeg):

```powershell
ffmpeg -i 'C:\Users\marka\Downloads\Tolstoy.gif' -vf "scale=384:-2" -an -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -fps_mode passthrough -enc_time_base 1:100 -video_track_timescale 10000 public/video/tolstoy-portrait-e1ebd194.mp4
ffmpeg -i 'C:\Users\marka\Downloads\Tolstoy.gif' -vf "scale=384:-2" -an -c:v libvpx-vp9 -b:v 0 -crf 20 -row-mt 1 -deadline good -cpu-used 4 -pix_fmt yuv420p -fps_mode passthrough -enc_time_base 1:100 -pass 1 -f webm NUL
ffmpeg -i 'C:\Users\marka\Downloads\Tolstoy.gif' -vf "scale=384:-2" -an -c:v libvpx-vp9 -b:v 0 -crf 20 -row-mt 1 -deadline good -cpu-used 1 -pix_fmt yuv420p -fps_mode passthrough -enc_time_base 1:100 -pass 2 public/video/tolstoy-portrait-e1ebd194.webm
ffmpeg -i 'C:\Users\marka\Downloads\Tolstoy.gif' -vf "scale=384:-1,format=bgra" -frames:v 1 -c:v libwebp -quality 85 -compression_level 6 -update 1 public/images/backgrounds/tolstoy-portrait-start-e1ebd194.webp
```

Проверка с реальными видео и аудио: открыть `tests/story-portrait.html` на
локальном сервере и нажать «Проверить автоматический переход». Страница
проверяет одновременный запуск, паузу, пропуск реплики и длительность показа,
переход на финальный экран и его перезагрузку. Сохраняет снимки двух этапов
и восстанавливает прежнее сохранение игры после проверки.
