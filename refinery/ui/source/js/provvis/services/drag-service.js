/**
 * provvis Drag Service
 * @namespace provvisDragService
 * @desc Service for dragging the nodes
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDragService', provvisDragService);

  provvisDragService.$inject = [
    'd3',
    'provvisBoxCoordsService',
    'provvisDeclService',
    'provvisPartsService',
    'provvisTooltipService',
    'provvisUpdateNodeLinksService'
  ];

  function provvisDragService (
    d3,
    provvisBoxCoordsService,
    provvisDeclService,
    provvisPartsService,
    provvisTooltipService,
    provvisUpdateNodeLinksService
  ) {
    var coordsService = provvisBoxCoordsService;
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;
    var tooltipService = provvisTooltipService;
    var updateNodeLink = provvisUpdateNodeLinksService;

    var service = {
      dragStart: dragStart,
      dragging: dragging,
      dragEnd: dragEnd,
      applyDragBehavior: applyDragBehavior
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
      /**
   * Drag start listener support for nodes.
   */
    function dragStart () {
      d3.event.sourceEvent.stopPropagation();
    }

    /**
     * Drag listener.
     * @param n Node object.
     */
    function dragging (n) {
      var self = d3.select(this);

      /* While dragging, hide tooltips. */
      tooltipService.hideTooltip();

      var deltaY = d3.event.y - n.y;

      /* Set coords. */
      n.x = d3.event.x;
      n.y = d3.event.y;

      /* Drag selected node. */
      updateNodeLink.updateNode(self, n, d3.event.x, d3.event.y);

      /* Drag adjacent links. */
      updateNodeLink.updateLink(n);

      if (n instanceof provvisDecl.Layer) {
        n.children.values().forEach(function (an) {
          an.x = n.x - (coordsService.getABBoxCoords(an, 0).x.max -
            coordsService.getABBoxCoords(an, 0).x.min) / 2 + partsService.vis.cell.width / 2;
          an.y += deltaY;
          updateNodeLink.updateNode(d3.select('#gNodeId-' + an.autoId), an, an.x, an.y);
          updateNodeLink.updateLink(an);
        });
      }

      partsService.draggingActive = true;
    }

    /**
     * Drag end listener.
     */
    function dragEnd (n) {
      if (partsService.draggingActive) {
        var self = d3.select(this);

        /* Update node and adjacent links. */
        updateNodeLink.updateNodeAndLink(n, self);

        /* Prevent other mouseevents during dragging. */
        setTimeout(function () {
          partsService.draggingActive = false;
        }, 200);
      }
    }

    /**
     * Sets the drag events for nodes.
     * @param nodeType The dom nodeset to allow dragging.
     */
    function applyDragBehavior (domDragSet) {
      /* Drag and drop node enabled. */
      var drag = d3.behavior.drag()
        .origin(function (d) {
          return d;
        })
        .on('dragstart', dragStart)
        .on('drag', dragging)
        .on('dragend', dragEnd);

      /* Invoke dragging behavior on nodes. */
      domDragSet.call(drag);
    }
  }
})();
