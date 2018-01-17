/**
 * Provvis Box Coords Service
 * @namespace provvisBoxCoordsService
 * @desc Service for computing bounding box
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisBoxCoordsService', provvisBoxCoordsService);

  provvisBoxCoordsService.$inject = ['provvisDeclService', 'provvisPartsService'];

  function provvisBoxCoordsService (
    provvisDeclService,
    provvisPartsService
  ) {
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;

    var service = {
      getABBoxCoords: getABBoxCoords,
      getWFBBoxCoords: getWFBBoxCoords,
      getVisibleNodeCoords: getVisibleNodeCoords
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
     /**
     * Compute bounding box for expanded analysis nodes.
     * @param an Analysis node.
     * @param offset Cell offset.
     * @returns {{x: {min: number, max: number}, y: {min: number, max: number}}}
     * Min and max x, y coords.
     */
    function getABBoxCoords (an, inOffset) {
      var cell = partsService.cell;
      var offset = inOffset;

      if (!offset) {
        offset = 0;
      }

      var minX = !an.hidden ? an.x : d3.min(an.children.values(), function (san) {
        return !san.hidden ? an.x + san.x : d3.min(san.children.values(),
          function (cn) {
            return !cn.hidden ? an.x + san.x + cn.x : an.x;
          });
      });
      var maxX = !an.hidden ? an.x : d3.max(an.children.values(), function (san) {
        return !san.hidden ? an.x + san.x : d3.max(san.children.values(),
          function (cn) {
            return !cn.hidden ? an.x + san.x + cn.x : an.x;
          });
      });
      var minY = !an.hidden ? an.y : d3.min(an.children.values(), function (san) {
        return !san.hidden ? an.y + san.y : d3.min(san.children.values(),
          function (cn) {
            return !cn.hidden ? an.y + san.y + cn.y : an.y;
          });
      });
      var maxY = !an.hidden ? an.y : d3.max(an.children.values(), function (san) {
        return !san.hidden ? an.y + san.y : d3.max(san.children.values(),
          function (cn) {
            return !cn.hidden ? an.y + san.y + cn.y : an.y;
          });
      });

      return {
        x: {
          min: minX + offset,
          max: maxX + cell.width - offset
        },
        y: {
          min: minY + offset,
          max: maxY + cell.height - offset
        }
      };
    }

    /**
     * Compute bounding box for child nodes.
     * @param n BaseNode.
     * @param offset Cell offset.
     * @returns {{x: {min: *, max: *}, y: {min: *, max: *}}} Min and
     * max x, y coords.
     */
    function getWFBBoxCoords (n, offset) {
      var cell = partsService.cell;
      var minX;
      var minY;
      var maxX;
      var maxY = 0;

      if (n.children.empty() || !n.hidden) {
        minX = (-cell.width / 2 + offset);
        maxX = (cell.width / 2 - offset);
        minY = (-cell.width / 2 + offset);
        maxY = (cell.width / 2 - offset);
      } else {
        minX = d3.min(n.children.values(), function (d) {
          return d.x - cell.width / 2 + offset;
        });
        maxX = d3.max(n.children.values(), function (d) {
          return d.x + cell.width / 2 - offset;
        });
        minY = d3.min(n.children.values(), function (d) {
          return d.y - cell.height / 2 + offset;
        });
        maxY = d3.max(n.children.values(), function (d) {
          return d.y + cell.height / 2 - offset;
        });
      }

      return {
        x: {
          min: minX,
          max: maxX
        },
        y: {
          min: minY,
          max: maxY
        }
      };
    }

    /**
     * For a node, get first visible parent node coords.
     * @param curN Node to start traversing to its parents.
     * @returns {{x: number, y: number}} X and y coordinates of the first visible
     * parent node.
     */
    function getVisibleNodeCoords (inCurN) {
      var curN = inCurN;
      var x = 0;
      var y = 0;

      while (curN.hidden && !(curN instanceof provvisDecl.Layer)) {
        curN = curN.parent;
      }

      if (curN instanceof provvisDecl.Layer) {
        x = curN.x;
        y = curN.y;
      } else {
        while (!(curN instanceof provvisDecl.Layer)) {
          x += curN.x;
          y += curN.y;
          curN = curN.parent;
        }
      }

      return {
        x: x,
        y: y
      };
    }
  }
})();
