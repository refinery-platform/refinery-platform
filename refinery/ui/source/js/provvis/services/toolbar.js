/**
 * provvis Toolbar Service
 * @namespace provvisToolbarService
 * @desc Service for handling the toolbar interactions
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisToolbarService', provvisToolbarService);

  provvisToolbarService.$inject = [
    '$',
    'provvisAnalysisTimelineService',
    'provvisDagreLayoutService',
    'provvisHelpersService',
    'provvisPartsService',
    'provvisShowService',
    'provvisUpdateRenderService'
  ];

  function provvisToolbarService (
    $,
    provvisAnalysisTimelineService,
    provvisDagreLayoutService,
    provvisHelpersService,
    provvisPartsService,
    provvisShowService,
    provvisUpdateRenderService
  ) {
    var analysisService = provvisAnalysisTimelineService;
    var dagreService = provvisDagreLayoutService;
    var partsService = provvisPartsService;
    var provvisHelpers = provvisHelpersService;
    var showService = provvisShowService;
    var updateService = provvisUpdateRenderService;

    var service = {
      handleToolbar: handleToolbar
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * Handle interaction controls.
     * @param graph Provenance graph object.
     */
    function handleToolbar (graph) {
      var cell = partsService.cell;
      var scaleFactor = partsService.scaleFactor;
      var vis = partsService.vis;

      $('#prov-ctrl-layers-click').click(function () {
        showService.showAllLayers();
        dagreService.dagreDynamicLayerLayout(graph);
        if (partsService.fitToWindow) {
          provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
        }
      });

      $('#prov-ctrl-analyses-click').click(function () {
        showService.showAllAnalyses();
        dagreService.dagreDynamicLayerLayout(graph);
        if (partsService.fitToWindow) {
          provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
        }
      });

      $('#prov-ctrl-subanalyses-click').click(function () {
        showService.showAllSubanalyses();
        dagreService.dagreDynamicLayerLayout(graph);
        if (partsService.fitToWindow) {
          provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
        }
      });

      $('#prov-ctrl-workflows-click').click(function () {
        showService.showAllWorkflows();
        dagreService.dagreDynamicLayerLayout(graph);
        if (partsService.fitToWindow) {
          provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
        }
      });

      /* Switch filter action. */
      $('#prov-ctrl-filter-action > label').click(function () {
        partsService.filterAction = $(this).find('input[type=\'radio\']').prop('value');
        if (partsService.filterMethod === 'timeline') {
          analysisService.filterAnalysesByTime(d3.select('.startTimeline')
            .data()[0].time, d3.select('.endTimeline').data()[0].time, vis);
        } else {
          updateService.runRenderUpdate(vis, partsService.lastSolrResponse);
        }
      });

      /* Choose visible node attribute. */
      $('[id^=prov-ctrl-visible-attribute-list-]').click(function () {
        /* Set and get chosen attribute as active. */
        $(this).find('input[type=\'radio\']').prop('checked', true);
        var selAttrName = $(this).find('label').text(); // eslint-disable-line no-shadow

        /* On click, set current to active and unselect others. */
        $('#prov-ctrl-visible-attribute-list > li').each(function (idx, li) {
          var item = $(li);
          if (item[0].id !== ('prov-ctrl-visible-attribute-list-' +
            selAttrName)) {
            item.find('input[type=\'radio\']').prop('checked', false);
          }
        });

        /* Change attribute label on every node. */
        graph.nodes.filter(function (d) {
          return d.nodeType === 'stored';
        }).forEach(function (n) {
          var self = d3.select('#nodeId-' + n.autoId);

          var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
          d3.transform(d3.select('.canvas').select('g').select('g')
            .attr('transform')).scale[0];
          var attrText = n.name;
          if (n.nodeType === 'stored') {
            var selAttrName = ''; // eslint-disable-line no-shadow
            $('#prov-ctrl-visible-attribute-list > li').each(function () {
              if ($(this).find('input[type=\'radio\']').prop('checked')) {
                selAttrName = $(this).find('label').text(); // eslint-disable-line no-shadow
              }
            });
            attrText = n.attributes.get(selAttrName);
          }

          /* Set label text. */
          if (typeof attrText !== 'undefined') {
            self.select('.nodeAttrLabel').text(attrText);
            var trimRatio = parseInt(attrText.length * (maxLabelPixelWidth /
            self.select('.nodeAttrLabel').node().getComputedTextLength()),
              10);
            if (trimRatio < attrText.length) {
              self.select('.nodeAttrLabel').text(attrText.substr(0,
                  trimRatio - 3) +
                '...');
            }
          }
        });
      });

      /* Switch sidebar on or off. */
      $('#prov-ctrl-toggle-sidebar').click(function () {
        if (!$('#prov-ctrl-toggle-sidebar')[0].checked) {
          $('#provenance-sidebar')
            .animate({
              left: '-355'
            }, partsService.nodeLinkTransitionTime);
        } else {
          $('#provenance-sidebar')
            .animate({
              left: '20'
            }, partsService.nodeLinkTransitionTime);

          /* TODO: Temporary fix for sidbear div. */
          $('#provvis-sidebar-content').css({
            height: vis.canvas.height
          });
        }
      });

      /* Switch fit to screen on or off. */
      $('#prov-ctrl-toggle-fit').click(function () {
        if (!$('#prov-ctrl-toggle-fit')[0].checked) {
          partsService.fitToWindow = false;
        } else {
          partsService.fitToWindow = true;
        }
      });
    }
  }
})();
