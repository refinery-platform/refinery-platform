/**
 * provvis Node Selection Service
 * @namespace provvisNodeSelectionService
 * @desc Service for updating the node selections
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisNodeSelectionService', provvisNodeSelectionService);

  provvisNodeSelectionService.$inject = [
    '$',
    'd3',
    'provvisInitDOIService',
    'provvisHelpersService',
    'provvisPartsService'
  ];

  function provvisNodeSelectionService (
    $,
    d3,
    provvisInitDOIService,
    provvisHelpersService,
    provvisPartsService
  ) {
    var doiService = provvisInitDOIService;
    var partsService = provvisPartsService;
    var provvisHelpers = provvisHelpersService;

    var service = {
      clearNodeSelection: clearNodeSelection,
      handleNodeSelection: handleNodeSelection
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * Clears node selection.
     */
    function clearNodeSelection () {
      var domNodeset = partsService.domNodeset;
      domNodeset.each(function (d) {
        d.selected = false;
        d.doi.selectedChanged();
        d3.select('#nodeId-' + d.autoId).classed('selectedNode', false);
        $('#nodeId-' + d.autoId).find('.glyph').find('rect, circle')
          .css({
            stroke: partsService.colorStrokes
          });
      });

      $('#nodeInfoTitle').html('Select a node: - ');
      $('#nodeInfoTitleLink').html('');
      $('#' + 'provenance-nodeInfo-content').html('');

      partsService.selectedNodeSet = d3.map();

      $('.filteredNode').hover(function () {
        $(this).find('rect, circle').css({
          stroke: partsService.colorHighlight
        });
      }, function () {
        $(this).find('rect, circle').css({
          stroke: partsService.colorStrokes
        });
      });
    }

     /**
     * Left click on a node to select and reveal additional details.
     * @param d Node
     */
    function handleNodeSelection (d) {
      clearNodeSelection();
      d.selected = true;
      provvisHelpers.propagateNodeSelection(d, true);
      partsService.selectedNodeSet.set(d.autoId, d);
      d3.select('#nodeId-' + d.autoId).classed('selectedNode', d.selected)
        .select('.glyph').select('rect, circle')
        .style({
          stroke: partsService.colorHighlight
        });

      $('#nodeId-' + d.autoId).hover(function () {
        $(this).find('rect, circle').css({
          stroke: partsService.colorHighlight
        });
      }, function () {
        $(this).find('rect, circle').css({
          stroke: partsService.colorHighlight
        });
      });

      d.doi.selectedChanged();
      if (partsService.doiAutoUpdate) {
        doiService.recomputeDOI();
      }
    }
  }
})();
