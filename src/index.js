'use strict'

require('gl-matrix');
var $ = require('jquery');
require('jquery-mousewheel')($);

Math.sign = Math.sign || function(x) {
  x = +x; // convert to a number
  if (x === 0 || isNaN(x)) {
    return x;
  }
  return x > 0 ? 1 : -1;
}


function zoom_to_point(transform, x, y, factor) {



}

$( function() {

  var image = undefined;
  var transform = mat2d.create();

  mat2d.translate(transform, transform, [320, 0]);

  var last_frame = {
    timestamp: undefined,
    deltas: []
  };


  function info(key, value) {
    $('#' + key).html(value);
  }

  function redraw(timestamp) {
    if (timestamp <= last_frame.timestamp) return;
    var timestamp_delta = timestamp - last_frame.timestamp;
    last_frame.timestamp = timestamp;

    last_frame.deltas.push(timestamp_delta)


    var fps = 0.7 * 1000/timestamp_delta + 0.3 * last_frame.fps

    last_frame.fps = 1000/timestamp_delta;


    info('fps', fps.toFixed(0));

    var map = $('#map')[0];
    var overlay = $('#overlay')[0];
    var perf = performance.now();

      var g = map.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, map.width, map.height);
      g.setTransform(
        transform[0], transform[1],
        transform[2], transform[3],
        transform[4], transform[5]);
      g.drawImage(image, 0, 0);


      var g = overlay.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, overlay.width, overlay.height);
//      g.fillStyle = "rgba(255, 127, 0, 0.5)";
//      g.fillRect(0, 0, overlay.width, overlay.height);

      var p0 = vec2.fromValues(0, 0);
      var p1 = vec2.fromValues(image.width, image.height);
      var t2 = mat2d.create();
      var scale = overlay.width / map.width;
      mat2d.scale(t2, t2, [scale, scale]);
      mat2d.multiply(t2, t2, transform);
      
      g.setTransform(
        t2[0], t2[1],
        t2[2], t2[3],
        t2[4], t2[5]);
      g.strokeStyle = 'rgb(127,50,50)';
      g.strokeWidth = 10;
      g.strokeRect(p0[0], p0[1], p1[0], p1[1]);




    perf = performance.now() - perf;
    info('redraw', perf.toFixed(2) + 'ms');

    info('transform', '<br>' +
      '    ' + transform[0].toFixed(2) + ' ' + transform[1].toFixed(2) + '<br>' +
      '    ' + transform[2].toFixed(2) + ' ' + transform[3].toFixed(2) + '<br>' +
      '    ' + transform[4].toFixed(2) + ' ' + transform[5].toFixed(2));


    invalidate();
  }

  function invalidate() { requestAnimationFrame(redraw); }

  $(window).on('resize', event => {

    console.log('resize');
    $('canvas').each(function () {
      this.width = $(this).width();
      this.height = $(this).height();
    });

    image = function() {
      var canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      var g = canvas.getContext('2d');
      g.translate(0.5,0.5);
      g.font = '48px';
      g.textAlign = 'center';
      g.fillStyle="rgb(255,255,255)";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle="rgb(0,0,0)";
      for (var y = 0;y < 1024;y += 256) {
        for (var x = 0;x < 1024; x += 256) {
          g.strokeRect(x, y, x + 255, y + 255);
          var i = x / 256, j = y / 256;
          g.fillText('' + i +', ' + j, x + 128, y + 128);
        }
      }
      return canvas;
    }();


    invalidate();

  }).resize();

  var drag = {
    active: false,
    x: undefined,
    y: undefined,
    t: mat2d.create(),
  };

  var zoom = {
    timestamp: undefined,
    factor: undefined,
    t: mat2d.create(),
  }

  $('#map').on('mousedown', event => {
    event.preventDefault();
    drag.active = true;
    drag.x = event.pageX;
    drag.y = event.pageY;
    mat2d.copy(drag.t, transform);
  }).on('mouseup', event => {
    event.preventDefault();
    drag.active = false;
  }).on('mousemove', event => {
    event.preventDefault();
    if (!drag.active) return;
    var dx = (event.pageX - drag.x);
    var dy = (event.pageY - drag.y);
    var t = mat2d.create();
    mat2d.translate(t, t, [dx, dy]);
    mat2d.multiply(transform, t, transform);
    drag.x += dx;
    drag.y += dy;
    invalidate();
  }).on('mousewheel', event => {
    event.preventDefault();
    if (drag.active) return;

    var dx = (event.pageX);
    var dy = (event.pageY);

    var k = (event.deltaY * event.deltaFactor) / 120;
    var d = Math.pow(1 + Math.abs(k), k > 0 ? 1 : -1);

    var t = mat2d.create();
    mat2d.translate(t, t, [dx, dy]);
    mat2d.scale(t, t, [d, d]);
    mat2d.translate(t, t, [-dx, -dy]);
    mat2d.multiply(transform, t, transform);

    invalidate();

  });

});