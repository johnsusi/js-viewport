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

$( function() {

  var image = undefined;
  var map = $('#map')[0];
  var transform = mat2d.create();
  var pin_fit_in_view = true;

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


//    invalidate();
  }

  function invalidate() { requestAnimationFrame(redraw); }

  $(window).on('resize', event => {

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
      g.font = '48px sans-serif';
      g.textAlign = 'center';
      g.fillStyle="rgb(255,255,255)";
      g.fillRect(0, 0, canvas.width, canvas.height);

      g.lineWidth = 2.0;
      g.strokeStyle ="rgb(127,0,0)";
      g.strokeRect(150, 150, 300, 300);
      g.strokeStyle="rgb(0,0,0)";
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


    if (pin_fit_in_view) fit_in_view();
    invalidate();

  }).resize();

  var drag = {
    active: false,
    x: undefined,
    y: undefined,
  };

  $('#map').on('mousedown', event => {
    event.preventDefault();
    drag.active = true;
    drag.x = event.pageX;
    drag.y = event.pageY;
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
    pin_fit_in_view = false;
    invalidate();
  }).on('mousewheel', event => {
    event.preventDefault();
    if (drag.active) return;
    pin_fit_in_view = false;

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

  function fit_in_view() {
    zoom_to_rect(0, 0, image.width, image.height);
    pin_fit_in_view = true;
  }


  function zoom_to_rect(x, y, width, height) {
    var iw = width;
    var ih = height;
    var vw = map.width;
    var vh = map.height;

    var scalex = vw / iw;
    var scaley = vh / ih;
    var scale = Math.min(scalex, scaley);

    var dx = Math.abs(vw - iw*scale);
    var dy = Math.abs(vh - ih*scale);

    transform = mat2d.create();

    var tx = scalex > scaley ? (dx - 2*x*scale) / (2) : -x * scale;
    var ty = scaley > scalex ? (dy - 2*y*scale) / (2) : -y * scale;

    mat2d.mul(transform, transform, [
      scale, 0,
      0, scale,
      tx, ty
    ]);
    invalidate();
  }

  $('#fit_in_view').click(fit_in_view);
  $('#fit_in_rect').click(event => {
    zoom_to_rect(150, 150, 300, 300);
  });

});
