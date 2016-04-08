'use strict';

angular
  .module('colors')
  .factory('HSL', ['$injector', function ($injector) {
    /**
     * HSL constructor object
     *
     * @param   String  HSL    The HSL color string.
     */
    function HSL (hue, saturation, lightness) {
      if (typeof hue === 'object') {
        this.lightness = hue.lightness;
        this.saturation = hue.saturation;
        this.hue = hue.hue;
      } else {
        this.hue = hue;
        this.lightness = lightness;
        this.saturation = saturation;
      }
    }

    /**
     * Assign constructor to itself
     *
     * @type {Function}
     */
    HSL.prototype.constructor = HSL;

    /**
     * Brighten the color by step-wise increase of lightness. If `noLast` is `true`
     * the number of steps doesn't include the final white.
     *
     * @param   {Number}   steps   Number of steps.
     * @param   {Boolean}  noLast  Skip last step, i.e. white.
     * @return  {Array}            Array of adjusted HSL colors.
     */
    HSL.prototype.brighten = function (steps, noLast) {
      var colors = [];
      var i = 0;
      var lStep = (1 - this.lightness) / (steps + (noLast ? 1 : 0));

      while (i++ < steps) {
        colors.push(new HSL(
          this.hue,
          this.saturation,
          this.lightness + (i * lStep)
        ));
      }

      return colors;
    };

    /**
     * Convert HEX to RGB and then to HSL.
     *
     * @return  {Object}  HSL object.
     */
    HSL.prototype.toHex = function () {
      return this.toRgb().toHex();
    };

    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * @return  {Array}  The RGB representation
     */
    HSL.prototype.toRgb = function () {
      var RGB = $injector.get('RGB');
      var r;
      var g;
      var b;

      function hueToRgb (p, q, t) {
        var adjustedT = t;
        if (t < 0) {
          adjustedT++;
        }
        if (t > 1) {
          adjustedT--;
        }
        if (adjustedT < 1 / 6) {
          return p + (q - p) * 6 * t;
        }
        if (adjustedT < 1 / 2) {
          return q;
        }
        if (adjustedT < 2 / 3) {
          return p + (q - p) * (2 / 3 - adjustedT) * 6;
        }
        return p;
      }

      if (this.saturation === 0) {
        r = g = b = this.lightness;  // achromatic
      } else {
        var q = this.lightness < 0.5 ?
          this.lightness * (1 + this.saturation) :
          this.lightness + this.saturation - this.lightness * this.saturation;
        var p = 2 * this.lightness - q;

        r = hueToRgb(p, q, this.hue + 1 / 3);
        g = hueToRgb(p, q, this.hue);
        b = hueToRgb(p, q, this.hue - 1 / 3);
      }

      return new RGB(
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
      );
    };

    Object.defineProperty(HSL.prototype, 'hue', {
      get: function () {
        return this._hue;
      },
      set: function (hue) {
        if (!(typeof hue === 'number' && hue >= 0 && hue <= 1)) {
          throw new Error('Hue must be a float between 0 and 1.');
        }
        this._hue = hue;
      }
    });

    Object.defineProperty(HSL.prototype, 'lightness', {
      get: function () {
        return this._lightness;
      },
      set: function (lightness) {
        if (!(typeof lightness === 'number' && lightness >= 0 && lightness <= 1)) {
          throw new Error('Lightness must be a float between 0 and 1.');
        }
        this._lightness = lightness;
      }
    });

    Object.defineProperty(HSL.prototype, 'saturation', {
      get: function () {
        return this._saturation;
      },
      set: function (saturation) {
        if (!(typeof saturation === 'number' && saturation >= 0 && saturation <= 1)) {
          throw new Error('Saturation must be a float between 0 and 1.');
        }
        this._saturation = saturation;
      }
    });

    return HSL;
  }]);
