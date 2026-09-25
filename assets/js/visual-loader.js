(function () {
  'use strict';

  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var desktop = window.matchMedia('(min-width: 900px)').matches;
  if (body.dataset.page !== 'home' || reduced || saveData) {
    body.classList.add('no-webgl');
    return;
  }

  function loadScript(src, integrity) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = 'anonymous';
      }
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // The portrait worker must keep running even when the optional WebGL scene fails.
  function startPortrait() {
    loadScript('assets/js/portrait-geometrize.js')
      .catch(function () {
        body.classList.add('portrait-failed');
        var caption = document.getElementById('portrait-caption');
        if (caption) caption.textContent = 'FIG. P-01 · SOURCE IMAGE';
      });
  }

  function startScene() {
    if (!desktop) {
      body.classList.add('no-webgl');
      return;
    }
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.1/three.min.js',
      'sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O')
      .then(function () { return loadScript('assets/js/scene.js'); })
      .catch(function () { body.classList.add('no-webgl'); });
  }

  function start() {
    startPortrait();
    startScene();
  }

  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2500 });
  else window.setTimeout(start, 1200);
})();
