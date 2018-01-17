/**
 * Provvis Update Layer Service
 * @namespace provvisUpdateLayerService
 * @desc Service for updating layer links and layer nodes
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisUpdateLayerService', provvisUpdateLayerService);

  provvisUpdateLayerService.$inject = [
    'd3',
    'provvisBoxCoordsService',
    'provvisDrawLinksService',
    'provvisHelpersService',
    'provvisPartsService'
  ];

  function provvisUpdateLayerService (
    d3,
    provvisBoxCoordsService,
    provvisDrawLinksService,
    provvisHelpersService,
    provvisPartsService
  ) {
    var coordsService = provvisBoxCoordsService;
    var linkService = provvisDrawLinksService;
    var provvisHelpers = provvisHelpersService;
    var partsService = provvisPartsService;

    var service = {
      updateLayerLinks: updateLayerLinks,
      updateLayerNodes: updateLayerNodes
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
     /**
     * Draw layered nodes.
     * @param lLinks Layer links.
     */
    function updateLayerLinks (lLinks) {
      var linkStyle = partsService.linkStyle;
      var vis = partsService.vis;

      /* Data join. */
      var ln = vis.canvas.select('g.lLinks').selectAll('.link')
        .data(lLinks.values());

      /* Enter. */
      ln.enter().append('path')
        .classed({
          link: true,
          lLink: true
        })
        .attr('id', function (d) {
          return 'linkId-' + d.autoId;
        }).classed('blendedLink', function (l) {
          return !l.filtered && partsService.filterAction === 'blend';
        }).classed('filteredLink', function (l) {
          return l.filtered;
        }).classed('hiddenLink', function (l) {
          return l.hidden;
        }).attr('id', function (l) {
          return 'linkId-' + l.autoId;
        });

        /* Enter and update. */
      ln.attr('d', function (l) {
        var srcCoords = coordsService.getVisibleNodeCoords(l.source);
        var tarCoords = coordsService.getVisibleNodeCoords(l.target);

        if (linkStyle === 'bezier1') {
          return linkService.drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
            tarCoords.y);
        } else { // eslint-disable-line no-else-return
          return linkService.drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
            tarCoords.y);
        }
      }).classed({
        link: true,
        lLink: true
      })
      .attr('id', function (d) {
        return 'linkId-' + d.autoId;
      }).classed('blendedLink', function (l) {
        return !l.filtered && partsService.filterAction === 'blend';
      }).classed('filteredLink', function (l) {
        return l.filtered;
      }).classed('hiddenLink', function (l) {
        return l.hidden;
      }).attr('id', function (l) {
        return 'linkId-' + l.autoId;
      });

      /* Exit. */
      ln.exit().remove();

      /* Set dom elements. */
      partsService.lLink = vis.canvas.select('g.lLinks').selectAll('.link');
    }

    /**
     * Draw layered nodes.
     * @param lNodes Layer nodes.
     */
    function updateLayerNodes (lNodes) {
      var cell = partsService.cell;
      var lBBox = partsService.lBBox;
      var scaleFactor = partsService.scaleFactor;
      var vis = partsService.vis;

      /* Data join. */
      var ln = vis.canvas.select('g.layers').selectAll('.layer')
        .data(lNodes.values());

      /* Enter. */
      var lEnter = ln.enter().append('g')
        .classed({
          layer: true
        });

      lEnter.attr('id', function (d) {
        return 'gNodeId-' + d.autoId;
      }).attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });

      /* Adjust gradient start and stop position as well as steps based on min,
       * max and occurrences of analyses at a specific time. */
      var gradient = lEnter.append('defs')
        .append('linearGradient')
        .attr('id', function (d) {
          return 'layerGradientId-' + d.autoId;
        })
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', function (l) {
          var latestDate = d3.min(l.children.values(), function (d) {
            return d.start;
          });
          return partsService.timeColorScale(provvisHelpers.parseISOTimeFormat(latestDate));
        })
        .attr('stop-opacity', 1);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', function (l) {
          var earliestDate = d3.max(l.children.values(), function (d) {
            return d.start;
          });
          return partsService.timeColorScale(provvisHelpers.parseISOTimeFormat(earliestDate));
        })
        .attr('stop-opacity', 1);

      /* Draw bounding box. */
      lBBox = lEnter.append('g')
        .attr('id', function (ln) {  // eslint-disable-line no-shadow
          return 'BBoxId-' + ln.autoId;
        }).classed({
          lBBox: true,
          BBox: true,
          hiddenBBox: false
        })
        .attr('transform', function () {
          return 'translate(' + (-cell.width / 2) + ',' +
            (-cell.height / 2) + ')';
        });

      lBBox.append('rect')
        .attr('y', -0.6 * scaleFactor * vis.radius)
        .attr('width', function () {
          return cell.width;
        })
        .attr('height', function () {
          return cell.height;
        })
        .attr('rx', cell.width / 7)
        .attr('ry', cell.height / 7);

      /* Add a clip-path to restrict labels within the cell area. */
      lBBox.append('defs')
        .append('clipPath')
        .attr('id', function (ln) { // eslint-disable-line no-shadow
          return 'lBBClipId-' + ln.autoId;
        })
        .append('rect')
        .attr('y', -0.6 * scaleFactor * vis.radius)
        .attr('width', cell.width)
        .attr('height', cell.height + 2 * scaleFactor * vis.radius)
        .attr('rx', cell.width / 7)
        .attr('ry', cell.height / 7);

      /* Time as label. */
      lBBox.append('g').classed({
        labels: true
      })
        .attr('clip-path', function (ln) { // eslint-disable-line no-shadow
          return 'url(#lBBClipId-' + ln.autoId + ')';
        })
        .append('text')
        .attr('transform', function () {
          return 'translate(' + 1 * scaleFactor * vis.radius + ',' +
            0.5 * scaleFactor * vis.radius + ')';
        })
        .text(function (d) {
          return '\uf013' + ' ' + d.wfCode;
        }).classed('lBBoxLabel', true).style({
          'font-family': 'FontAwesome'
        });

      var lDiff = lBBox.append('g').classed('lDiff', true)
        .attr('transform', function () {
          return 'translate(' + (0) + ',' +
            (0) + ')';
        });
      lDiff.each(function (ln) { // eslint-disable-line no-shadow
        if (ln.children.values().some(function (an) {
          return an.motifDiff.numIns !== 0 || an.motifDiff.numOuts !== 0 ||
            an.motifDiff.numSubanalyses !== 0;
        })) {
          d3.select(this).append('text')
            .text(function () {
              return '\uf069';
            }).classed('diff-node-type-icon', true)
            .style({
              'font-family': 'FontAwesome'
            });
        }
      });

      var layerNode = lEnter.append('g')
        .attr('id', function (l) {
          return 'nodeId-' + l.autoId;
        }).classed({
          lNode: true,
          filteredNode: true,
          blendedNode: false,
          selectedNode: false
        })
        .classed({
          hiddenNode: function (an) {
            return an.hidden;
          }
        });
      lEnter.append('g').classed({
        children: true
      });

      var lGlyph = layerNode.append('g').classed({
        glyph: true
      });
      var lLabels = layerNode.append('g').classed({
        labels: true
      });

      /* TODO: Aggregate hidden analysis nodes into a single layer glyph.
       * Glyph dimensions depend on the amount of analysis children the layer has
       * as well as how many analyses of them are hidden. */

      lGlyph.append('defs')
        .append('clipPath')
        .attr('id', function (l) {
          return 'bbClipId-' + l.autoId;
        })
        .append('rect')
        .attr('x', -2 * scaleFactor * vis.radius)
        .attr('y', -2 * scaleFactor * vis.radius)
        .attr('rx', 1)
        .attr('ry', 1)
        .attr('width', 4 * scaleFactor * vis.radius)
        .attr('height', 4 * scaleFactor * vis.radius);

      lGlyph.each(function (ln) {  // eslint-disable-line no-shadow
        if (provvisHelpers.getLayerPredCount(ln) > 0) {
          d3.select(this).append('g').classed({
            glAnchor: true
          }).append('path')
            .attr('d', function () {
              return 'm' + (-2 * scaleFactor * vis.radius) + ' ' +
                (-0.5 * scaleFactor * vis.radius) + ' ' +
                'h' + (-0.8 * scaleFactor * vis.radius) + ' ' +
                'a' + (-0.5 * scaleFactor * vis.radius) + ' ' +
                (0.5 * scaleFactor * vis.radius) + ' 0 0 0 ' +
                '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                'h' + (+0.8 * scaleFactor * vis.radius) + ' ' + 'z';
            }).classed({
              llAnchor: true
            });
        }
      });

      lGlyph.each(function (ln) {  // eslint-disable-line no-shadow
        if (provvisHelpers.getLayerSuccCount(ln) > 0) {
          d3.select(this).append('g').classed({
            grAnchor: true
          }).append('path')
            .attr('d', function () {
              return 'm' + (2 * scaleFactor * vis.radius) + ' ' +
                (-0.5 * scaleFactor * vis.radius) + ' ' +
                'h' + (0.8 * scaleFactor * vis.radius) + ' ' +
                'a' + (0.5 * scaleFactor * vis.radius) + ' ' +
                (0.5 * scaleFactor * vis.radius) + ' 0 0 1 ' +
                '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                'h' + (-0.8 * scaleFactor * vis.radius) + ' ' + 'z';
            }).classed({
              rlAnchor: true
            });
        }
      });

      lGlyph.each(function (ln) {  // eslint-disable-line no-shadow
        if (provvisHelpers.getLayerPredCount(ln) > 1) {
          d3.select(this).select('g.glAnchor').append('text')
            .attr('transform', function () {
              return 'translate(' + (-2.8 * scaleFactor * vis.radius) + ',' +
                0.5 + ')';
            })
            .text(function () {
              return provvisHelpers.getLayerPredCount(ln);
            }).attr('class', 'lLabel');
        }
      });

      lGlyph.each(function (ln) {  // eslint-disable-line no-shadow
        if (provvisHelpers.getLayerSuccCount(ln) > 1) {
          d3.select(this).select('g.grAnchor').append('text')
            .attr('transform', function () {
              return 'translate(' + (2.8 * scaleFactor * vis.radius) + ',' +
                0.5 + ')';
            })
            .text(function () {
              return provvisHelpers.getLayerSuccCount(ln);
            }).attr('class', 'lLabel');
        }
      });

      lGlyph.append('rect')
        .attr('x', -2.25 * scaleFactor * vis.radius)
        .attr('y', -1 * scaleFactor * vis.radius)
        .attr('rx', 1)
        .attr('ry', 1)
        .attr('width', 4.5 * scaleFactor * vis.radius)
        .attr('height', 2 * scaleFactor * vis.radius).style({
          fill: function (d) {
            return 'url(#layerGradientId-' + d.autoId + ')';
          }
        }).classed({
          lGlyph: true
        });

      /* Add text labels. */
      lLabels.append('text')
        .text(function (d) {
          return d.doi.doiWeightedSum;
        }).attr('class', 'nodeDoiLabel')
        .style('display', 'none');

      lLabels.append('g')
        .classed({
          wfLabel: true
        })
        .attr('clip-path', function (l) {
          return 'url(#bbClipId-' + l.autoId + ')';
        });

      lLabels.append('text')
        .attr('transform', function () {
          return 'translate(' + (-1.1 * scaleFactor * vis.radius) + ',' +
            (0 * scaleFactor * vis.radius) + ')';
        }).text(function () {
          return '\uf0c9';
        })
        .classed('l-node-type-icon', true)
        .style({
          fill: function (l) {
            var latestDate = d3.min(l.children.values(), function (d) {
              return d.start;
            });
            return partsService.timeColorScale(provvisHelpers
              .parseISOTimeFormat(latestDate)) < '#888888' ? '#ffffff' : '#000000';
          }
        });

      lLabels.append('text')
        .attr('transform', function () {
          return 'translate(' + (0.8 * scaleFactor * vis.radius) + ',' + '0.25)';
        })
        .text(function (d) {
          return d.children.size();
        }).attr('class', 'lnLabel glyphNumeral')
        .style({
          fill: function (l) {
            var latestDate = d3.min(l.children.values(), function (d) {
              return d.start;
            });
            return partsService.timeColorScale(provvisHelpers
              .parseISOTimeFormat(latestDate)) < '#888888' ? '#ffffff' : '#000000';
          }
        });

      /* Enter and update. */
      var lUpdate = ln.attr('id', function (d) {  // eslint-disable-line no-unused-vars
        return 'gNodeId-' + d.autoId;
      }).attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });

      /* TODO: Implements update parameters. */

      /* Exit. */
      ln.exit().remove();

      /* Set dom elements. */
      partsService.layer = vis.canvas.select('g.layers').selectAll('.layer');
      partsService.lNode = d3.selectAll('.lNode');
      partsService.lBBox = d3.selectAll('.lBBox');
    }
  }
})();
