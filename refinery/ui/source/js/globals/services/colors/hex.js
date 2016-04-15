'use strict';

angular
  .module('colors')
  .factory('HEX', ['$injector', function ($injector) {
    /**
     * HEX constructor object
     *
     * @param   String  hex    The hex color string.
     */
    function HEX (hex) {
      this.hex = hex;
    }

    /**
     * Assign constructor to itself
     *
     * @type {Function}
     */
    HEX.prototype.constructor = HEX;

    /**
     * Convert HEX to RGB and then to HSL.
     *
     * @return  {Object}  HSL object.
     */
    HEX.prototype.toHsl = function () {
      return this.toRgb().toHsl();
    };

    /**
     * Convert HEX to RGB.
     *
     * @return  {Object}  RGB object.
     */
    HEX.prototype.toRgb = function () {
      var RGB = $injector.get('RGB');
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(this.hex);

      return new RGB(
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      );
    };

    /**
     * Convert HEX to String with a prepended hash
     *
     * @return  {String}  String represenation of HEX.
     */
    HEX.prototype.toString = function () {
      return '#' + this.hex;
    };

    Object.defineProperty(HEX.prototype, 'hex', {
      get: function () {
        return this._hex;
      },
      set: function (hex) {
        var _hex = hex;
        if (typeof _hex === 'string') {
          var match = _hex.match(/^#?((?:[0-9a-fA-F]{3}){1,2})$/i);
          if (!match) {
            throw new Error('String "' + _hex + '" is not a valid _hex color.');
          }
          _hex = match[1];
        } else {
          throw new Error('HEX must be a string. ' + typeof _hex);
        }
        this._hex = _hex;
      }
    });

    return HEX;
  }]);
