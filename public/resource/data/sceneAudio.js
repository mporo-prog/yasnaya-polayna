/** Музыка/эффекты меню и мини-игр. Формат тот же, что в storyAudio.js. */
window.VN.data.sceneAudio = {
  MainMenuScene: { music: { path: 'music/test_piano.mp3', loop: true } },
  GameScene1: { music: null, transition: {
    type: 'fadeout',
    duration: 1,
    delay: 0,
    },
    sounds: [{path: "voice_and_sound/gameplay1_rasskazchik.mp3", loop: false}]
  },
  GameScene2: { music: null },
  GameScene3: { music: null },
  GameScene4: { music: null },
  QuoteMinigameScene: { music: { path: 'sound/voice_and_sound/music_gameplay_5.mp33', loop: true } },
  PlaceholderMinigameScene: { music: null },
  // Пауза и настройки продолжают текущую музыку, поэтому здесь не перечислены.
};
