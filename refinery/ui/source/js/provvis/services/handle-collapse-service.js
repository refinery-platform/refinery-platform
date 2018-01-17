/**
 * provvis Handle Collapse Service
 * @namespace provvisHandleCollapseService
 * @desc Service for handling the collapse and updating node doi
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisHandleCollapseService', provvisHandleCollapseService);

  provvisHandleCollapseService.$inject = [
    'provvisBoxCoordsService',
    'provvisDagreLayoutService',
    'provvisDeclService',
    'provvisDrawLinksService',
    'provvisHelpersService',
    'provvisPartsService',
    'provvisUpdateNodeLinksService'
  ];

  function provvisHandleCollapseService (
    provvisBoxCoordsService,
    provvisDagreLayoutService,
    provvisDeclService,
    provvisDrawLinksService,
    provvisHelpersService,
    provvisPartsService,
    provvisUpdateNodeLinksService
  ) {
    var coordsService = provvisBoxCoordsService;
    var dagreService = provvisDagreLayoutService;
    var linksService = provvisDrawLinksService;
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;
    var provvisHelpers = provvisHelpersService;
    var updateNodeLink = provvisUpdateNodeLinksService;


    var service = {
      handleCollapseExpandNode: handleCollapseExpandNode,
      updateNodeDoi: updateNodeDoi
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
      /* TODO: Add transitions to bounding boxes. */
  /**
   * Sets the visibility of links and (a)nodes when collapsing or expanding
   * analyses.
   * @param d Node.
   * @param keyStroke Keystroke being pressed at mouse click.
   * @param trigger Function triggered by user interaction or automatic
   * doi-function.
   */
    function handleCollapseExpandNode (d, keyStroke, inTrigger) {
      var cell = partsService.cell;
      var scaleFactor = partsService.scaleFactor;
      var vis = partsService.vis;

      var trigger = inTrigger;

      if (typeof trigger === 'undefined') {
        trigger = 'user';
      }

      var anBBoxCoords = Object.create(null);
      var wfBBoxCoords = Object.create(null);
      var siblings = [];

      /* Expand. */
      if (keyStroke === 'e' && (d.nodeType === 'layer' ||
        d.nodeType === 'analysis' || d.nodeType === 'subanalysis')) {
        /* Set node visibility. */
        d3.select('#nodeId-' + d.autoId).classed('hiddenNode', true);
        d.hidden = true;
        d.children.values().forEach(function (cn) {
          d3.select('#nodeId-' + cn.autoId).classed('hiddenNode', false);
          cn.hidden = false;
          provvisHelpers.hideChildNodes(cn);
        });

        /* Set link visibility. */
        if (d.nodeType === 'subanalysis') {
          d.links.values().forEach(function (l) {
            l.hidden = false;
            d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
            if (l.highlighted) {
              d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
            }
          });
        } else if (d.nodeType === 'analysis') {
          d.children.values().forEach(function (san) {
            san.links.values().forEach(function (l) {
              l.hidden = true;
              d3.select('#linkId-' + l.autoId).classed('hiddenLink', true);
              if (l.highlighted) {
                d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', true);
              }
            });
          });
        } else {
          /* Hide layer links. */
          d.predLinks.values().forEach(function (pl) {
            pl.hidden = true;
            d3.select('#linkId-' + pl.autoId).classed('hiddenLink', true);
            if (pl.highlighted) {
              d3.select('#hLinkId-' + pl.autoId).classed('hiddenLink', true);
            }
          });
          d.succLinks.values().forEach(function (sl) {
            sl.hidden = true;
            d3.select('#linkId-' + sl.autoId).classed('hiddenLink', true);
            if (sl.highlighted) {
              d3.select('#hLinkId-' + sl.autoId).classed('hiddenLink', true);
            }
          });
        }

        /* Set analysis/layer connecting links visibility. */
        d.inputs.values().forEach(function (sain) {
          sain.predLinks.values().forEach(function (l) {
            d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
            if (l.highlighted) {
              d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
            }
            l.hidden = false;
          });
        });
        d.outputs.values().forEach(function (saon) {
          saon.succLinks.values().forEach(function (l) {
            d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
            if (l.highlighted) {
              d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
            }
            l.hidden = false;
          });
        });


        if (d.nodeType === 'subanalysis') {
          /* Set saBBox visibility. */
          d3.select('#BBoxId-' + d.autoId).classed('hiddenBBox', false);

          /* Update. */
          wfBBoxCoords = coordsService.getWFBBoxCoords(d, 0);
          d.x = 0;
          updateNodeLink.updateLink(d.parent);
          updateNodeLink.updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);

          /* Shift sibling subanalyses vertical. */
          siblings = d.parent.children.values().filter(function (san) {
            return san !== d && san.y > d.y;
          });
          siblings.forEach(function (san) {
            san.y += wfBBoxCoords.y.max - wfBBoxCoords.y.min - cell.height;
            updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
          });

          /* Adjust analysis bounding box. */
          anBBoxCoords = coordsService.getABBoxCoords(d.parent, 0);
          d3.selectAll('#BBoxId-' + d.parent.autoId + ', #aBBClipId-' +
            d.parent.autoId).selectAll('rect')
            .attr('width', function () {
              return anBBoxCoords.x.max - anBBoxCoords.x.min;
            })
            .attr('height', function () {
              return anBBoxCoords.y.max - anBBoxCoords.y.min;
            });

          /* Center non-expanded subanalyses horizontally. */
          d.parent.children.values().filter(function (san) {
            return !san.hidden;
          }).forEach(function (san) {
            san.x = (anBBoxCoords.x.max - anBBoxCoords.x.min) / 2 -
              vis.cell.width / 2;
            updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
          });
          updateNodeLink.updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);
        } else if (d.nodeType === 'analysis') {
          /* Adjust analysis bounding box. */
          anBBoxCoords = coordsService.getABBoxCoords(d, 0);
          d3.select('#BBoxId-' + d.autoId).select('rect')
            .attr('width', function () {
              return anBBoxCoords.x.max - anBBoxCoords.x.min;
            })
            .attr('height', function () {
              return anBBoxCoords.y.max - anBBoxCoords.y.min;
            });

          /* Update. */
          updateNodeLink.updateLink(d);
          updateNodeLink.updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);
        } else {
          d.children.values().filter(function (an) {
            return an.filtered;
          }).forEach(function (an) {
            d3.select('#BBoxId-' + an.autoId).classed({
              hiddenBBox: false
            });

            /* Hide workflow links. */
            an.links.values().forEach(function (l) {
              d3.selectAll('#linkId-' + l.autoId + ',#hLinkId-' + l.autoId)
                .classed('hiddenLink', true);
            });

            /* Hide workflow bounding box. */
            an.children.values().forEach(function (san) {
              d3.select('#BBoxId-' + san.autoId).classed('hiddenBBox', true);
            });

            /* Adjust bounding box. */
            anBBoxCoords = coordsService.getABBoxCoords(an, 0);
            d3.selectAll('#BBoxId-' + an.autoId + ', #aBBClipId-' + an.autoId)
              .select('rect')
              .attr('width', function () {
                return cell.width;
              })
              .attr('height', function () {
                return cell.height;
              });
          });

          /* Update. */
          updateNodeLink.updateLink(d);
          updateNodeLink.updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);
        }
      } else if (keyStroke === 'c' && d.nodeType !== 'layer') {
        /* Collapse. */
        /* Collapse subanalyses. */
        if (d.nodeType === 'subanalysis') {
          d.parent.children.values().forEach(function (san) {
            d3.select('#BBoxId-' + san.autoId).classed({
              hiddenBBox: true
            });
          });
        } else if (d.nodeType === 'analysis') {
          d.parent.children.values().forEach(function (an) {
            d3.select('#BBoxId-' + an.autoId).classed({
              hiddenBBox: true
            });
            an.exaggerated = false;
          });

          /* Set layer label and bounding box. */
          d3.select('#nodeId-' + d.parent.autoId).select('g.labels')
            .select('.lLabel')
            .text(function () {
              return d.children.size() + '/' + d.children.size();
            });

          /* Hide bounding boxes. */
          d3.select('#BBoxId-' + d.parent.autoId).classed({
            hiddenBBox: false
          });
          d.parent.children.values().forEach(function (an) {
            an.children.values().forEach(function (san) {
              d3.select('#BBoxId-' + san.autoId).classed('hiddenBBox', true);
            });
          });
        } else {
          /* Collapse workflow. */
          if (d.hidden === false) {
            /* Shift sibling subanalyses vertical. */
            wfBBoxCoords = coordsService.getWFBBoxCoords(d.parent, 0);
            siblings = d.parent.parent.children.values().filter(function (san) {
              return san !== d.parent && san.y > d.parent.y;
            });
            siblings.forEach(function (san) {
              san.y -= wfBBoxCoords.y.max - wfBBoxCoords.y.min - cell.height;
              updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
            });

            if (d.parent.parent.children.values().filter(function (san) {
              return san !== d.parent;
            }).some(function (san) {
              return san.hidden;
            })) {
              anBBoxCoords = coordsService.getABBoxCoords(d.parent.parent, 0);
              d.parent.x = (anBBoxCoords.x.max - anBBoxCoords.x.min) / 2 -
                vis.cell.width / 2;
              updateNodeLink.updateNode(d3.select('#gNodeId-' + d.parent.autoId),
                d.parent, d.parent.x, d.parent.y);
            }

            if (d.parent.parent.children.values().filter(function (san) {
              return san !== d.parent;
            }).every(function (san) {
              return !san.hidden;
            })) {
              d.parent.parent.children.values().forEach(function (san) {
                san.x = 0;
                updateNodeLink.updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x,
                  san.y);
              });
            }
          }
        }

        /* Set node visibility. */
        d.parent.hidden = false;
        d3.select('#nodeId-' + d.parent.autoId).classed('hiddenNode', false);
        provvisHelpers.hideChildNodes(d.parent);

        /* Set saBBox visibility. */
        if (d.nodeType === 'subanalysis') {
          d3.select('#BBoxId-' + d.autoId).classed('hiddenBBox', true);
        } else if (d.nodeType === 'analysis') {
          if (!d.parent.filtered) {
            d3.select('#BBoxId-' + d.parent.autoId).classed('hiddenBBox', true);
          }
        } else {
          d3.select('#BBoxId-' + d.parent.autoId).classed('hiddenBBox', true);
        }

        /* Set link visibility. */
        d.parent.links.values().forEach(function (l) {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed('hiddenLink', true);
          l.hidden = true;
        });
        d.parent.inputs.values().forEach(function (sain) {
          sain.predLinks.values().forEach(function (l) {
            d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
            if (l.highlighted) {
              d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
            }
            l.hidden = false;
          });
        });
        d.parent.outputs.values().forEach(function (saon) {
          saon.succLinks.values().forEach(function (l) {
            d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
            if (l.highlighted) {
              d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
            }
            l.hidden = false;
          });
        });

        if (d.nodeType === 'subanalysis') {
          /* Resize analysis bounding box. */
          d3.selectAll('#BBoxId-' + d.parent.autoId + ', #aBBClipId-' +
            d.parent.autoId).selectAll('rect')
            .attr('width', function () {
              return (d3.select(this.parentElement).attr('id') === 'BBoxId-' +
              d.parent.autoId) ?
                cell.width : cell.width;
            })
            .attr('height', function () {
              return cell.height;
            });
          /* Update links. */
          updateNodeLink.updateLink(d.parent);
        } else if (d.nodeType === 'analysis') {
          /* Check layer Links. */
          d.parent.predLinks.values().forEach(function (pl) {
            if (!pl.source.hidden) {
              pl.hidden = false;
            }
          });
          d.parent.succLinks.values().forEach(function (sl) {
            if (!sl.target.hidden) {
              sl.hidden = false;
            }
          });

          updateNodeLink.updateLink(d.parent);
          updateNodeLink.updateNode(d3.select('#gNodeId-' + d.parent.autoId), d.parent,
            d.parent.x, d.parent.y);
        } else {
          /* Set saBBox visibility. */
          d3.select('#BBoxId-' + d.parent.autoId).classed('hiddenBBox', true);

          /* Update. */
          updateNodeLink.updateLink(d.parent.parent);
          updateNodeLink.updateNode(d3.select('#gNodeId-' + d.parent.parent.autoId),
            d.parent.parent, d.parent.parent.x, d.parent.parent.y);

          /* Compute bounding box for analysis child nodes. */
          anBBoxCoords = coordsService.getABBoxCoords(d.parent.parent, 0);

          /* Adjust analysis bounding box. */
          d3.selectAll('#BBoxId-' + d.parent.parent.autoId + ', #aBBClipId-' +
            d.parent.parent.autoId).selectAll('rect')
            .attr('width', function () {
              return anBBoxCoords.x.max - anBBoxCoords.x.min;
            })
            .attr('height', function () {
              return anBBoxCoords.y.max - anBBoxCoords.y.min;
            });

          /* If the selected subanalysis is the last remaining to collapse,
           adjust bounding box and clippath. */
          if (!d.parent.parent.children.values().some(function (san) {
            return san.hidden;
          })) {
            /* Compute bounding box for analysis child nodes. */
            anBBoxCoords = coordsService.getABBoxCoords(d.parent.parent, 0);

            /* Adjust analysis bounding box. */
            d3.select('#BBoxId-' + d.parent.parent.autoId).select('rect')
              .attr('width', function () {
                return anBBoxCoords.x.max - anBBoxCoords.x.min;
              })
              .attr('height', function () {
                return anBBoxCoords.y.max - anBBoxCoords.y.min;
              });

            /* Adjust clippath. */
            d3.select('#aBBClipId-' + d.parent.parent.autoId).select('rect')
              .attr('width', cell.width)
              .attr('height', cell.height + 2 * scaleFactor * vis.radius)
              .attr('rx', cell.width / 7)
              .attr('ry', cell.height / 7);
          }
          /* Update links. */
          updateNodeLink.updateLink(d.parent.parent);
        }
      }

      if (trigger === 'user') {
        /* Recompute layout. */
        dagreService.dagreDynamicLayerLayout(vis.graph);

        if (partsService.fitToWindow) {
          provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
        }
      }
    }
        /* TODO: Code cleanup. */
    /**
     * On doi change, update node doi labels.
     */
    function updateNodeDoi (domNodeset) {
      /**
       * Helper function to check whether every parent node is hidden.
       * @param n BaseNode
       * @returns {boolean} Returns true if any parent node is visible.
       */
      var vis = partsService.vis;

      var allParentsHidden = function (n) {
        var cur = n;

        while (!(cur instanceof provvisDecl.Layer)) {
          if (!(cur instanceof provvisDecl.Layer) && !cur.parent.hidden) {
            return false;
          }
          cur = cur.parent;
        }

        return true;
      };

      /* Update node doi label. */
      domNodeset.select('.nodeDoiLabel').text(function (d) {
        return d.doi.doiWeightedSum;
      });

      /* On layer doi. */
      vis.graph.lNodes.values().forEach(function (ln) {
        if (ln.doi.doiWeightedSum >= (1 / 4) && !ln.hidden && ln.filtered) {
          /* Expand. */
          handleCollapseExpandNode(ln, 'e', 'auto');
        }
      });

      /* On analysis doi. */
      vis.graph.aNodes.forEach(function (an) {
        if (an.doi.doiWeightedSum >= (2 / 4) && !an.hidden && an.filtered) {
          /* Expand. */
          handleCollapseExpandNode(an, 'e', 'auto');
        } else if (an.doi.doiWeightedSum < (1 / 4) && !an.hidden &&
          an.parent.children.size() > 1) {
          /* Collapse. */
          handleCollapseExpandNode(an, 'c', 'auto');

          if (an.parent.filtered) {
            /* Only collapse those analysis nodes into the layered node which
             * are below the threshold. */
            an.parent.children.values().forEach(function (d) {
              if (d.doi.doiWeightedSum >= (1 / 4)) {
                d.exaggerated = true;

                d.hidden = false;
                d3.select('#nodeId-' + d.autoId).classed('hiddenNode', false);
                linksService.updateLink(d);

                if (d.doi.doiWeightedSum >= (2 / 4) && !d.hidden && d.filtered) {
                  /* Expand. */
                  handleCollapseExpandNode(d, 'e', 'auto');
                }
              } else {
                d.exaggerated = false;
                d.hidden = true;
                d3.select('#nodeId-' + an.autoId).classed('hiddenNode', true);
              }
            });
          }
        }
      });

      /* On node doi. */
      vis.graph.saNodes.forEach(function (san) {
        var maxDoi = d3.max(san.children.values(), function (n) {
          return n.doi.doiWeightedSum;
        });
        if (maxDoi < (3 / 4) && (allParentsHidden(san.children.values()[0]) ||
          san.parent.exaggerated)) {
          /* Collapse. */
          handleCollapseExpandNode(san.children.values()[0], 'c', 'auto');
        }
      });

      /* On subanalysis doi. */
      vis.graph.saNodes.forEach(function (san) {
        var maxDoi = d3.max(san.parent.children.values(), function (cn) {
          return cn.doi.doiWeightedSum;
        });

        if (san.doi.doiWeightedSum >= (3 / 4) && !san.hidden && san.filtered) {
          /* Expand. */
          handleCollapseExpandNode(san, 'e', 'auto');
        } else if (maxDoi < (2 / 4) && (allParentsHidden(san) ||
          san.parent.exaggerated)) {
          /* Collapse. */
          handleCollapseExpandNode(san, 'c', 'auto');
        }
      });

      /* Recompute layout. */
      dagreService.dagreDynamicLayerLayout(vis.graph);

      if (partsService.fitToWindow) {
        provvisHelpers.fitGraphToWindow(partsService.nodeLinkTransitionTime);
      }
    }
  }
})();
