/* global geometrize, importScripts */
'use strict';

importScripts('../vendor/geometrize/geometrize.js');

var runner;
var exporter = geometrize.exporter.ShapeJsonExporter;
var Bitmap = geometrize.bitmap.Bitmap;
var ImageRunner = geometrize.runner.ImageRunner;

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

self.onmessage = function(event){
  var message = event.data || {};

  try {
    if (message.type === 'initialize'){
      var pixels = new Uint8Array(message.pixels);
      var background = averageColor(pixels);
      var bitmap = Bitmap.createFromByteArray(message.width, message.height, pixels);
      runner = new ImageRunner(bitmap, packedColor(background));
      self.postMessage({ type:'ready', background:background });
      return;
    }

    if (message.type === 'step' && runner){
      var results = runner.step({
        shapeTypes:[1, 2, 3, 4, 5],
        candidateShapesPerStep:40,
        shapeMutationsPerStep:70,
        alpha:150
      });
      var shapes = JSON.parse('[' + exporter.exportShapes(results) + ']');
      self.postMessage({ type:'shapes', shapes:shapes });
    }
  } catch (error){
    self.postMessage({ type:'error', message:error && error.message ? error.message : String(error) });
  }
};
