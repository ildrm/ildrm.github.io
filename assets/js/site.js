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
  window.addEventListener('scroll', updateTelemetry, { passive:true });
  window.addEventListener('resize', updateTelemetry, { passive:true });
  window.setInterval(updateTelemetry, 1000);
  updateTelemetry();

  var selector = document.getElementById('page-select');
  if (selector){
    selector.value = body.dataset.page || 'home';
    selector.addEventListener('change', function(){
      var option = selector.options[selector.selectedIndex];
      if (option && option.dataset.href) window.location.href = option.dataset.href;
    });
  }

  function anchorOffset(){ return window.innerWidth <= 760 ? 76 : 92; }
  function alignHash(){
    if (!location.hash) return;
    var target = document.getElementById(location.hash.slice(1));
    if (target) window.scrollTo(0, Math.max(0, target.offsetTop - anchorOffset()));
  }
  window.addEventListener('hashchange', function(){ window.setTimeout(alignHash, 35); });
  window.addEventListener('load', function(){ window.setTimeout(alignHash, 80); });

  var filed = document.getElementById('filed-date');
  if (filed){
    var today = new Date();
    filed.textContent = 'Filed on ' + today.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  }

  var internalLinks = Array.from(document.querySelectorAll('a[href$=".html"], a[href*=".html#"]'));
  internalLinks.forEach(function(link){
    link.addEventListener('click', function(event){
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || link.target === '_blank' || reduceMotion || !window.gsap) return;
      var destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin || destination.href === location.href) return;
      event.preventDefault();
      body.classList.add('is-leaving');
      gsap.to('.page-transition', { scaleY:1, duration:.36, ease:'power2.inOut', onComplete:function(){ location.href = destination.href; } });
    });
  });

  if (!reduceMotion && window.gsap){
    gsap.fromTo('.page-transition', { scaleY:1, transformOrigin:'top' }, { scaleY:0, duration:.48, ease:'power2.inOut', clearProps:'transformOrigin' });
  }

  document.addEventListener('visibilitychange', function(){
    window.dispatchEvent(new CustomEvent('site:visibility', { detail:{ hidden:document.hidden } }));
  });

  setMotion(userPaused, false);
})();
