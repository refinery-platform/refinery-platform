/**
 * Provvis Main Controller
 * @namespace provvisController
 * @desc Main controller for the provvis graph, where code initializes
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .controller('ProvvisController', ProvvisController);

  ProvvisController.$inject = [
    'analysisService',
    'assayFileService',
    'provvisDeclService',
    'provvisInitService',
    'provvisLayerService',
    'provvisMotifsService',
    'provvisPartsService',
    'provvisRenderService',
    'd3',
    '$',
    '$q',
    '$scope',
    '$window'
  ];

  function ProvvisController (
    analysisService,
    assayFileService,
    provvisDeclService,
    provvisInitService,
    provvisLayerService,
    provvisMotifsService,
    provvisPartsService,
    provvisRenderService,
    d3,
    $,
    $q,
    $scope,
    $window
  ) {
    var vm = this;
    var _studyUuid = $window.externalStudyUuid;
    var _dataSetUuid = $window.dataSetUuid;
    var _assayUuid = $window.externalAssayUuid;
    var analysesList = [];
    vm.getData = getData;
    vm.launchProvvis = launchProvvis;
    vm.isGraphReady = false;

  //  var vis = Object.create(null);
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;
    var provvisInit = provvisInitService;
    var provvisLayout = provvisLayerService;
    var provvisMotifs = provvisMotifsService;
    var provvisRender = provvisRenderService;

    var vis = Object.create(null);
    activate();

    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
     */
    function activate () {
      vm.launchProvvis();
    }

    // Ajax calls, grabs the analysis & files promises for a particular data set
    function getData () {
      var analysisParams = {
        format: 'json',
        limit: 0,
        data_set__uuid: _dataSetUuid
      };

      var filesParams = {
        uuid: _assayUuid,
        offset: 0,
        data_set_uuid: _dataSetUuid
      };
      var analysisPromise = analysisService.query(analysisParams).$promise;
      var filesPromise = assayFileService.query(filesParams).$promise;
      return $q.all([analysisPromise, filesPromise]);
    }

    function launchProvvis () {
      getData().then(function (response) {
        analysesList = response[0].objects;
        var _solrResponse = response[1];
        runProvVisPrivate(_studyUuid, analysesList, _solrResponse);
      });
    }

    /**
   * Refinery injection for the provenance visualization.
   * @param studyUuid The serialized unique identifier referencing a study.
   * @param studyAnalyses Analyses objects from the refinery scope.
   * @param solrResponse Facet filter information on node attributes.
   */
    var runProvVisPrivate = function (studyUuid, studyAnalyses, solrResponse) {
      vm.isGraphReady = false;

      /* Only allow one instance of ProvVis. */
      if (vis instanceof provvisDecl.ProvVis === false) {
        var url = '/api/v1/node/?study__uuid=' + studyUuid +
          '&format=json&limit=0';
        var analysesData = studyAnalyses.filter(function (a) {
          return a.status === 'SUCCESS';
        });

        /* Parse json. */
        d3.json(url, function (error, data) {
          /* Declare d3 specific properties. */
          var zoom = Object.create(null);
          var canvas = Object.create(null);
          var rect = Object.create(null);

          /* Initialize margin conventions */
          var margin = {
            top: 20,
            right: 10,
            bottom: 20,
            left: 10
          };

          /* Set drawing constants. */
          var r = 7;
          var color = d3.scale.category20();

          /* Declare graph. */
          var graph = Object.create(null);

          /* Init node cell dimensions. */
          var cell = {
            width: r * 5,
            height: r * 3
          };

          /* Initialize canvas dimensions. */
          var width = $('div#provenance-visualization').width() - 10;
          var height = $('#provenance-view-tab').height() - 25;

          /* TODO: Temp fix for sidebar height. */
          $('#provenance-sidebar').css('height', height);
          /* TODO: Temp fix for sidebar max height. */
          $('#provvis-sidebar-content').css('max-height', height - 13);

          var scaleFactor = partsService.scaleFactor;

          var layerMethod = 'weak';
          /* weak | strict */

          /* Create vis and add graph. */
          partsService.vis = new provvisDecl.ProvVis('provenance-visualization', zoom, data, url,
            canvas, rect, margin, width, height, r, color, graph, cell,
            layerMethod);
          vis = partsService.vis;

          /* Geometric zoom. */
          var redraw = function () {
            /* Translation and scaling. */
            vis.canvas.attr('transform', 'translate(' + d3.event.translate + ')' +
              ' scale(' + d3.event.scale + ')');

            /* Semantic zoom. */
            if (d3.event.scale < 1) {
              d3.selectAll('.BBox').classed('hiddenNode', true);
              d3.selectAll('.lDiff, .aDiff').classed('hiddenNode', true);
            } else {
              d3.selectAll('.BBox').classed('hiddenNode', false);
              d3.selectAll('.lDiff, .aDiff').classed('hiddenNode', false);
            }

            if (d3.event.scale < 1.7) {
              vis.canvas.selectAll('.anLabel, .sanLabel, .lnLabel, ' +
                '.nodeAttrLabel, .stored-node-type-icon, .an-node-type-icon, ' +
                '.san-node-type-icon, .l-node-type-icon, .lBBoxLabel, ' +
                '.aBBoxLabel, .nodeDoiLabel')
                .classed('hiddenLabel', true);
              d3.selectAll('.glAnchor, .grAnchor').classed('hiddenNode', true);
            } else {
              vis.canvas.selectAll('.anLabel, .sanLabel, .lnLabel, ' +
                '.nodeAttrLabel, .stored-node-type-icon, .an-node-type-icon, ' +
                '.san-node-type-icon, .l-node-type-icon, .lBBoxLabel, ' +
                '.aBBoxLabel, .nodeDoiLabel')
                .classed('hiddenLabel', false);
              d3.selectAll('.glAnchor, .grAnchor').classed('hiddenNode', false);
            }

            /* Fix for rectangle getting translated too - doesn't work after
             * window resize.
             */
            vis.rect.attr('transform', 'translate(' +
              (-(d3.event.translate[0] + vis.margin.left) / d3.event.scale) +
              ',' + (-(d3.event.translate[1] +
              vis.margin.top) / d3.event.scale) +
              ')' + ' scale(' + (+1 / d3.event.scale) + ')');

            /* Fix to exclude zoom scale from text labels. */
            vis.canvas.selectAll('.lBBoxLabel')
              .attr('transform', 'translate(' +
                1 * scaleFactor * vis.radius + ',' +
                0.5 * scaleFactor * vis.radius + ')' +
                'scale(' + (+1 / d3.event.scale) + ')');

            vis.canvas.selectAll('.aBBoxLabel')
              .attr('transform', 'translate(' +
                1 * scaleFactor * vis.radius + ',' +
                0 * scaleFactor * vis.radius + ')' +
                'scale(' + (+1 / d3.event.scale) + ')');

            vis.canvas.selectAll('.nodeDoiLabel')
              .attr('transform', 'translate(' +
                0 + ',' + (1.6 * scaleFactor * vis.radius) + ')' +
                'scale(' + (+1 / d3.event.scale) + ')');

            vis.canvas.selectAll('.nodeAttrLabel')
              .attr('transform', 'translate(' +
                (-1.5 * scaleFactor * vis.radius) + ',' +
                (-1.5 * scaleFactor * vis.radius) + ')' +
                'scale(' + (+1 / d3.event.scale) + ')');

            /* Trim nodeAttrLabel */
            /* Get current node label pixel width. */
            var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
            d3.event.scale;

            /* Get label text. */
            d3.selectAll('.node').select('.nodeAttrLabel').each(function (d) {
              var attrText = (d.label === '') ? d.name : d.label;
              if (d.nodeType === 'stored') {
                var selAttrName = '';
                $('#prov-ctrl-visible-attribute-list > li').each(function () {
                  if ($(this).find('input[type=\'radio\']').prop('checked')) {
                    selAttrName = $(this).find('label').text();
                  }
                });
                attrText = d.attributes.get(selAttrName);
              }

              /* Set label text. */
              if (typeof attrText !== 'undefined') {
                d3.select(this).text(attrText);
                var trimRatio = parseInt(attrText.length *
                  (maxLabelPixelWidth / this.getComputedTextLength()), 10);
                if (trimRatio < attrText.length) {
                  d3.select(this).text(attrText.substr(0, trimRatio - 3) + '...');
                }
              }
            });
          };

          /* Main canvas drawing area. */
          vis.canvas = d3.select('#provenance-canvas')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('pointer-events', 'all')
            .classed('canvas', true)
            .append('g')
            .call(vis.zoom = d3.behavior.zoom()
              .on('zoom', redraw))
            .on('dblclick.zoom', null)
            .append('g');

          /* Helper rectangle to support pan and zoom. */
          vis.rect = vis.canvas.append('svg:rect')
            .attr('width', width)
            .attr('height', height)
            .classed('brect', true);


          /* Production mode exception handling. */
          // try {
          //   /* Extract graph data. */
          //   vis.graph = provvisInit.initGraph(data,
          // analysesData, solrResponse);
          //   try {
          //     /* Compute layout. */
          //     vis.graph.bclgNodes = provvisLayout.run(vis.graph, vis.cell);
          //     try {
          //       /* Discover and and inject motifs. */
          //       provvisMotifs.run(vis.graph, layerMethod);
          //       try {
          //         /* Render graph. */
          //         provvisRender.run(vis);
          //       }
          //       catch (err) {
          //         $('#provenance-canvas > svg').remove();
          //         document.getElementById('provenance-canvas').innerHTML +=
          //             'Render Module Error: ' + err.message + '<br>';
          //       }
          //     }
          //     catch (err) {
          //       $('#provenance-canvas > svg').remove();
          //       document.getElementById('provenance-canvas').innerHTML +=
          //           'Motif Module Error: ' + err.message + '<br>';
          //     }
          //   }
          //   catch (err) {
          //     $('#provenance-canvas > svg').remove();
          //     document.getElementById('provenance-canvas').innerHTML +=
          //         'Layout Module Error: ' + err.message + '<br>';
          //   }
          // }
          // catch (err) {
          //   $('#provenance-canvas > svg').remove();
          //   document.getElementById('provenance-canvas').innerHTML =
          //       'Init Module Error: ' + err.message + '<br>';
          // } finally {
          //   hideProvvisLoaderIcon();
          // }

          /* Uncomment in development mode. */
          vis.graph = provvisInit.initGraph(data, analysesData, solrResponse);
          vis.graph.bclgNodes = provvisLayout.runLayer(vis.graph, vis.cell);
          provvisMotifs.runMotifs(vis.graph, layerMethod);
          angular.copy(vis.cell, partsService.cell);

          provvisRender.runRender(vis);
          vm.isGraphReady = true;
        });
      }
    };

    /*
     * -----------------------------------------------------------------------------
     * Watchers
     * -----------------------------------------------------------------------------
     */
    $scope.$on('$destroy', function () {
      if (vis instanceof provvisDecl.ProvVis) {
        provvisInit.reset();
      }
    });
  }
})();
