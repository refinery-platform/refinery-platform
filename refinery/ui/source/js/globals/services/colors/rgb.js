'use strict';

angular
  .module('colors')
  .service('RGB', ['$injector', function ($injector) {
    /**
     * RGB constructor object
     *
     * @param   Number  red    The red color value.
     * @param   Number  green  The green color value.
     * @param   Number  blue   The blue color value.
     */
    function RGB (red, green, blue) {
      if (typeof red === 'object') {
        this.blue = red.blue;
        this.green = red.green;
        this.red = red.red;
      } else {
        this.blue = blue;
        this.green = green;
        this.red = red;
      }
    }

    /**
     * Assign constructor to itself
     *
     * @type {Function}
     */
    RGB.prototype.constructor = RGB;

    /**
     * Converts the RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and l in the set [0, 1].
     *
     * @param   Number  r  The red color value.
     * @param   Number  g  The green color value.
     * @param   Number  b  The blue color value.
     * @return  Array      The HSL representation.
     */
    RGB.prototype.toHsl = function () {
      var r = this.red / 255;
      var g = this.green / 255;
      var b = this.blue / 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var h;
      var s;
      var l = (max + min) / 2;
      var HSL = $injector.get('HSL');

      if (max === min) {
        h = s = 0;  // achromatic
      } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {  // eslint-disable-line default-case
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }

      return new HSL(
        h,
        s,
        l
      );
    };

    /**
     * Converts the RGB color value to HEX.
     *
     * @param   Number  r  The red color value.
     * @param   Number  g  The green color value.
     * @param   Number  b  The blue color value.
     * @return  String     The HEX representation.
     */
    RGB.prototype.toHex = function () {
      var HEX = $injector.get('HEX');

      return new HEX(
        '#' + ((1 << 24) + (this.red << 16) + (this.green << 8) + this.blue).toString(16).slice(1)
      );
    };

    RGB.prototype.luminosity = function (red, green, blue) {
      // http://www.w3.org/TR/WCAG20/#relativeluminancedef
      var _red = red;
      var _green = green;
      var _blue = blue;

      if (typeof red === 'undefined') {
        _red = this.red;
        _green = this.green;
        _blue = this.blue;
      }

      function lum (absValue) {
        var relValue = absValue / 255;
        return relValue <= 0.03928 ?
          relValue / 12.92 : Math.pow(((relValue + 0.055) / 1.055), 2.4);
      }

      return 0.2126 * lum(_red) + 0.7152 * lum(_green) + 0.0722 * lum(_blue);
    };

    RGB.prototype.contrast = function (color) {
      // http://www.w3.org/TR/WCAG20/#contrast-ratiodef
      var lum1 = this.luminosity(this.red, this.green, this.blue);
      var lum2 = this.luminosity(color.red, color.green, color.blue);
      if (lum1 > lum2) {
        return (lum1 + 0.05) / (lum2 + 0.05);
      }
      return (lum2 + 0.05) / (lum1 + 0.05);
    };

    Object.defineProperty(RGB.prototype, 'blue', {
      get: function () {
        return this._blue;
      },
      set: function (blue) {
        if (!(Number(blue) === blue && blue % 1 === 0 && blue >= 0 && blue <= 255)) {
          throw new Error('Blue must be an integer between 0 and 255.');
        }
        this._blue = blue;
      }
    });

    Object.defineProperty(RGB.prototype, 'green', {
      get: function () {
        return this._green;
      },
      set: function (green) {
        if (!(Number(green) === green && green % 1 === 0 && green >= 0 && green <= 255)) {
          throw new Error('Green must be an integer between 0 and 255.');
        }
        this._green = green;
      }
    });

    Object.defineProperty(RGB.prototype, 'red', {
      get: function () {
        return this._red;
      },
      set: function (red) {
        if (!(Number(red) === red && red % 1 === 0 && red >= 0 && red <= 255)) {
          throw new Error('Red must be an integer between 0 and 255.');
        }
        this._red = red;
      }
    });

    return RGB;
  }]);
