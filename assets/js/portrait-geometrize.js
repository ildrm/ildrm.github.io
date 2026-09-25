(function(){
  'use strict';

  var source = document.getElementById('portrait-source');
  var canvas = document.getElementById('portrait-canvas');
  var caption = document.getElementById('portrait-caption');
  if (!source || !canvas) return;

  var context = canvas.getContext('2d');
  var worker = null;
  var sourcePixels = null;
  var totalShapes = 3000;
  var shapeCount = 0;
  var shapeQueue = [];
  var paused = document.hidden || !!(window.__siteMotion && window.__siteMotion.paused);
  var ready = false;
  var stepPending = false;
  var framePending = false;

  document.body.classList.add('portrait-geometrizing');
  context.fillStyle = '#111';
  context.fillRect(0, 0, canvas.width, canvas.height);

  function rgba(color){
    return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (color[3] / 255) + ')';
  }

  function drawShape(shape){
    var data = shape.data;
    var centerX;
    var centerY;
    context.save();
    context.fillStyle = rgba(shape.color);
    context.strokeStyle = rgba(shape.color);
    context.lineWidth = 1;

    switch (shape.type){
      case 0:
        context.fillRect(data[0], data[1], data[2] - data[0] + 1, data[3] - data[1] + 1);
        break;
      case 1:
        centerX = (data[0] + data[2]) / 2;
        centerY = (data[1] + data[3]) / 2;
        context.translate(centerX, centerY);
        context.rotate(data[4] * Math.PI / 180);
        context.fillRect(data[0] - centerX, data[1] - centerY, data[2] - data[0] + 1, data[3] - data[1] + 1);
        break;
      case 2:
        context.beginPath();
        context.moveTo(data[0], data[1]);
        context.lineTo(data[2], data[3]);
        context.lineTo(data[4], data[5]);
        context.closePath();
        context.fill();
        break;
      case 3:
        context.beginPath();
        context.ellipse(data[0], data[1], data[2], data[3], 0, 0, Math.PI * 2);
        context.fill();
        break;
      case 4:
        context.beginPath();
        context.ellipse(data[0], data[1], data[2], data[3], data[4] * Math.PI / 180, 0, Math.PI * 2);
        context.fill();
        break;
      case 5:
        context.beginPath();
        context.arc(data[0], data[1], data[2], 0, Math.PI * 2);
        context.fill();
        break;
      case 6:
        context.beginPath();
        context.moveTo(data[0], data[1]);
        context.lineTo(data[2], data[3]);
        context.stroke();
        break;
      case 7:
        context.beginPath();
        context.moveTo(data[0], data[1]);
        context.quadraticCurveTo(data[2], data[3], data[4], data[5]);
        context.stroke();
        break;
    }

    context.restore();
  }

  function updateCaption(){
    if (caption) caption.textContent = 'FIG. P-01 · GEOMETRIZE / ' + String(shapeCount).padStart(String(totalShapes).length, '0') + ' OF ' + totalShapes + ' SHAPES';
  }

  function announceUpdate(){
    updateCaption();
    document.dispatchEvent(new CustomEvent('portrait:updated'));
  }

  function handleReady(background){
    context.fillStyle = rgba(background);
    context.fillRect(0, 0, canvas.width, canvas.height);
    ready = true;
    announceUpdate();
    requestStep();
  }

  function drawFrame(){
    framePending = false;
    if (!ready || paused) return;
    var count = Math.min(12, shapeQueue.length, totalShapes - shapeCount);
    shapeQueue.splice(0, count).forEach(drawShape);
    if (count){
      shapeCount += count;
      document.body.classList.add('portrait-ready');
      announceUpdate();
    }
    if (shapeQueue.length) scheduleFrame();
    else if (shapeCount < totalShapes) window.setTimeout(requestStep, 24);
    else document.body.classList.add('portrait-complete');
  }

  function scheduleFrame(){
    if (!ready || paused || framePending || !shapeQueue.length) return;
    framePending = true;
    window.requestAnimationFrame(drawFrame);
  }

  function handleShapes(shapes){
    stepPending = false;
    var remaining = totalShapes - shapeCount - shapeQueue.length;
    for (var index = 0; index < Math.min(shapes.length, remaining); index++) shapeQueue.push(shapes[index]);
    if (shapeQueue.length) scheduleFrame();
    else window.setTimeout(requestStep, 24);
  }

  function requestStep(){
    if (!ready || paused || stepPending || framePending || shapeQueue.length || shapeCount >= totalShapes) return;
    stepPending = true;
    worker.postMessage({ type:'step' });
  }

  function handleFailure(message){
    if (worker) worker.terminate();
    worker = null;
    ready = false;
    shapeQueue = [];
    document.body.classList.remove('portrait-ready');
    document.body.classList.add('portrait-failed');
    if (caption) caption.textContent = 'FIG. P-01 · GEOMETRIZE UNAVAILABLE';
    console.warn('Portrait worker unavailable; showing the source image:', message);
  }

  function startWorker(){
    if (!window.Worker || location.protocol === 'file:'){
      handleFailure('Web Workers are unavailable');
      return;
    }

    try {
      worker = new Worker('assets/js/portrait-geometrize-worker.js');
      worker.onmessage = function(event){
        var message = event.data || {};
        if (message.type === 'ready') handleReady(message.background);
        else if (message.type === 'shapes') handleShapes(message.shapes);
        else if (message.type === 'error') handleFailure(message.message);
      };
      worker.onerror = function(error){
        handleFailure(error.message || 'Worker failed to load');
      };
      worker.postMessage({ type:'initialize', width:canvas.width, height:canvas.height, pixels:sourcePixels });
    } catch (error){
      handleFailure(error && error.message ? error.message : String(error));
    }
  }

  function initialize(){
    var sizingCanvas = document.createElement('canvas');
    var sizingContext = sizingCanvas.getContext('2d', { willReadFrequently:true });
    sizingCanvas.width = canvas.width;
    sizingCanvas.height = canvas.height;
    sizingContext.drawImage(source, 0, 0, canvas.width, canvas.height);
    sourcePixels = new Uint8ClampedArray(sizingContext.getImageData(0, 0, canvas.width, canvas.height).data);
    startWorker();
  }

  function begin(){
    if (source.decode) source.decode().then(initialize, function(){
      if (source.naturalWidth) initialize();
      else handleFailure('Source image could not be decoded');
    });
    else initialize();
  }

  if (source.complete && source.naturalWidth) begin();
  else source.addEventListener('load', begin, { once:true });

  source.addEventListener('error', function(){
    document.body.classList.add('portrait-failed');
    if (caption) caption.textContent = 'FIG. P-01 · SOURCE IMAGE UNAVAILABLE';
  }, { once:true });

  window.addEventListener('site:motionchange', function(event){
    paused = !!event.detail.paused;
    if (!paused){
      if (shapeQueue.length) scheduleFrame();
      else requestStep();
    }
  });
  document.addEventListener('visibilitychange', function(){
    paused = document.hidden || !!(window.__siteMotion && window.__siteMotion.paused);
    if (!paused){
      if (shapeQueue.length) scheduleFrame();
      else requestStep();
    }
  });
})();
