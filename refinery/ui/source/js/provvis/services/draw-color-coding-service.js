/**
 * provvis Draw Color Coding Service
 * @namespace provvisDrawColorCodingService
 * @desc Service for color coding views
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDrawColorCodingService', provvisDrawColorCodingService);

  provvisDrawColorCodingService.$inject = [
    'd3',
    '$',
    'provvisDeclService',
    'provvisHelpersService',
    'provvisPartsService'
  ];

  function provvisDrawColorCodingService (
    d3,
    $,
    provvisDeclService,
    provvisHelpersService,
    provvisPartsService
  ) {
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;
    var provvisHelpers = provvisHelpersService;
    var service = {
      drawColorcodingView: drawColorcodingView
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
      /* TODO: Clean up. */
  /* TODO: May add bounding box color. */
  /**
   * Colorcoding view.
   */
    function drawColorcodingView () {
      var wfColorScale = d3.scale.category10();
      var wfColorData = d3.map();
      var colorStrokes = partsService.colorStrokes;
      var colorHighlight = partsService.colorHighlight;

      wfColorData.set('dataset', 0);
      var wfIndex = 1;
      partsService.vis.graph.workflowData.values().forEach(function (wf) {
        var wfName = wf.name;
        if (wf.name.substr(0, 15) === 'Test workflow: ') {
          wfName = wf.name.substr(15, wf.name.length - 15);
        }
        if (wfName.indexOf('(') > 0) {
          wfName = wfName.substr(0, wfName.indexOf('('));
        }
        if (wfName.indexOf('-') > 0) {
          wfName = wfName.substr(0, wfName.indexOf('-'));
        }
        if (!wfColorData.has(wfName)) {
          wfColorData.set(wfName, (wfIndex));
          wfIndex++;
        }
        wf.code = wfName;
      });

      wfColorData.entries().forEach(function (wf, i) {
        var wfName = wf.key;

        $('<tr/>', {
          id: 'provvis-cc-wf-tr-' + i
        }).appendTo('#prov-ctrl-cc-workflow-content');

        $('<td/>', {
          id: 'provvis-cc-wf-td-' + i
        }).appendTo('#provvis-cc-wf-tr-' + i);

        $('<label/>', {
          id: 'provvis-cc-wf-label-' + i,
          class: 'provvis-cc-label',
          html: '<input id="provvis-cc-wf-color-' + i +
            '" type="text">' + wfName
        }).appendTo('#provvis-cc-wf-td-' + i);

        $('<em/>', {
          id: 'provvis-cc-wf-hex-' + i,
          class: 'provvis-cc-hide-hex',
          html: wfColorScale(wf.value)
        }).appendTo('#provvis-cc-wf-label-' + i);

        /* Change event. */
        $('#provvis-cc-wf-color-' + i).spectrum({
          color: wfColorScale(wf.value),
          showAlpha: false,
          change: function (color) {
            $('#provvis-cc-wf-hex-' + i).text(color.toHexString());
            switchColorScheme('workflow');
          }
        });
      });

      var updateStrokesColor = function (color) {
        $('#provvis-cc-strokes-hex').text(color);
        partsService.link.style({
          stroke: color
        });
        partsService.domNodeset.style({
          stroke: color
        });
        $('.glAnchor, .grAnchor').css({
          stroke: color,
          fill: color
        });
      };

      var updateHighlightColor = function (color) {
        $('#provvis-cc-highlight-hex').text(color);
        partsService.hLink.style({
          stroke: color
        });

        $('.filteredNode').hover(function () {
          $(this).find('rect, circle').css({
            stroke: color
          });
        }, function () {
          $(this).find('rect, circle').css({
            stroke: colorStrokes
          });
        });

        $('.glAnchor, .grAnchor').hover(function () {
          $(this).css({
            stroke: color,
            fill: color
          });
        }, function () {
          $(this).css({
            stroke: colorStrokes,
            fill: colorStrokes
          });
        });
      };

      /* Change events. */
      $('#provvis-cc-strokes').spectrum({
        color: '#136382',
        showAlpha: true,
        change: function (color) {
          colorStrokes = color.toHexString();
          updateStrokesColor(colorStrokes);
          updateHighlightColor(colorHighlight);
        }
      });

      $('#provvis-cc-highlight').spectrum({
        color: '#ed7407',
        showAlpha: true,
        change: function (color) {
          colorHighlight = color.toHexString();
          updateHighlightColor(colorHighlight);
        }
      });

      $('#provvis-cc-layer')
        .spectrum({
          color: '#1f77b4',
          showAlpha: true,
          change: function (color) {
            $('#provvis-cc-layer-hex').text(color.toHexString());
            switchColorScheme('nodetype');
          }
        });

      $('#provvis-cc-analysis').spectrum({
        color: '#2ca02c',
        showAlpha: true,
        change: function (color) {
          $('#provvis-cc-analysis-hex').text(color.toHexString());
          switchColorScheme('nodetype');
        }
      });

      $('#provvis-cc-subanalysis').spectrum({
        color: '#d62728',
        showAlpha: true,
        change: function (color) {
          $('#provvis-cc-subanalysis-hex').text(color.toHexString());
          switchColorScheme('nodetype');
        }
      });

      $('#provvis-cc-special').spectrum({
        color: '#17becf',
        showAlpha: true,
        change: function (color) {
          $('#provvis-cc-special-hex').text(color.toHexString());
          switchColorScheme('nodetype');
        }
      });

      $('#provvis-cc-dt').spectrum({
        color: '#7f7f7f',
        showAlpha: true,
        change: function (color) {
          $('#provvis-cc-dt-hex').text(color.toHexString());
          switchColorScheme('nodetype');
        }
      });

      $('#provvis-cc-intermediate').spectrum({
        color: '#bcbd22',
        showAlpha: true,
        change: function (color) {
          $('#provvis-cc-intermediate-hex').text(color.toHexString());
          switchColorScheme('nodetype');
        }
      });

      $('#provvis-cc-stored').spectrum({
        color: '#8c564b',
        showAlpha: true,
        change: function (color) {
          $('#provvis-cc-stored-hex').text(color.toHexString());
          switchColorScheme('nodetype');
        }
      });

      /* On accordion header click. */
      $('[id^=prov-ctrl-cc-none-]').on('click', function () {
        switchColorScheme('none');
      });

      $('[id^=prov-ctrl-cc-time-]').on('click', function () {
        switchColorScheme('time');
      });

      $('[id^=prov-ctrl-cc-workflow-]').on('click', function () {
        switchColorScheme('workflow');
      });

      $('[id^=prov-ctrl-cc-nodetype-]').on('click', function () {
        switchColorScheme('nodetype');
      });

    /**
     * Helper function to switch color scheme.
     * @param checkedColor Color scheme.
     */
      var switchColorScheme = function (checkedColor) {
        var aNode = partsService.aNode;
        var domNodeset = partsService.domNodeset;
        var lNode = partsService.lNode;
        var node = partsService.node;
        var saNode = partsService.saNode;

        switch (checkedColor) {   // eslint-disable-line default-case
          case 'none':
            domNodeset.select('.glyph').selectAll('rect, circle')
              .style({
                fill: '#ffffff'
              });
            domNodeset.selectAll('.anLabel, .sanLabel, .anwfLabel, ' +
              '.sanwfLabel, .an-node-type-icon, .san-node-type-icon')
              .style({
                fill: '#000000'
              });
            lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon')
              .style({
                fill: '#000000'
              });
            break;
          case 'time':
            lNode.each(function (l) {
              d3.select('#nodeId-' + l.autoId).select('.glyph')
                .selectAll('rect').style('fill', function () {
                  return 'url(#layerGradientId-' + l.autoId + ')';
                });
            });
            lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon').style({
              fill: function (l) {
                var latestDate = d3.min(l.children.values(), function (d) {
                  return d.start;
                });
                return partsService.timeColorScale(provvisHelpers
                  .parseISOTimeFormat(latestDate)) < '#888888' ? '#ffffff' : '#000000';
              }
            });

            aNode.select('.glyph').selectAll('rect, circle')
              .style('fill', function (d) {
                return partsService.timeColorScale(provvisHelpers.parseISOTimeFormat(d.start));
              });
            aNode.selectAll('.anLabel, .anwfLabel, .an-node-type-icon').style({
              fill: function (an) {
                return partsService.timeColorScale(provvisHelpers
                  .parseISOTimeFormat(an.start)) < '#888888' ? '#ffffff' : '#000000';
              }
            });


            saNode.select('.glyph').selectAll('rect, circle')
              .style('fill', function (d) {
                return partsService.timeColorScale(provvisHelpers
                  .parseISOTimeFormat(d.parent.start));
              });
            saNode.selectAll('.sanLabel, .sanwfLabel, .san-node-type-icon')
              .style({
                fill: function (san) {
                  return partsService.timeColorScale(provvisHelpers
                    .parseISOTimeFormat(san.parent.start)) < '#888888' ? '#ffffff' : '#000000';
                }
              });

            node.select('.glyph').selectAll('rect, circle')
              .style('fill', function (d) {
                return partsService.timeColorScale(
                  provvisHelpers.parseISOTimeFormat(d.parent.parent.start));
              });
            node.selectAll('.stored-node-type-icon').style({
              fill: function (n) {
                return partsService.timeColorScale(provvisHelpers
                  .parseISOTimeFormat(n.parent.parent.start)) < '#888888' ? '#ffffff' : '#000000';
              }
            });
            break;
          case 'workflow':
            var wfc = function (i) {
              return $('#provvis-cc-wf-hex-' + i).text();
            };

            domNodeset.each(function (d) {
              var cur = d;
              while (!(cur instanceof provvisDecl.Layer)) {
                cur = cur.parent;
              }
              d3.select('#nodeId-' + d.autoId).select('.glyph')
                .selectAll('rect, circle')
                .style({
                  fill: wfc(wfColorData.get(cur.wfCode))
                });
            });
            domNodeset.selectAll('.anLabel, .sanLabel, .anwfLabel, ' +
              '.sanwfLabel, .an-node-type-icon, .san-node-type-icon')
              .style({
                fill: '#000000'
              });
            lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon')
              .style({
                fill: '#000000'
              });
            break;
          case 'nodetype':
            var nt = function (t) {
              return $('#provvis-cc-' + t + '-hex').text();
            };

            domNodeset.each(function (d) {
              d3.select('#nodeId-' + d.autoId).select('.glyph')
                .selectAll('rect, circle').style({
                  fill: nt(d.nodeType)
                });
            });
            domNodeset.selectAll('.anLabel, .sanLabel, .anwfLabel, ' +
              '.sanwfLabel, .an-node-type-icon, .san-node-type-icon')
              .style({
                fill: '#000000'
              });
            lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon')
              .style({
                fill: '#000000'
              });
            node.selectAll('.stored-node-type-icon').style({
              fill: '#ffffff'
            });
            break;
        }
      };
    }
  }
})();
