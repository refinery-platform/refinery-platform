/**
 * Provvis Draw Links Service
 * @namespace provvisDrawLinksService
 * @desc Service for drawing links
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDrawLinksService', provvisDrawLinksService);

  provvisDrawLinksService.$inject = [
    'd3',
    'provvisBoxCoordsService',
    'provvisDeclService',
    'provvisHelpersService',
    'provvisPartsService'
  ];

  function provvisDrawLinksService (
    d3,
    provvisBoxCoordsService,
    provvisDeclService,
    provvisHelpersService,
    provvisPartsService
  ) {
    var coordsService = provvisBoxCoordsService;
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;
    var provvisHelpers = provvisHelpersService;

    var service = {
      drawBezierLink: drawBezierLink,
      drawBezierLink1: drawBezierLink1,
      drawBezierLink2: drawBezierLink2,
      drawBezierLink3: drawBezierLink3,
      drawNodes: drawNodes,
      drawStraightLink: drawStraightLink,
      drawSubanalysisLinks: drawSubanalysisLinks,
      drawSubanalysisNodes: drawSubanalysisNodes
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
      /* TODO: May use functions as parameters. */
      /**
       * Path generator for bezier link.
       * @param l Link.
       * @param srcX Source x coordinate.
       * @param srcY Source y coordinate.
       * @param tarX Target x coordinate.
       * @param tarY Target y coordinate.
       * @returns {*} Path for link.
       */
    function drawBezierLink (l, srcX, srcY, tarX, tarY) {
      return drawBezierLink1(l, srcX, srcY, tarX, tarY);
      // return drawBezierLink2(l, srcX, srcY, tarX, tarY);
      // return drawBezierLink3(l, srcX, srcY, tarX, tarY);
    }

      /**
   * Path generator for bezier link.
   * @param l Link.
   * @param srcX Source x coordinate.
   * @param srcY Source y coordinate.
   * @param tarX Target x coordinate.
   * @param tarY Target y coordinate.
   * @returns {*} Path for link.
   */
    function drawBezierLink1 (l, srcX, srcY, tarX, tarY) {
      var cell = partsService.cell;
      var vis = partsService.vis;
      var pathSegment = 'M' + (srcX) + ',' + srcY;

      if (tarX - srcX > vis.cell.width * 1.5) {
        /* Extend links in expanded columns. */
        var curN = l.source;
        var hLineSrc = srcX;

        if (l.source instanceof provvisDecl.Layer ||
          l.target instanceof provvisDecl.Layer ||
          l.source.parent !== l.target.parent) {
          while (!(curN instanceof provvisDecl.Analysis) &&
            !(curN instanceof provvisDecl.Layer)) {
            curN = curN.parent;
          }

          if (curN instanceof provvisDecl.Analysis && !curN.parent.hidden &&
            l.source.hidden) {
            curN = curN.parent;
          }

          /* TODO: Revise. */
          if (l.source instanceof provvisDecl.Layer && l.source.hidden) {
            hLineSrc = srcX + vis.cell.width / 2;
          } else {
            hLineSrc = coordsService.getABBoxCoords(curN, 0).x.max - vis.cell.width / 2;
          }

          /* LayoutCols provides the maximum width of any potential expanded node
           * within the column of the graph. An the width difference is calculated
           * as offset and added as horizontal line to the link. */
          partsService.layoutCols.values().forEach(function (c) {
            if (c.nodes.indexOf(curN.autoId) !== -1) {
              var curWidth = coordsService.getABBoxCoords(curN, 0).x.max -
              coordsService.getABBoxCoords(curN, 0).x.min;
              var offset = (c.width - curWidth) / 2 + vis.cell.width / 2;
              if (curWidth < c.width) {
                hLineSrc = srcX + offset;
              }
            }
          });

          pathSegment = pathSegment.concat(' H' + (hLineSrc));
        }

        pathSegment = pathSegment.concat(
          ' C' + (hLineSrc + cell.width / 3) + ',' + (srcY) + ' ' +
          (hLineSrc + cell.width / 2 - cell.width / 3) + ',' + (tarY) +
          ' ' + (hLineSrc + cell.width / 2) + ',' + (tarY) + ' ' +
          'H' + (tarX));
      } else {
        pathSegment = pathSegment.concat(
          ' C' + (srcX + cell.width) + ',' + (srcY) + ' ' +
          (tarX - cell.width) + ',' + (tarY) + ' ' +
          (tarX) + ',' + (tarY) + ' ');
      }

      return pathSegment;
    }

      /**
       * Path generator for bezier link.
       * @param l Link.
       * @param srcX Source x coordinate.
       * @param srcY Source y coordinate.
       * @param tarX Target x coordinate.
       * @param tarY Target y coordinate.
       * @returns {*} Path for link.
       */
    function drawBezierLink2 (l, srcX, srcY, tarX, tarY) {
      var cell = partsService.cell;
      var scaleFactor = partsService.scaleFactor;
      var vis = partsService.vis;
      var pathSegment = 'M' + srcX + ',' + srcY;

      if (tarX - srcX > 5 * scaleFactor * vis.radius) {
        pathSegment = pathSegment.concat(' H' + (tarX - cell.width) +
          ' Q' + ((tarX - cell.width) + cell.width / 3) + ',' + (srcY) + ' ' +
          ((tarX - cell.width) + cell.width / 2) + ',' +
          (srcY + (tarY - srcY) / 2) + ' ' +
          'T' + (tarX) + ',' + tarY);
      } else {
        pathSegment = pathSegment.concat(' C' + (srcX + cell.width) + ',' +
          (srcY) + ' ' +
          (tarX - cell.width) + ',' + (tarY) + ' ' +
          (tarX) + ',' + (tarY) + ' ');
      }

      return pathSegment;
    }

      /**
       * Path generator for bezier link.
       * @param l Link.
       * @param srcX Source x coordinate.
       * @param srcY Source y coordinate.
       * @param tarX Target x coordinate.
       * @param tarY Target y coordinate.
       * @returns {*} Path for link.
       */
    function drawBezierLink3 (l, srcX, srcY, tarX, tarY) {
      var cell = partsService.cell;
      var pathSegment = 'M' + srcX + ',' + srcY;

      pathSegment = pathSegment.concat(' C' + (srcX + cell.width) + ',' +
        (srcY) + ' ' +
        (tarX - cell.width) + ',' + (tarY) + ' ' +
        (tarX) + ',' + (tarY) + ' ');

      return pathSegment;
    }

     /**
     * Draw nodes.
     * @param nodes All nodes within the graph.
     */
    function drawNodes () {
      var cell = partsService.cell;
      var node = partsService.node;
      var scaleFactor = partsService.scaleFactor;
      var subanalysis = partsService.subanalysis;
      var vis = partsService.vis;

      subanalysis.each(function (san) { // eslint-disable-line no-shadow
        node = d3.select(this).select('.children').selectAll('.node')
          .data(function () {
            return san.children.values();
          })
          .enter().append('g')
          .classed('node', true)
          .attr('id', function (d) {
            return 'gNodeId-' + d.autoId;
          })
          .attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

        node.each(function (d) { // eslint-disable-line no-shadow
          var self = d3.select(this);
          self.attr('class', function (d) { // eslint-disable-line no-shadow
            return 'node ' + d.nodeType + 'Node';
          }).attr('id', function (d) { // eslint-disable-line no-shadow
            return 'nodeId-' + d.autoId;
          }).classed('blendedNode', function (l) {
            return !l.filtered && partsService.filterAction === 'blend';
          }).classed('filteredNode', function (l) {
            return l.filtered;
          }).classed('hiddenNode', function (l) {
            return l.hidden;
          });

          /* Add a clip-path to restrict labels within the cell area. */
          self.append('defs')
            .append('clipPath')
            .attr('id', 'bbClipId-' + d.autoId)
            .append('rect')
            .attr('transform', function () {
              return 'translate(' + (-1.5 * scaleFactor * vis.radius) + ',' +
              (-cell.height * 3 / 4) + ')';
            })
            .attr('width', cell.width - 2 * scaleFactor * vis.radius)
            .attr('height', cell.height + 1 * scaleFactor * vis.radius);

          var nGlyph = self.append('g').classed({
            glyph: true
          });
          var nLabels = self.append('g').classed({
            labels: true
          })
            .attr('clip-path', 'url(#bbClipId-' + d.autoId + ')');

          nGlyph.each(function (n) {
            if (n.predLinks.size() > 0) {
              d3.select(this).append('g')
                .classed({
                  glAnchor: true
                }).append('path')
                .attr('d', function () {
                  return 'm' + 0 + ' ' + (-0.5 * scaleFactor * vis.radius) +
                  ' ' +
                  'h' + (-1 * scaleFactor * vis.radius) + ' ' +
                  'a' + (-0.5 * scaleFactor * vis.radius) + ' ' +
                  (0.5 * scaleFactor * vis.radius) + ' 0 0 0 ' +
                  '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                  'h' + (+1 * scaleFactor * vis.radius) + ' ' + 'z';
                }).classed({
                  lnAnchor: true
                });
            }
          });

          nGlyph.each(function (n) {
            if (n.succLinks.size() > 0) {
              nGlyph.append('g').classed({
                grAnchor: true
              }).append('path')
                .attr('d', function () {
                  return 'm' + 0 + ' ' + (-0.5 * scaleFactor * vis.radius) +
                  ' ' +
                  'h' + (1 * scaleFactor * vis.radius) + ' ' +
                  'a' + (0.5 * scaleFactor * vis.radius) + ' ' +
                  (0.5 * scaleFactor * vis.radius) + ' 0 0 1 ' +
                  '0 ' + (1 * scaleFactor * vis.radius) + ' ' +
                  'h' + (-1 * scaleFactor * vis.radius) + ' ' + 'z';
                }).classed({
                  rnAnchor: true
                });
            }
          });

          if (d.nodeType === 'raw' || d.nodeType === 'intermediate' ||
            d.nodeType === 'stored') {
            nGlyph
              .append('circle')
              .attr('r', function (d) { // eslint-disable-line no-shadow
                return d.nodeType === 'intermediate' ? 3 * scaleFactor *
                vis.radius / 4 : 5 * scaleFactor * vis.radius / 6;
              });
          } else {
            if (d.nodeType === 'special') {
              nGlyph
                .append('rect')
                .attr('transform', 'translate(' +
                  (-3 * scaleFactor * vis.radius / 4) + ',' +
                  (-3 * scaleFactor * vis.radius / 4) + ')')
                .attr('width', 1.5 * scaleFactor * vis.radius)
                .attr('height', 1.5 * scaleFactor * vis.radius);
            } else if (d.nodeType === 'dt') {
              nGlyph
                .append('rect')
                .attr('transform', function () {
                  return 'translate(' +
                  (-1.25 * scaleFactor * vis.radius / 2) + ',' +
                  (-1.25 * scaleFactor * vis.radius / 2) + ')' +
                  'rotate(45 ' +
                  (1.25 * scaleFactor * vis.radius / 2) + ',' +
                  (1.25 * scaleFactor * vis.radius / 2) + ')';
                })
                .attr('width', 1.25 * scaleFactor * vis.radius)
                .attr('height', 1.25 * scaleFactor * vis.radius);
            }
          }

          nLabels.append('text')
            .text(function (d) { // eslint-disable-line no-shadow
              return d.doi.doiWeightedSum;
            }).attr('class', 'nodeDoiLabel')
            .style('display', 'none');

          nLabels.each(function () {
            d3.select(this).append('text')
              .attr('transform', function () {
                return 'translate(' + (-1.5 * scaleFactor * vis.radius) + ',' +
                (-1.5 * scaleFactor * vis.radius) + ')';
              })
              .text(function (d) { // eslint-disable-line no-shadow
                var nodeAttrLabel = '';

                if (d.nodeType === 'stored') {
                  nodeAttrLabel = d.attributes.get('name');
                } else {
                  /* Trim data transformation node names for
                   testtoolshed repo.*/
                  if (d.nodeType === 'dt') {
                    if (d.name.indexOf(': ') > 0) {
                      var firstPart = d.name.substr(
                        d.name.indexOf(': ') + 2,
                        d.name.length - d.name.indexOf(': ') - 2
                      );
                      d.label = firstPart;
                      var secondPart = d.name.substr(0, d.name.indexOf(': '));
                      d.name = firstPart + ' (' + secondPart + ')';
                      nodeAttrLabel = d.label;
                    }
                  } else {
                    nodeAttrLabel = d.name;
                  }
                }
                return nodeAttrLabel;
              }).attr('class', 'nodeAttrLabel');
          });

          nLabels.each(function (d) { // eslint-disable-line no-shadow
            if (d.nodeType === 'stored') {
              d3.select(this).append('text')
                .text(function () {
                  return '\uf0f6';
                })
                .classed('stored-node-type-icon', true)
                .style({
                  fill: function (n) {
                    return partsService.timeColorScale(provvisHelpers.parseISOTimeFormat(
                      n.parent.parent.start)) < '#888888' ?
                      '#ffffff' : '#000000';
                  }
                });
            }
          });
        });
      });
      /* Set node dom element. */
      node = d3.selectAll('.node');

      return node;
    }

    /**
       * Path generator for straight link.
       * @param l Link.
       * @param srcX Source x coordinate.
       * @param srcY Source y coordinate.
       * @param tarX Target x coordinate.
       * @param tarY Target y coordinate.
       * @returns {*} Path for link.
       */
    function drawStraightLink (l, srcX, srcY, tarX, tarY) {
      var pathSegment = ' M' + srcX + ',' + srcY;
      pathSegment = pathSegment.concat(' L' + tarX + ',' + tarY);
      return pathSegment;
    }

        /**
       * Draws the subanalalysis containing links.
       * @param san Subanalysis node.
       */
    function drawSubanalysisLinks (san) { // eslint-disable-line no-shadow
      /* Draw highlighting links. */
      /* Data join. */
      var linkStyle = partsService.linkStyle;
      var sahl = d3.select('#gNodeId-' + san.autoId)
        .select('g.saHLinks').selectAll('.hLink')
        .data(san.links.values());

      /* Enter and update. */
      sahl.attr('d',
        function (l) {
          if (linkStyle === 'bezier1') {
            return drawBezierLink(l, l.source.x, l.source.y, l.target.x,
              l.target.y);
          } else { // eslint-disable-line no-else-return
            return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
              l.target.y);
          }
        }).classed({
          hLink: true,
          hiddenLink: true
        }).attr('id', function (l) {
          return 'hLinkId-' + l.autoId;
        });

      /* Enter. */
      sahl.enter().append('path')
        .attr('d', function (l) {
          if (linkStyle === 'bezier1') {
            return drawBezierLink(l, l.source.x, l.source.y, l.target.x,
              l.target.y);
          } else { // eslint-disable-line no-else-return
            return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
              l.target.y);
          }
        })
        .classed({
          hLink: true,
          hiddenLink: true
        })
        .attr('id', function (l) {
          return 'hLinkId-' + l.autoId;
        });

        /* Exit. */
      sahl.exit().remove();

      /* Draw normal links. */
      /* Data join. */
      var sal = d3.select('#gNodeId-' + san.autoId).select('g.saLinks')
        .selectAll('.Link')
        .data(san.links.values());

        /* Enter and update. */
      sal.attr('d', function (l) {
        if (linkStyle === 'bezier1') {
          return drawBezierLink(l, l.source.x, l.source.y, l.target.x,
            l.target.y);
        } else { // eslint-disable-line no-else-return
          return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
            l.target.y);
        }
      }).classed({
        link: true,
        saLink: true,
        hiddenLink: true
      })
        .attr('id', function (l) {
          return 'linkId-' + l.autoId;
        });

      /* Enter. */
      sal.enter().append('path')
        .attr('d', function (l) {
          if (linkStyle === 'bezier1') {
            return drawBezierLink(l, l.source.x, l.source.y, l.target.x,
              l.target.y);
          } else { // eslint-disable-line no-else-return
            return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
              l.target.y);
          }
        }).classed({
          link: true,
          saLink: true,
          hiddenLink: true
        })
        .attr('id', function (l) {
          return 'linkId-' + l.autoId;
        });

        /* Exit. */
      sal.exit().remove();
    }

      /**
       * Draw subanalysis nodes.
       * @param saNodes Subanalysis nodes.
       */
    function drawSubanalysisNodes () {
      var analysis = partsService.analysis;
      var vis = partsService.vis;
      var cell = partsService.cell;
      var scaleFactor = partsService.scaleFactor;
      var subanalysis = partsService.subanalysis;

      analysis.each(function (an) {
        /* Data join. */
        subanalysis = d3.select(this).select('.children')
          .selectAll('.subanalysis')
          .data(function () {
            return an.children.values();
          });

        var saEnter = subanalysis.enter().append('g')
          .classed('subanalysis', true)
          .attr('id', function (d) {
            return 'gNodeId-' + d.autoId;
          })
          .attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

        saEnter.each(function (san) { // eslint-disable-line no-shadow
          var self = d3.select(this);
          /* Draw links for each subanalysis. */

          d3.select('#gNodeId-' + san.autoId).append('g')
            .classed({
              saHLinks: true
            });
          d3.select('#gNodeId-' + san.autoId).append('g')
            .classed({
              saLinks: true
            });
          drawSubanalysisLinks(san);

          /* Compute bounding box for subanalysis child nodes. */
          var saBBoxCoords = coordsService.getWFBBoxCoords(san, 0);

          /* Add a clip-path to restrict labels within the cell area. */
          self.append('defs')
            .append('clipPath')
            .attr('id', 'bbClipId-' + san.autoId)
            .append('rect')
            .attr('transform', function () {
              return 'translate(' + (-cell.width / 2) + ',' +
              (-cell.height / 2) + ')';
            })
            .attr('width', cell.width)
            .attr('height', cell.height);

          /* Draw bounding box. */
          var subanalysisBBox = self.append('g')
            .attr('id', function () {
              return 'BBoxId-' + san.autoId;
            }).classed({
              saBBox: true,
              BBox: true,
              hiddenBBox: true
            })
            .attr('transform', function () {
              return 'translate(' + (-cell.width / 2) + ',' +
              (-cell.height / 2) + ')';
            });

          /* Add a clip-path to restrict labels within the cell area. */
          subanalysisBBox.append('defs')
            .attr('x', scaleFactor * vis.radius)
            .attr('y', -0.5 * scaleFactor * vis.radius)
            .append('clipPath')
            .attr('id', 'saBBClipId-' + san.autoId)
            .append('rect')
            .attr('width', saBBoxCoords.x.max - saBBoxCoords.x.min -
              scaleFactor * vis.radius)
            .attr('height', cell.height);

          subanalysisBBox.append('rect')
            .attr('x', scaleFactor * vis.radius)
            .attr('y', scaleFactor * vis.radius)
            .attr('width', function () {
              return saBBoxCoords.x.max - saBBoxCoords.x.min -
              2 * scaleFactor * vis.radius;
            })
            .attr('height', function () {
              return saBBoxCoords.y.max - saBBoxCoords.y.min -
              2 * scaleFactor * vis.radius;
            })
            .attr('rx', cell.width / 7)
            .attr('ry', cell.height / 7);

          /* Draw subanalysis node. */
          var subanalysisNode = self.append('g')
            .attr('id', function () {
              return 'nodeId-' + san.autoId;
            }).classed({
              saNode: true,
              filteredNode: true,
              blendedNode: false,
              selectedNode: false
            })
            .classed({
              hiddenNode: function (san) { // eslint-disable-line no-shadow
                return san.hidden;
              }
            });

          self.append('g').classed({
            children: true
          });

          var saGlyph = subanalysisNode.append('g').classed({
            glyph: true
          });
          var saLabels = subanalysisNode.append('g').classed({
            labels: true
          })
            .attr('clip-path', 'url(#bbClipId-' + san.autoId + ')');

          saGlyph.each(function (san) { // eslint-disable-line no-shadow
            if (san.predLinks.size() > 0) {
              d3.select(this).append('g')
                .classed({
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
                  lsaAnchor: true
                });
            }
          });

          saGlyph.each(function (san) { // eslint-disable-line no-shadow
            if (san.predLinks.size() > 1) {
              d3.select(this).select('g.glAnchor').append('text')
                .attr('transform', function () {
                  return 'translate(' + (-2.8 * scaleFactor * vis.radius) +
                  ',' +
                  0.5 + ')';
                })
                .text(function (d) {
                  return d.predLinks.size();
                }).attr('class', 'saLabel')
                .style('display', 'inline');
            }
          });

          saGlyph.each(function (san) { // eslint-disable-line no-shadow
            if (san.succLinks.size() > 0) {
              saGlyph.append('g').classed({
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
                  rsaAnchor: true
                });
            }
          });

          saGlyph.each(function (san) { // eslint-disable-line no-shadow
            if (san.succLinks.size() > 1) {
              d3.select(this).select('g.grAnchor').append('text')
                .attr('transform', function () {
                  return 'translate(' + (2.8 * scaleFactor * vis.radius) +
                  ',' +
                  0.5 + ')';
                })
                .text(function (d) {
                  return d.succLinks.size();
                }).attr('class', 'saLabel')
                .style('display', 'inline');
            }
          });

          saGlyph.append('rect')
            .attr('x', -2.25 * scaleFactor * vis.radius)
            .attr('y', -1 * scaleFactor * vis.radius)
            .attr('rx', 1)
            .attr('ry', 1)
            .attr('width', 4.5 * scaleFactor * vis.radius)
            .attr('height', 2 * scaleFactor * vis.radius);

          /* Add text labels. */
          saLabels.append('text')
            .text(function (d) {
              return d.doi.doiWeightedSum;
            }).attr('class', 'nodeDoiLabel')
            .style('display', 'none');


          saLabels.append('text')
            .attr('transform', function () {
              return 'translate(' + (-1.1 * scaleFactor * vis.radius) + ',0)';
            }).text(function () {
              return '\uf013';
            }).classed('san-node-type-icon', true)
            .style({
              fill: function (san) { // eslint-disable-line no-shadow
                return partsService.timeColorScale(provvisHelpers
                  .parseISOTimeFormat(san.parent.start)) < '#888888' ? '#ffffff' : '#000000';
              }
            });

          saLabels.append('text')
            .attr('transform', function () {
              return 'translate(' + (1.0 * scaleFactor * vis.radius) + ',0.25)';
            }).text(function (d) {
              return d.wfUuid !== 'dataset' ?
              d.children.values().filter(function (cn) {
                return cn.nodeType === 'dt';
              }).length : d.children.size();
            }).attr('class', 'sanLabel glyphNumeral')
            .style({
              fill: function (san) { // eslint-disable-line no-shadow
                return partsService.timeColorScale(provvisHelpers
                  .parseISOTimeFormat(san.parent.start)) < '#888888' ? '#ffffff' : '#000000';
              }
            });
        });
      });

      /* Set dom elements. */
      partsService.saNode = d3.selectAll('.saNode');
      partsService.subanalysis = d3.selectAll('.subanalysis');
      partsService.saBBox = d3.selectAll('.saBBox');

      partsService.saLink = d3.selectAll('.saLink');
      partsService.link = d3.selectAll('.link');
      partsService.hLink = d3.selectAll('.hLink');
    }
  }
})();
