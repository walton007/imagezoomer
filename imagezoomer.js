(function($) {
  $(document).ready(function() {
    window.gzoom = new Zoom('.zoomable img', {
      doubletap: {scale: 1.2, toggle: true},
      drag: null,
      pinch: {pinchinScale: 0.96, pinchoutScale: 1.2},
      maxScale: 2,
      minScale: 0.5
    });

  });
})(jQuery);


var Zoom = (function() {
  function parseMatrixStr(matrixStr) {
    var reg = /^matrix\(([ .,-\d]*)\)$/;
    var dataStr = matrixStr.match(reg)[1];
    var ar = dataStr.split(',');
    var a = parseFloat(ar[0]),
      b = parseFloat(ar[1]),
      c = parseFloat(ar[2]),
      d = parseFloat(ar[3]),
      e = parseFloat(ar[4]),
      f = parseFloat(ar[5]);

    return $M([
      [a, c, e],
      [b, d, f],
      [0, 0, 1]
    ]);
  }

  function GetScaleMatrix(sx, sy) {
    sx = sx || sx === 0 ? sx : 1;
    sy = sy || sy === 0 ? sy : 1;
    return $M([
      [sx, 0, 0],
      [0, sy, 0],
      [0, 0, 1]
    ]);
  };

  function GetTranslateMatrix(tx, ty) {
    tx = tx ? tx : 0;
    ty = ty ? ty : 0;

    return $M([
      [1, 0, tx],
      [0, 1, ty],
      [0, 0, 1]
    ]);
  };


  function _Zoom(el, options) {
    var $el = $(el),
      $elWrapper = $el.parent();

    this.$el = $el;
    this.$elWrapper = $elWrapper;

    
    this.reset();

    //initialOptions
    this.initHammer(options);

  };

  _Zoom.prototype.reset = function( ) {
    // For Scale caculation
    this.originInInitialCord = undefined;
    this.lastMatrix = parseMatrixStr('matrix(1, 0, 0, 1, 0, 0)'); //Matrix.I(3); 

    // For _lastOffset is used for drag caculation
    this._lastOffset = {
      left: 0,
      top: 0
    }; 

    this.transform(this.lastMatrix);
  };

  _Zoom.prototype.initHammer = function(options) {
    

    // For Scale limitation
    this._maxScale = 10;
    this._minScale = 0.2;

    var hanmmerOptions = {
      dragLockToAxis: true,
      dragBlockHorizontal: true,
      preventDefault: true
    };


    var mc = new Hammer(this.$el.get(0), hanmmerOptions);

    var self = this;
    var registedEvent = []
    if ('doubletap' in options) {
      var scale = options['doubletap'].scale;
      var toggle = !!options['doubletap'].toggle ;
      var state = 'normal'; 
      mc.on("doubletap", function(event) {
        event.gesture.preventDefault();
        if (toggle) {
          if (state === 'normal') {
            state = 'zoom';
          } else {
            state = 'normal';
            self.reset();
            return; 
          }
        };

        var left = parseFloat(self.$el.css('left'));
        var top = parseFloat(self.$el.css('top'));
        self.scaleAt(event.gesture.center.pageX - left, event.gesture.center.pageY - top, scale, 0.5);
      });
    };

    if ('drag' in options) {
      mc.on("dragstart drag dragend", function(event) {
        if (event.type === 'dragstart') {
          self._lastOffset.left = parseFloat(self.$el.css('left'));
          self._lastOffset.top = parseFloat(self.$el.css('top'));
          
          console.log('hammer dragstart:', 'left', self._lastOffset.left , 
            ' top:', self._lastOffset.top);

        } else {
          var dx = self._lastOffset.left + event.gesture.deltaX;
          var dy = self._lastOffset.top + event.gesture.deltaY;

          self.drag(dx, dy);

          console.log('hammer drag:', 'dX', dx , 
            ' dY:', dy);
        } 

        event.gesture.preventDefault();
      });
    };

    if ('pinch' in options) {
      var pinchinScale = options['pinch'].pinchinScale;
      var pinchoutScale = options['pinch'].pinchoutScale;

      //pinch pinchin pinchout
      mc.on('pinchin pinchout', function(event) {
        var gesture = event.gesture;
        var startEvent = gesture.startEvent;
        
        console.log('hammer dectect type:', event.type, ' center.pageX:', gesture.center.pageX, ' center.pageY:', gesture.center.pageY,
          '  scale:', gesture.scale,
          ' distance:', gesture.distance,
          ' startEvent:', startEvent.center.pageX, ' ', startEvent.center.pageY);

        /* Act on the event */
        var left = parseFloat(self.$el.css('left'));
        var top = parseFloat(self.$el.css('top'));
        if (event.type === 'pinchin') {
          self.scaleAt(event.gesture.center.pageX - left, event.gesture.center.pageY - top, pinchinScale, 0);
        } else {
          self.scaleAt(event.gesture.center.pageX - left, event.gesture.center.pageY - top, pinchoutScale, 0);
        }

        event.gesture.preventDefault();

      });
    };

    mc.on("mousewheel", function(ev) { 
      console.log('mousewheel event');
        
      ev.preventDefault();
    });




    if ('maxScale' in options) {
      this._maxScale = options['maxScale'];
    };
    if ('minScale' in options) {
      this._minScale = options['minScale'];
    };


  };

  _Zoom.prototype._getOriginInInitialCord = function() {
    if (!this.originInInitialCord) {
      //console.log('$el.offset(): ', this.$el.offset().left, ' ', this.$el.offset().top);
      this.originInInitialCord = {
        left: (this.$el.offset().left - this.$elWrapper.offset().left),
        top: (this.$el.offset().top - this.$elWrapper.offset().top)
      };
      //console.log('originInInitialCord: ', this.originInInitialCord.left, ' ', this.originInInitialCord.top);
    };
    return this.originInInitialCord;
  }

  _Zoom.prototype.transform = function(finalMatrix, duration) {

    var finalMatrixStr = 'matrix(' + finalMatrix.e(1, 1) + ' , ' + finalMatrix.e(2, 1) + ', ' + finalMatrix.e(1, 2) + ' , ' + finalMatrix.e(2, 2) + ', ' + finalMatrix.e(1, 3) + ', ' + finalMatrix.e(2, 3) + ')';

    console.log('transform finalMatrixStr: ', finalMatrixStr); 

      this.$el.css({
       'transition': 'transform '+ duration +'s linear',
       '-webkit-transition': '-webkit-transform '+ duration +'s linear',
      '-webkit-transform':finalMatrixStr,
      '-webkit-transform-origin': '0% 0%',
      });

    this.lastMatrix = finalMatrix;
  };

  _Zoom.prototype.drag = function(tx, ty) {
    //console.log('drag offset: ', tx, ty);

    this.$el.css({
      'left': tx + 'px',
      'top': ty + 'px',
     'transition': 'transform 0s linear',
     '-webkit-transition': '-webkit-transform 0s linear',
    });
   
    return self;
  };

  _Zoom.prototype.translate = function(tx, ty) {
    var finalMatrix = GetTranslateMatrix(tx, ty).x(this.lastMatrix);
    this.transform(finalMatrix);
    return self;
  };

  

  _Zoom.prototype.scaleAt = function(pageX, pageY, scale, duration) {
    //console.log('scaleAt ', pageX, ' ', pageY, ' scale: ', scale);
    var $el = this.$el,
      $elWrapper = this.$elWrapper;

    var originInInitialCord = this._getOriginInInitialCord();
    var posInInitialCord = {
      x: pageX - $elWrapper.offset().left - originInInitialCord.left,
      y: pageY - $elWrapper.offset().top - originInInitialCord.top
    };

    var curMatrix = this.lastMatrix;

    //limite scale range
    var curScale = curMatrix.e(1, 1);
    scale = Math.min(this._maxScale / curScale, Math.max(scale, this._minScale / curScale));
    console.log('curScale:', curScale, ' scale:', scale);

    //console.log('posInInitialCord ', posInInitialCord.x, ' ', posInInitialCord.y);

    var posInCurCord = curMatrix.inv().x($V([posInInitialCord.x, posInInitialCord.y, 1]));;

    var scaleMatrix = GetScaleMatrix(scale, scale);
    var posAfterScaleInCurCord = scaleMatrix.x(posInCurCord);
    var offsetInCurCord = {
      x: (posInCurCord.e(1) - posAfterScaleInCurCord.e(1)),
      y: (posInCurCord.e(2) - posAfterScaleInCurCord.e(2))
    };

    var translateMatrix = GetTranslateMatrix(offsetInCurCord.x, offsetInCurCord.y);

    var finalMatrix = curMatrix.x(translateMatrix).x(scaleMatrix);

    this.transform(finalMatrix, duration);

    return this;
  };

  return _Zoom;
}());