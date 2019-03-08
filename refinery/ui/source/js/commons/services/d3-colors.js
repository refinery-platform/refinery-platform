'use strict';

angular
  .module('refineryApp')
  .factory('D3Colors', [
    'd3',
    'HEX',
    function (d3, HEX) {
      /**
       * D3Colors constructor object
       */
      function D3Colors (colors) {
        this._colors = [];
        this.colors = colors;
      }

      /**
       * Assign constructor to itself
       *
       * @type {Function}
       */
      D3Colors.prototype.constructor = D3Colors;

      D3Colors.prototype.getScaledFadedColors = function (steps) {
        var fadedColors = [];
        for (var i = 0, len = this.colors.length; i < len; i++) {
          var hsl = this.colors[i].toHsl();
          var colors = hsl.brighten(steps - 1, true);

          // Prepend original color
          colors.unshift(hsl);

          // Convert HSL back to RGB
          for (var j = 0; j < steps; j++) {
            colors[j] = colors[j].toHex().toString();
          }

          // Merge set of fading colors
          fadedColors = fadedColors.concat(colors);
        }
        return d3.scale.ordinal()
          .domain(d3.range(this.colors.length * (steps + 1)))
          .range(fadedColors);
      };

      Object.defineProperty(D3Colors.prototype, 'colors', {
        get: function () {
          return this._colors;
        },
        set: function (colors) {
          if (!(colors && colors.length)) {
            throw new Error('Colors needs to be an array.');
          }
          try {
            for (var i = 0, len = colors.length; i < len; i++) {
              this._colors.push(new HEX(colors[i]));
            }
          } catch (e) {
            throw new Error('Colors needs to be an array.');
          }
        }
      });

      return D3Colors;
    }
  ]);
