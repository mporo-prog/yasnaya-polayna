 /**Общая hover-анимация для кнопок игры — аналог CSS
 *   .button:hover { transform: translateY(-2px); transition: 0.2s ease; }
 * на канвасе Phaser (CSS/DOM-классы на игровые объекты не действуют).
 */ 
(function () {
  function applyHoverLift(scene, hitTarget, moveTargets, options = {}) {
    const liftPx = options.liftPx ?? 2; // как translateY(-2px)
    const duration = options.duration ?? 200; // как transition 0.2s
    const targets = Array.isArray(moveTargets) ? moveTargets : [moveTargets];
    const baseY = hitTarget.y;

    hitTarget.on('pointerover', () => {
      scene.tweens.add({ targets, y: baseY - liftPx, duration, ease: 'Sine.easeOut' });
    });
    hitTarget.on('pointerout', () => {
      scene.tweens.add({ targets, y: baseY, duration, ease: 'Sine.easeOut' });
    });
  }

  window.VN.systems.ButtonFx = { applyHoverLift };
})();
