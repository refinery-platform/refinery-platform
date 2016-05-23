'use strict';

/**
 * Angular module for the provenance visualization.
 */
angular
  .module('refineryProvvis', [])
  .controller('provvisNavbarController', ['$scope', function ($scope) {
    $scope.name = 'Navbar';
  }])
  .controller('provvisCanvasController', ['$scope', function ($scope) {
    $scope.name = 'Canvas';
  }])
  .directive('provvisNavBar', [function () {
    return {
      templateUrl: '/static/partials/provvis/partials/provvis-navbar.html',
      restrict: 'A'
    };
  }])
  .directive('provvisCanvas', [function () {
    return {
      templateUrl: '/static/partials/provvis/partials/provvis-canvas.html',
      restrict: 'A'
    };
  }]);

/**
 * The refinery provenance graph visualization.
 *
 * @author sluger Stefan Luger https://github.com/sluger
 * @exports runProvVis The published function to run the visualization.
 */
var provvis = (function (  // eslint-disable-line no-unused-vars
  $, provvisDecl, provvisInit, provvisLayout, provvisMotifs, provvisRender
) {
  var vis = Object.create(null);

  /* TODO: Rewrite in angular template. */
  /**
   * Timeline view only showing analysis within a time-gradient background.
   * @param divId Div id.
   */
  var createTimelineView = function (divId) {
    /* New timeline view content. */
    var timelineContainer = d3.select('#' + divId);

    $('<p/>', {
      id: 'tlTitle',
      html: 'Analysis Timeline'
    }).appendTo(timelineContainer);

    $('<p/>', {
      id: 'tlThresholdStart',
      class: 'tlThreshold'
    }).appendTo(timelineContainer);

    $('<p/>', {
      id: 'tlCanvas'
    }).appendTo(timelineContainer);

    d3.select('#tlCanvas').append('svg')
      .attr('height', 80)
      .attr('width', 275)
      .style({
        'margin-top': '0px',
        'margin-bottom': '0px',
        padding: '0px'
      })
      .attr('pointer-events', 'all');

    $('<p/>', {
      id: 'tlThresholdEnd',
      class: 'tlThreshold'
    }).appendTo(timelineContainer);
  };

  /* TODO: Rewrite in angular template. */
  /**
   * DOI view.
   * @param divId Div id.
   */
  var createDOIView = function (divId) {
    /* New DOI view content. */
    var doiContainer = d3.select('#' + divId);

    $('<p/>', {
      id: 'doiTitle',
      html: 'Degree-Of-Interest'
    }).appendTo(doiContainer);

    $('<div/>', {
      id: 'doiVis',
      style: 'width: 100%; height: 300px;'
    }).appendTo(doiContainer);

    $('<div/>', {
      id: 'doiCanvas',
      style: 'width: 70px; float: left;'
    }).appendTo('#doiVis');

    d3.select('#doiCanvas')
      .append('svg')
      .attr('height', 300)
      .attr('width', 100)
      .style({
        'margin-top': '0px',
        'margin-left': '0px',
        padding: '0px'
      })
      .attr('pointer-events', 'all')
      .append('g')
      .append('g')
      .attr('transform', function () {
        return 'translate(0,0)';
      }).append('g');

    $('<button/>', {
      id: 'prov-doi-view-apply',
      class: 'btn btn-primary',
      type: 'button',
      html: 'Apply',
      style: 'position: absolute; left: 0px; top: 340px;'
    }).appendTo(doiContainer);

    $('<label/>', {
      id: 'prov-doi-trigger',
      class: 'prov-doi-view-show-checkbox',
      style: 'display: flex; position: absolute; left: 75px; top: 340px; ' +
        'margin-top: 5px;',
      html: '<input id="prov-doi-view-trigger-input" type="checkbox" ' +
        'style="margin-right: 3px;">Auto Update'
    }).appendTo(doiContainer);

    $('<label/>', {
      id: 'prov-doi-view-show',
      class: 'prov-doi-view-show-checkbox',
      style: 'display: flex; position: absolute; left: 180px; top: 340px; ' +
        'margin-top: 5px;',
      html: '<input id="prov-doi-view-show-input" type="checkbox" ' +
        'style="margin-right: 3px;">Show DOI'
    }).appendTo(doiContainer);
  };

  /**
   * Layer reload view.
   * @param divId Div id.
   */
  var createChangeLayersView = function (divId) {
    /* New DOI view content. */
    var layerContainer = d3.select('#' + divId);

    $('<p/>', {
      id: 'changeLayerTitle',
      html: 'Change Layering'
    }).appendTo(layerContainer);

    $('<div/>', {
      id: 'prov-layering-method',
      class: 'btn-group',
      'data-toggle': 'buttons-radio'
    }).appendTo(layerContainer);

    $('<button/>', {
      id: 'prov-layering-strict',
      class: 'btn btn-primary',
      type: 'button',
      value: 'strict',
      html: 'Hard'
    }).appendTo('#prov-layering-method');

    $('<button/>', {
      id: 'prov-layering-weak',
      class: 'active btn btn-primary',
      type: 'button',
      value: 'weak',
      html: 'Soft'
    }).appendTo('#prov-layering-method');
  };

  /**
   * Display a spinning loader icon div while the provenance
   * visualization is loading.
   */
  var showProvvisLoaderIcon = function () {
    $('#provvis-loader').css('display', 'inline-block');
  };

  /**+
   * Hide the loader icon again.
   */
  var hideProvvisLoaderIcon = function () {
    $('#provvis-loader').css('display', 'none');
  };

  /**
   * Refinery injection for the provenance visualization.
   * @param studyUuid The serialized unique identifier referencing a study.
   * @param studyAnalyses Analyses objects from the refinery scope.
   * @param solrResponse Facet filter information on node attributes.
   */
  var runProvVisPrivate = function (studyUuid, studyAnalyses, solrResponse) {
    showProvvisLoaderIcon();

    /* Only allow one instance of ProvVis. */
    if (vis instanceof provvisDecl.ProvVis === false) {
      var url = '/api/v1/node?study__uuid=' + studyUuid +
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

        /* Timeline view div. */
        createTimelineView('provenance-timeline-view');

        /* DOI view div. */
        createDOIView('provenance-doi-view');

        /* Layer view div. */
        createChangeLayersView('provenance-layer-change-view');

        /* Init node cell dimensions. */
        var cell = {
          width: r * 5,
          height: r * 3
        };

        /* Initialize canvas dimensions. */
        var width = $('div#provenance-visualization').width() - 10;
        var height = $('div#solr-table-view').height() - 25;

        /* TODO: Temp fix for sidebar height. */
        $('#provenance-sidebar').css('height', height);
        /* TODO: Temp fix for sidebar max height. */
        $('#provvis-sidebar-content').css('max-height', height - 13);

        var scaleFactor = 0.75;

        var layerMethod = 'weak';
        /* weak | strict */

        /* Create vis and add graph. */
        vis = new provvisDecl.ProvVis('provenance-visualization', zoom, data, url,
          canvas, rect, margin, width, height, r, color, graph, cell,
          layerMethod);

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
        //   vis.graph = provvisInit.run(data, analysesData, solrResponse);
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
        vis.graph = provvisInit.run(data, analysesData, solrResponse);
        vis.graph.bclgNodes = provvisLayout.run(vis.graph, vis.cell);
        provvisMotifs.run(vis.graph, layerMethod);
        provvisRender.run(vis);
        hideProvvisLoaderIcon();

        try {
          /* TODO: Refine to only redraw affected canvas components. */
          /* Switch filter action. */
          $('#prov-layering-method > button').click(function () {
            layerMethod = $(this).prop('value');

            showProvvisLoaderIcon();

            $('.aHLinks').remove();
            $('.aLinks').remove();
            $('.lLinks').remove();
            $('.lLink').remove();
            $('.layers').remove();
            $('.analyses').remove();

            $('#provenance-timeline-view').children().remove();
            $('#provenance-doi-view').children().remove();

            createTimelineView('provenance-timeline-view');

            provvisDecl.DoiFactors.set('filtered', 0.2, true);
            provvisDecl.DoiFactors.set('selected', 0.2, true);
            provvisDecl.DoiFactors.set('highlighted', 0.2, true);
            provvisDecl.DoiFactors.set('time', 0.2, true);
            provvisDecl.DoiFactors.set('diff', 0.2, true);

            createDOIView('provenance-doi-view');

            /* Discover and and inject motifs. */
            provvisMotifs.run(vis.graph, layerMethod);

            /* Render graph. */
            provvisRender.run(vis);

            hideProvvisLoaderIcon();
          });
        } catch (err) {
          document.getElementById('provenance-canvas')
            .innerHTML += 'Layering Error: ' + err.message + '<br>';
        }
      });
    }
  };

  /**
   * On attribute filter change, the provenance visualization will be updated.
   * @param solrResponse Query response object holding information
   * about attribute filter changed.
   */
  var runProvVisUpdatePrivate = function (solrResponse) {
    provvisRender.runRenderUpdate(vis, solrResponse);
  };

  /**
   * Visualization instance getter.
   * @returns {null} The provvis instance.
   */
  var getProvVisPrivate = function () {
    return vis;
  };

  /**
   * Publish module function.
   */
  return {
    run: function (studyUuid, studyAnalyses, solrResponse) {
      runProvVisPrivate(studyUuid, studyAnalyses, solrResponse);
    },
    update: function (solrResponse) {
      runProvVisUpdatePrivate(solrResponse);
    },
    get: function () {
      return getProvVisPrivate();
    }
  };
}(
  window.$,
  window.provvisDecl,
  window.provvisInit,
  window.provvisLayout,
  window.provvisMotifs,
  window.provvisRender
));
