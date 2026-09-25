(function(){
  'use strict';

  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motionButton = document.getElementById('motion-toggle');
  var storageKey = 'sil-motion-paused';
  var userPaused = false;

  try { userPaused = localStorage.getItem(storageKey) === 'true'; } catch (error) { userPaused = false; }

  function setMotion(paused, persist){
    userPaused = !!paused;
    body.classList.toggle('motion-paused', reduceMotion || userPaused);
    if (motionButton){
      motionButton.disabled = reduceMotion;
      motionButton.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      motionButton.textContent = reduceMotion ? 'Motion reduced' : (userPaused ? 'Resume motion' : 'Pause motion');
    }
    if (persist){
      try { localStorage.setItem(storageKey, String(userPaused)); } catch (error) { /* Storage may be unavailable. */ }
    }
    window.dispatchEvent(new CustomEvent('site:motionchange', { detail:{ paused:reduceMotion || userPaused } }));
  }

  window.__siteMotion = {
    get paused(){ return reduceMotion || userPaused; },
    setPaused:function(value){ setMotion(value, true); }
  };

  if (motionButton){
    motionButton.addEventListener('click', function(){
      if (!reduceMotion) setMotion(!userPaused, true);
    });
  }

  function pad(value){ return String(value).padStart(2, '0'); }
  function updateTelemetry(){
    var now = new Date();
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var progress = Math.max(0, Math.min(1, window.scrollY / max));
    var telemetry = document.getElementById('telemetry');
    var bar = document.getElementById('progress-bar');
    var pageLabel = (body.dataset.page || 'home').toUpperCase();
    if (telemetry) telemetry.innerHTML = pageLabel + ' / LOCAL ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + '<br>DEPTH ' + String(Math.round(progress * 100)).padStart(3, '0') + '%';
    if (bar) bar.style.width = (progress * 100).toFixed(2) + '%';
  }
  if (body.dataset.page !== 'projects'){
    window.addEventListener('scroll', updateTelemetry, { passive:true });
    window.addEventListener('resize', updateTelemetry, { passive:true });
    window.setInterval(updateTelemetry, 1000);
    updateTelemetry();
  }

  function anchorOffset(){ return window.innerWidth <= 760 ? 76 : 92; }
  function alignHash(){
    if (!location.hash) return;
    var target = document.getElementById(location.hash.slice(1));
    if (target) window.scrollTo(0, Math.max(0, target.offsetTop - anchorOffset()));
  }
  window.addEventListener('hashchange', function(){ window.setTimeout(alignHash, 35); });
  window.addEventListener('load', function(){ window.setTimeout(alignHash, 80); });

  document.addEventListener('visibilitychange', function(){
    window.dispatchEvent(new CustomEvent('site:visibility', { detail:{ hidden:document.hidden } }));
  });

  setMotion(userPaused, false);
})();
