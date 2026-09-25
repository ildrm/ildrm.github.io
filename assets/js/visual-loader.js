(function () {
  'use strict';

  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var desktop = window.matchMedia('(min-width: 900px)').matches;
  if (body.dataset.page !== 'home' || reduced || saveData || !desktop) {
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

  function start() {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.1/three.min.js',
      'sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O')
      .then(function () { return loadScript('assets/js/scene.js'); })
      .then(function () {
        if (body.dataset.page !== 'home') return;
        return loadScript('assets/vendor/geometrize/geometrize.js')
          .then(function () { return loadScript('assets/js/portrait-geometrize.js'); });
      })
      .catch(function () { body.classList.add('no-webgl'); });
  }

  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2500 });
  else window.setTimeout(start, 1200);
})();
