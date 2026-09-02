(() => {
  'use strict';

  // Keep startup intentionally simple: no survey, no first-run questionnaire,
  // no forced update cover, and no startup-time game/point DOM mutations.

  function bypassLegacyStartup() {
    try {
      document.body?.classList.remove('setup-pending');
      document.documentElement.style.overflow = '';
      if (document.body) document.body.style.overflow = '';

      const firstStart = document.getElementById('firstStartBack');
      if (firstStart) firstStart.remove();

      const firstSetup = document.getElementById('firstSetupBack');
      if (firstSetup) firstSetup.remove();

      const survey = document.getElementById('opoongStartupSurveyBack');
      if (survey) survey.remove();

      // Prevent old startup gates from returning on this device.
      try {
        localStorage.setItem('opoong_first_setup_v1', '1');
        localStorage.setItem('opoong_startup_survey_closed_forever_v1', '1');
      } catch (_) {}
    } catch (error) {
      console.warn('O.Poong startup cleanup:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bypassLegacyStartup, { once: true });
  } else {
    bypassLegacyStartup();
  }

  window.addEventListener('load', bypassLegacyStartup, { once: true });

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      await reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (error) {
      console.warn('O.Poong PWA update check:', error);
    }
  });
})();
