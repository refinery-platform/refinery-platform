/**
 * provvis Update Analysis Service
 * @namespace provvisUpdateAnalysisService
 * @desc Service for updating analysis nodes and links
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisUpdateAnalysisService', provvisUpdateAnalysisService);

  provvisUpdateAnalysisService.$inject = [
    'provvisBoxCoordsService',
    'provvisDrawLinksService',
    'provvisHelpersService',
    'provvisPartsService'
  ];

  function provvisUpdateAnalysisService (
    provvisBoxCoordsService,
    provvisDrawLinksService,
    provvisHelpersService,
    provvisPartsService
  ) {
    var coordService = provvisBoxCoordsService;
    var linkService = provvisDrawLinksService;
    var partsService = provvisPartsService;
    var provvisHelpers = provvisHelpersService;

    var service = {
      updateAnalysisLinks: updateAnalysisLinks,
      updateAnalysisNodes: updateAnalysisNodes
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * Update analysis links.
     * @param graph The provenance graph.
     */
    function updateAnalysisLinks (vis, linkStyle) {
      /* Data join. */
      var graph = vis.graph;
      var ahl = vis.canvas.select('g.aHLinks').selectAll('.hLink')
        .data(graph.aLinks);

      /* Enter. */
      ahl.enter().append('path')
        .classed({
          hLink: true
        })
        .classed('blendedLink', function () {
          return partsService.filterAction === 'blend';
        })
        .classed('filteredLink', function (l) { return l.filtered; })
        .classed('hiddenLink', function (l) { return !l.highlighted; })
        .attr('id', function (l) { return 'hLinkId-' + l.autoId; });

      /* Enter and update. */
      ahl.attr('d', function (l) {
        var srcCoords = coordService.getVisibleNodeCoords(l.source);
        var tarCoords = coordService.getVisibleNodeCoords(l.target);
        var drawType;
        if (linkStyle === 'bezier1') {
          drawType = linkService.drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
            tarCoords.y);
        } else {
          drawType = linkService.drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
            tarCoords.y);
        }
        return drawType;
      }).classed('blendedLink', function (l) {
        return !l.filtered && partsService.filterAction === 'blend';
      }).classed('filteredLink', function (l) {
        return l.filtered;
      }).classed('hiddenLink', function (l) {
        return !l.highlighted;
      }).attr('id', function (l) {
        return 'hLinkId-' + l.autoId;
      });

      /* Exit. */
      ahl.exit().remove();

      /* Set dom elements. */
      partsService.hLink = d3.selectAll('.hLink');

      /* Data join */
      var al = vis.canvas.select('g.aLinks').selectAll('.link')
        .data(graph.aLinks);

      /* Enter. */
      al.enter()
        .append('path')
        .classed({ link: true, aLink: true })
        .classed('blendedLink', function (l) {
          return !l.filtered && partsService.filterAction === 'blend';
        }).classed('filteredLink', function (l) {
          return l.filtered;
        }).classed('hiddenLink', function (l) {
          return l.hidden;
        }).attr('id', function (l) {
          return 'linkId-' + l.autoId;
        });

      /* Enter and update. */
      al.attr('d', function (l) {
        var srcCoords = coordService.getVisibleNodeCoords(l.source);
        var tarCoords = coordService.getVisibleNodeCoords(l.target);
        var drawType;
        if (linkStyle === 'bezier1') {
          drawType = linkService.drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
            tarCoords.y);
        } else {
          drawType = linkService.drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
            tarCoords.y);
        }
        return drawType;
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
      al.exit().remove();

      /* Set dom elements. */

      partsService.aLink = d3.selectAll('.aLink');
    //  angular.copy(d3.selectAll('.aLink'), partsService.aLink);
      partsService.link = d3.selectAll('.link');
    //  angular.copy(d3.selectAll('.Link'), partsService.link);
    }

    /**
     * Draw analysis nodes.
     */
    function updateAnalysisNodes (vis, cell) {
      var scaleFactor = partsService.scaleFactor;
      /* Data join. */
      var lAnalysis = d3.select('g.analyses').selectAll('.analysis')
        .data(vis.graph.aNodes.sort(function (a, b) {
          return provvisHelpers.parseISOTimeFormat(a.start) -
            provvisHelpers.parseISOTimeFormat(b.start);
        }));

      /* Enter and update. */
      var anUpdate = lAnalysis.attr('id', function (d) {
        return 'gNodeId-' + d.autoId;
      });

      anUpdate.attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      }).style('fill', function (d) {
        return partsService.timeColorScale(provvisHelpers.parseISOTimeFormat(d.start));
      });

      /* Add a clip-path to restrict labels within the cell area. */
      anUpdate.select('defs')
        .select('clipPath')
        .attr('id', function (an) {
          return 'bbClipId-' + an.autoId;
        })
        .select('rect')
        .attr('transform', function () {
          return 'translate(' + (-cell.width / 2) + ',' +
            (-cell.height / 2) + ')';
        })
        .attr('y', -scaleFactor * vis.radius)
        .attr('width', cell.width)
        .attr('height', cell.height)
        .attr('rx', cell.width / 7)
        .attr('ry', cell.height / 7);

      /* Draw bounding box. */
      var analysisBBox = anUpdate.select('g')
        .attr('id', function (an) {
          return 'BBoxId-' + an.autoId;
        }).classed({
          aBBox: true,
          BBox: true,
          hiddenBBox: true
        })
        .attr('transform', function () {
          return 'translate(' + (-cell.width / 2) + ',' +
            (-cell.height / 2) + ')';
        });

      analysisBBox.select('rect')
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
      analysisBBox.select('defs')
        .select('clipPath')
        .attr('id', function (an) {
          return 'aBBClipId-' + an.autoId;
        })
        .select('rect')
        .attr('y', -scaleFactor * vis.radius)
        .attr('width', cell.width)
        .attr('height', cell.height)
        .attr('rx', cell.width / 7)
        .attr('ry', cell.height / 7);

      /* Time as label. */
      analysisBBox.select('g')
        .classed({ labels: true })
        .attr('clip-path', function (an) {
          return 'url(#aBBClipId-' + an.autoId + ')';
        })
        .select('text')
        .attr('transform', function () {
          return 'translate(' + 1 * scaleFactor * vis.radius + ',' +
            0 * scaleFactor * vis.radius + ')';
        })
        .text(function (d) { return '\uf013' + ' ' + d.wfCode; })
        .classed('aBBoxLabel', true)
        .style({ 'font-family': 'FontAwesome' });

      /* Draw analysis node. */
      analysisNode = anUpdate.select('g')
        .attr('id', function (an) {
          return 'nodeId-' + an.autoId;
        })
        .classed({
          aNode: true,
          filteredNode: true,
          blendedNode: false,
          selectedNode: false
        })
        .classed({
          hiddenNode: function (an) {
            return an.hidden;
          }
        });

      anUpdate.select('g').classed({
        children: true
      });

      aGlyph = analysisNode.select('g.glyph');
      aLabels = analysisNode.select('g.labels')
        .attr('clip-path', function (an) {
          return 'url(#bbClipId-' + an.autoId + ')';
        });

      aGlyph.each(function (an) {
        if (an.predLinks.size() > 0) {
          d3.select(this).select('g.glAnchor').select('path')
            .attr('d', function () {
              return 'm' + (-2 * scaleFactor * vis.radius) + ' ' +
                (-0.5 * scaleFactor * vis.radius) + ' ' +
                'h' + (-0.8 * scaleFactor * vis.radius) + ' ' +
                'a' + (-0.5 * scaleFactor * vis.radius) + ' ' +
                (0.5 * scaleFactor * vis.radius) + ' 0 0 0 ' +
                '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                'h' + (+0.8 * scaleFactor * vis.radius) + ' ' + 'z';
            });
        }
      });

      aGlyph.each(function (an) {
        if (an.predLinks.size() > 1) {
          aGlyph.select('g.grAnchor').select('text')
            .attr('transform', function () {
              return 'translate(' + (-2.8 * scaleFactor * vis.radius) + ',' +
                0.5 + ')';
            })
            .text(function (d) {
              return d.predLinks.size();
            }).attr('class', 'aLabel')
            .style('display', 'inline');
        }
      });

      aGlyph.each(function (an) {
        if (an.succLinks.size() > 0) {
          d3.select(this).select('path')
            .attr('d', function () {
              return 'm' + (2 * scaleFactor * vis.radius) + ' ' +
                (-0.5 * scaleFactor * vis.radius) + ' ' +
                'h' + (0.8 * scaleFactor * vis.radius) + ' ' +
                'a' + (0.5 * scaleFactor * vis.radius) + ' ' +
                (0.5 * scaleFactor * vis.radius) + ' 0 0 1 ' +
                '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                'h' + (-0.8 * scaleFactor * vis.radius) + ' ' + 'z';
            });
        }
      });

      aGlyph.each(function (an) {
        if (an.succLinks.size() > 1) {
          d3.select(this).select('text')
            .attr('transform', function () {
              return 'translate(' + (2.8 * scaleFactor * vis.radius) + ',' +
                0.5 + ')';
            })
            .text(function (d) {
              return d.succLinks.size();
            }).attr('class', 'aLabel')
            .style('display', 'inline');
        }
      });

      aGlyph.select('rect')
        .attr('x', -2 * scaleFactor * vis.radius)
        .attr('y', -1.5 * scaleFactor * vis.radius)
        .attr('rx', 1)
        .attr('ry', 1)
        .attr('width', 4 * scaleFactor * vis.radius)
        .attr('height', 3 * scaleFactor * vis.radius);

      /* Add text labels. */
      aLabels.select('text')
        .text(function (d) {
          return d.doi.doiWeightedSum;
        }).attr('class', 'nodeDoiLabel')
        .style('display', 'none');

      /* Enter. */
      var anEnter = lAnalysis.enter().append('g')
        .classed('analysis', true)
        .attr('id', function (d) {
          return 'gNodeId-' + d.autoId;
        });

      anEnter.attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      }).style('fill', function (d) {
        return partsService.timeColorScale(provvisHelpers.parseISOTimeFormat(d.start));
      });

      /* Add a clip-path to restrict labels within the cell area. */
      anEnter.append('defs')
        .append('clipPath')
        .attr('id', function (an) {
          return 'bbClipId-' + an.autoId;
        })
        .append('rect')
        .attr('transform', function () {
          return 'translate(' + (-cell.width / 2) + ',' +
            (-cell.height / 2) + ')';
        })
        .attr('y', -scaleFactor * vis.radius)
        .attr('width', cell.width)
        .attr('height', cell.height + 2 * scaleFactor * vis.radius)
        .attr('rx', cell.width / 7)
        .attr('ry', cell.height / 7);

      /* Draw bounding box. */
      analysisBBox = anEnter.append('g')
        .attr('id', function (an) {
          return 'BBoxId-' + an.autoId;
        }).classed({
          aBBox: true,
          BBox: true,
          hiddenBBox: true
        })
        .attr('transform', function () {
          return 'translate(' + (-cell.width / 2) + ',' +
            (-cell.height / 2) + ')';
        });

      analysisBBox.append('rect')
        .attr('y', -0.6 * scaleFactor * vis.radius)
        .attr('width', function () {
          return cell.width;
        })
        .attr('height', function () {
          return cell.height;
        })
        .attr('rx', cell.width / 7)
        .attr('ry', cell.height / 7);

      var aDiff = analysisBBox.append('g').classed('aDiff', true)
        .attr('transform', function () {
          return 'translate(' + (0) + ',' +
            (0) + ')';
        });

      aDiff.each(function (an) {
        if (an.motifDiff.numIns !== 0 || an.motifDiff.numOuts !== 0 ||
          an.motifDiff.numSubanalyses !== 0) {
          d3.select(this).append('text')
            .text(function () {
              return '\uf069';
            }).classed('diff-node-type-icon', true)
            .style({
              'font-family': 'FontAwesome'
            });
        }
      });

      /* Add a clip-path to restrict labels within the cell area. */
      analysisBBox.append('defs')
        .append('clipPath')
        .attr('id', function (an) {
          return 'aBBClipId-' + an.autoId;
        })
        .append('rect')
        .attr('y', -scaleFactor * vis.radius)
        .attr('width', cell.width)
        .attr('height', cell.height)
        .attr('rx', cell.width / 7)
        .attr('ry', cell.height / 7);

      /* Workflow as label. */
      analysisBBox
        .append('g')
        .classed({ labels: true })
        .attr('clip-path', function (an) {
          return 'url(#aBBClipId-' + an.autoId + ')';
        })
        .append('text')
        .attr('transform', function () {
          return 'translate(' + 1 * scaleFactor * vis.radius + ',' +
            0 * scaleFactor * vis.radius + ')';
        })
        .text(function (d) {
          return '\uf013' + ' ' + d.wfCode;
        })
        .classed('aBBoxLabel', true)
        .style({ 'font-family': 'FontAwesome' });

      /* Draw analysis node. */
      var analysisNode = anEnter.append('g')
        .attr('id', function (an) {
          return 'nodeId-' + an.autoId;
        })
        .classed({
          aNode: true,
          filteredNode: true,
          blendedNode: false,
          selectedNode: false
        })
        .classed({
          hiddenNode: function (an) {
            return an.hidden;
          }
        });

      anEnter.append('g').classed({
        children: true
      });

      var aGlyph = analysisNode.append('g').classed({
        glyph: true
      });
      var aLabels = analysisNode
        .append('g')
        .classed({ labels: true })
        .attr('clip-path', function (an) {
          return 'url(#bbClipId-' + an.autoId + ')';
        });

      aGlyph.each(function (an) {
        if (an.predLinks.size() > 0) {
          d3.select(this)
            .append('g')
            .classed({ glAnchor: true })
            .append('path')
            .attr('d', function () {
              return 'm' + (-2 * scaleFactor * vis.radius) + ' ' +
                (-0.5 * scaleFactor * vis.radius) + ' ' +
                'h' + (-0.8 * scaleFactor * vis.radius) + ' ' +
                'a' + (-0.5 * scaleFactor * vis.radius) + ' ' +
                (0.5 * scaleFactor * vis.radius) + ' 0 0 0 ' +
                '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                'h' + (+0.8 * scaleFactor * vis.radius) + ' ' + 'z';
            })
            .classed({ laAnchor: true });
        }
      });

      aGlyph.each(function (an) {
        if (an.predLinks.size() > 1) {
          d3.select(this)
            .select('g.glAnchor').append('text')
            .attr('transform', function () {
              return 'translate(' + (-2.8 * scaleFactor * vis.radius) + ',' +
                0.5 + ')';
            })
            .text(function (d) {
              return d.predLinks.size();
            }).attr('class', 'aLabel')
            .style('display', 'inline');
        }
      });

      aGlyph.each(function (an) {
        if (an.succLinks.size() > 0) {
          d3.select(this)
            .append('g')
            .classed({ grAnchor: true })
            .append('path')
            .attr('d', function () {
              return 'm' + (2 * scaleFactor * vis.radius) + ' ' +
                (-0.5 * scaleFactor * vis.radius) + ' ' +
                'h' + (0.8 * scaleFactor * vis.radius) + ' ' +
                'a' + (0.5 * scaleFactor * vis.radius) + ' ' +
                (0.5 * scaleFactor * vis.radius) + ' 0 0 1 ' +
                '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                'h' + (-0.8 * scaleFactor * vis.radius) + ' ' + 'z';
            }).classed({ raAnchor: true });
        }
      });

      aGlyph.each(function (an) {
        if (an.succLinks.size() > 1) {
          d3.select(this).select('g.grAnchor').append('text')
            .attr('transform', function () {
              return 'translate(' + (2.8 * scaleFactor * vis.radius) + ',' +
                0.5 + ')';
            })
            .text(function (d) {
              return d.succLinks.size();
            }).attr('class', 'aLabel')
            .style('display', 'inline');
        }
      });

      aGlyph.append('rect')
        .attr('x', -2.25 * scaleFactor * vis.radius)
        .attr('y', -1.0 * scaleFactor * vis.radius)
        .attr('rx', 1)
        .attr('ry', 1)
        .attr('width', 4.5 * scaleFactor * vis.radius)
        .attr('height', 2 * scaleFactor * vis.radius)
        .classed({
          aGlyph: true
        });

      /* Add text labels. */
      aLabels.append('text')
        .text(function (d) {
          return d.doi.doiWeightedSum;
        }).attr('class', 'nodeDoiLabel')
        .style('display', 'none');

      aLabels.append('text')
        .attr('transform', function () {
          return 'translate(' + (-1.1 * scaleFactor * vis.radius) + ',0)';
        })
        .text(function () { return '\uf085'; })
        .classed('an-node-type-icon', true)
        .style({
          fill: function (an) {
            return partsService.timeColorScale(provvisHelpers
              .parseISOTimeFormat(an.start)) < '#888888' ? '#ffffff' : '#000000';
          }
        });

      aLabels.append('text')
        .attr('transform', function () {
          return 'translate(' + (1.0 * scaleFactor * vis.radius) + ',0.25)';
        })
        .text(function (d) {
          return d.children.size();
        }).attr('class', 'anLabel glyphNumeral')
        .style({
          fill: function (an) {
            return partsService.timeColorScale(provvisHelpers
              .parseISOTimeFormat(an.start)) < '#888888' ? '#ffffff' : '#000000';
          }
        });

      /* Exit. */
      lAnalysis.exit().remove();

      /* Set dom elements. */
//      analysis = vis.canvas.select('g.analyses').selectAll('.analysis');
  //    aNode = d3.selectAll('.aNode');
  //    aBBox = d3.selectAll('.aBBox');
      partsService.analysis = vis.canvas.select('g.analyses').selectAll('.analysis');
      partsService.aNode = d3.selectAll('.aNode');
      partsService.aBBox = d3.selectAll('.aBBox');
    }
  }
})();
