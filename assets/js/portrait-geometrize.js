(function(){
  'use strict';

  var source = document.getElementById('portrait-source');
  var canvas = document.getElementById('portrait-canvas');
  var caption = document.getElementById('portrait-caption');
  if (!source || !canvas || !window.Worker) return;

  var context = canvas.getContext('2d');
  var worker = new Worker('assets/js/portrait-geometrize-worker.js');
  var totalShapes = 240;
  var shapeCount = 0;
  var paused = !!(window.__siteMotion && window.__siteMotion.paused);
  var ready = false;
  var stepPending = false;

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
    if (caption) caption.textContent = 'FIG. P-01 · GEOMETRIZE / ' + String(shapeCount).padStart(3, '0') + ' OF ' + totalShapes + ' SHAPES';
  }

  function requestStep(){
    if (!ready || paused || stepPending || shapeCount >= totalShapes) return;
    stepPending = true;
    worker.postMessage({ type:'step' });
  }

  worker.onmessage = function(event){
    var message = event.data || {};

    if (message.type === 'ready'){
      context.fillStyle = rgba(message.background);
      context.fillRect(0, 0, canvas.width, canvas.height);
      ready = true;
      document.body.classList.add('portrait-geometrizing');
      updateCaption();
      document.dispatchEvent(new CustomEvent('portrait:updated'));
      requestStep();
      return;
    }

    if (message.type === 'shapes'){
      stepPending = false;
      message.shapes.forEach(drawShape);
      shapeCount += message.shapes.length;
      updateCaption();
      document.dispatchEvent(new CustomEvent('portrait:updated'));
      if (shapeCount < totalShapes) window.setTimeout(requestStep, 24);
      return;
    }

    if (message.type === 'error'){
      stepPending = false;
      console.warn('Unable to geometrize portrait:', message.message);
      worker.terminate();
    }
  };

  worker.onerror = function(error){
    console.warn('Unable to start portrait geometrization:', error.message);
    worker.terminate();
  };

  function initialize(){
    var sizingCanvas = document.createElement('canvas');
    var sizingContext = sizingCanvas.getContext('2d', { willReadFrequently:true });
    sizingCanvas.width = canvas.width;
    sizingCanvas.height = canvas.height;
    sizingContext.drawImage(source, 0, 0, canvas.width, canvas.height);
    var pixels = sizingContext.getImageData(0, 0, canvas.width, canvas.height).data;
    worker.postMessage({ type:'initialize', width:canvas.width, height:canvas.height, pixels:pixels.buffer }, [pixels.buffer]);
  }

  if (source.complete && source.naturalWidth) initialize();
  else source.addEventListener('load', initialize, { once:true });

  window.addEventListener('site:motionchange', function(event){
    paused = !!event.detail.paused;
    if (!paused) requestStep();
  });
})();
