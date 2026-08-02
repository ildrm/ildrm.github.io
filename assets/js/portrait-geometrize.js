(function(){
  'use strict';

  var source = document.getElementById('portrait-source');
  var canvas = document.getElementById('portrait-canvas');
  var caption = document.getElementById('portrait-caption');
  var library = window.geometrize;
  if (!source || !canvas || !library) return;

  var context = canvas.getContext('2d');
  var worker = null;
  var runner = null;
  var sourcePixels = null;
  var totalShapes = 240;
  var shapeCount = 0;
  var paused = !!(window.__siteMotion && window.__siteMotion.paused);
  var ready = false;
  var stepPending = false;
  var useMainThread = false;
  var options = {
    shapeTypes:[1, 2, 3, 4, 5],
    candidateShapesPerStep:40,
    shapeMutationsPerStep:70,
    alpha:150
  };

  document.body.classList.add('portrait-geometrizing');
  context.fillStyle = '#111';
  context.fillRect(0, 0, canvas.width, canvas.height);

  function rgba(color){
    return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (color[3] / 255) + ')';
  }

  function averageColor(pixels){
    var red = 0;
    var green = 0;
    var blue = 0;
    var count = pixels.length / 4;

    for (var index = 0; index < pixels.length; index += 4){
      red += pixels[index];
      green += pixels[index + 1];
      blue += pixels[index + 2];
    }

    return [Math.round(red / count), Math.round(green / count), Math.round(blue / count), 255];
  }

  function packedColor(color){
    return (color[0] << 24) | (color[1] << 16) | (color[2] << 8) | color[3];
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
    if (caption) caption.textContent = 'FIG. P-01 · GEOMETRIZE / ' + String(shapeCount).padStart(3, '0') + ' OF ' + totalShapes + ' SHAPES';
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

  function handleShapes(shapes){
    stepPending = false;
    shapes.forEach(drawShape);
    shapeCount += shapes.length;
    announceUpdate();
    if (shapeCount < totalShapes) window.setTimeout(requestStep, 24);
  }

  function runMainThreadStep(){
    window.setTimeout(function(){
      try {
        var results = runner.step(options);
        var exported = library.exporter.ShapeJsonExporter.exportShapes(results);
        handleShapes(JSON.parse('[' + exported + ']'));
      } catch (error){
        handleFailure(error && error.message ? error.message : String(error));
      }
    }, 0);
  }

  function requestStep(){
    if (!ready || paused || stepPending || shapeCount >= totalShapes) return;
    stepPending = true;
    if (useMainThread) runMainThreadStep();
    else worker.postMessage({ type:'step' });
  }

  function startMainThread(){
    if (!sourcePixels) return;
    if (worker){
      worker.terminate();
      worker = null;
    }

    useMainThread = true;
    ready = false;
    stepPending = false;
    shapeCount = 0;
    var background = averageColor(sourcePixels);
    var bitmap = library.bitmap.Bitmap.createFromByteArray(canvas.width, canvas.height, sourcePixels);
    runner = new library.runner.ImageRunner(bitmap, packedColor(background));
    handleReady(background);
  }

  function handleFailure(message){
    console.warn('Portrait worker unavailable; using main-thread Geometrize:', message);
    if (!useMainThread){
      startMainThread();
      return;
    }
    document.body.classList.add('portrait-failed');
    if (caption) caption.textContent = 'FIG. P-01 · GEOMETRIZE UNAVAILABLE';
  }

  function startWorker(){
    if (!window.Worker || location.protocol === 'file:'){
      startMainThread();
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

  if (source.complete && source.naturalWidth) initialize();
  else source.addEventListener('load', initialize, { once:true });

  source.addEventListener('error', function(){
    document.body.classList.add('portrait-failed');
    if (caption) caption.textContent = 'FIG. P-01 · SOURCE IMAGE UNAVAILABLE';
  }, { once:true });

  window.addEventListener('site:motionchange', function(event){
    paused = !!event.detail.paused;
    if (!paused) requestStep();
  });
})();
