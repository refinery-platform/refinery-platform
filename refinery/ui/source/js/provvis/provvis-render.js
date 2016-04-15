'use strict';

/**
 * Module for render.
 */

var provvisRender = (function () {
  var vis = Object.create(null);
  var cell = Object.create(null);

  /* Initialize dom elements. */
  var lNode = Object.create(null);
  var aNode = Object.create(null);
  var saNode = Object.create(null);
  var node = Object.create(null);
  var domNodeset = [];
  var link = Object.create(null);
  var aLink = Object.create(null);
  var saLink = Object.create(null);
  var analysis = Object.create(null);
  var subanalysis = Object.create(null);
  var layer = Object.create(null);
  var hLink = Object.create(null);
  var lLink = Object.create(null);
  var saBBox = Object.create(null);
  var aBBox = Object.create(null);
  var lBBox = Object.create(null);

  var analysisWorkflowMap = d3.map();
  var width = 0;
  var depth = 0;

  var timeColorScale = Object.create(null);
  var filterAction = Object.create(null);
  var filterMethod = 'timeline';
  var timeLineGradientScale = Object.create(null);

  var lastSolrResponse = Object.create(null);

  var selectedNodeSet = d3.map();

  var draggingActive = false;

  var nodeLinkTransitionTime = 1000;

  var aNodesBAK = [];
  var saNodesBAK = [];
  var nodesBAK = [];
  var aLinksBAK = [];
  var lLinksBAK = d3.map();
  var lNodesBAK = d3.map();

  var scaleFactor = 0.75;

  var layoutCols = d3.map();

  var linkStyle = 'bezier1';

  var colorStrokes = '#136382';
  var colorHighlight = '#ed7407';

  var fitToWindow = true;

  var doiDiffScale = Object.create(null);

  var doiAutoUpdate = false;

  /* Simple tooltips by NG. */
  var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'refinery-tooltip')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden');

  /* TODO: Code cleanup. */
  /**
   * On doi change, update node doi labels.
   */
  var updateNodeDoi = function () {
    /**
     * Helper function to check whether every parent node is hidden.
     * @param n BaseNode
     * @returns {boolean} Returns true if any parent node is visible.
     */
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
              updateLink(d);

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
    dagreDynamicLayerLayout(vis.graph);

    if (fitToWindow) {
      fitGraphToWindow(nodeLinkTransitionTime);
    }
  };

  /**
   * Make tooltip visible and align it to the events position.
   * @param label Inner html code appended to the tooltip.
   * @param event E.g. mouse event.
   */
  var showTooltip = function (label, event) {
    tooltip.html(label);
    tooltip.style('visibility', 'visible');
    tooltip.style('top', (event.pageY + 10) + 'px');
    tooltip.style('left', (event.pageX + 10) + 'px');
  };

  /**
   * Hide tooltip.
   */
  var hideTooltip = function () {
    tooltip.style('visibility', 'hidden');
  };

  /**
   * Update node coordinates through translation.
   * @param dom Node dom element.
   * @param n Node object element.
   * @param x The current x-coordinate for the node.
   * @param y The current y-coordinate for the node.
   */
  var updateNode = function (dom, n, x, y) {
    /* Set selected node coordinates. */
    dom.transition()
      .duration(draggingActive ? 0 : nodeLinkTransitionTime)
      .attr('transform', 'translate(' + x + ',' + y + ')');
  };

  /**
   * For a node, get first visible parent node coords.
   * @param curN Node to start traversing to its parents.
   * @returns {{x: number, y: number}} X and y coordinates of the first visible
   * parent node.
   */
  var getVisibleNodeCoords = function (curN) {
    var x = 0;
    var y = 0;

    while (curN.hidden && !(curN instanceof provvisDecl.Layer)) {
      curN = curN.parent;
    }

    if (curN instanceof provvisDecl.Layer) {
      x = curN.x;
      y = curN.y;
    } else {
      while (!(curN instanceof provvisDecl.Layer)) {
        x += curN.x;
        y += curN.y;
        curN = curN.parent;
      }
    }

    return {
      x: x,
      y: y
    };
  };

  /**
   * Path generator for bezier link.
   * @param l Link.
   * @param srcX Source x coordinate.
   * @param srcY Source y coordinate.
   * @param tarX Target x coordinate.
   * @param tarY Target y coordinate.
   * @returns {*} Path for link.
   */
  var drawBezierLink1 = function (l, srcX, srcY, tarX, tarY) {
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
          hLineSrc = getABBoxCoords(curN, 0).x.max - vis.cell.width / 2;
        }

        /* LayoutCols provides the maximum width of any potential expanded node
         * within the column of the graph. An the width difference is calculated
         * as offset and added as horizontal line to the link. */
        layoutCols.values().forEach(function (c) {
          if (c.nodes.indexOf(curN.autoId) !== -1) {
            var curWidth = getABBoxCoords(curN, 0).x.max -
            getABBoxCoords(curN, 0).x.min;
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
  };

  /**
   * Path generator for bezier link.
   * @param l Link.
   * @param srcX Source x coordinate.
   * @param srcY Source y coordinate.
   * @param tarX Target x coordinate.
   * @param tarY Target y coordinate.
   * @returns {*} Path for link.
   */
  var drawBezierLink2 = function (l, srcX, srcY, tarX, tarY) {
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
  };

  /**
   * Path generator for bezier link.
   * @param l Link.
   * @param srcX Source x coordinate.
   * @param srcY Source y coordinate.
   * @param tarX Target x coordinate.
   * @param tarY Target y coordinate.
   * @returns {*} Path for link.
   */
  var drawBezierLink3 = function (l, srcX, srcY, tarX, tarY) {
    var pathSegment = 'M' + srcX + ',' + srcY;

    pathSegment = pathSegment.concat(' C' + (srcX + cell.width) + ',' +
      (srcY) + ' ' +
      (tarX - cell.width) + ',' + (tarY) + ' ' +
      (tarX) + ',' + (tarY) + ' ');

    return pathSegment;
  };

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
  var drawBezierLink = function (l, srcX, srcY, tarX, tarY) {
    return drawBezierLink1(l, srcX, srcY, tarX, tarY);
  //return drawBezierLink2(l, srcX, srcY, tarX, tarY);
  //return drawBezierLink3(l, srcX, srcY, tarX, tarY);
  };

  /**
   * Path generator for straight link.
   * @param l Link.
   * @param srcX Source x coordinate.
   * @param srcY Source y coordinate.
   * @param tarX Target x coordinate.
   * @param tarY Target y coordinate.
   * @returns {*} Path for link.
   */
  var drawStraightLink = function (l, srcX, srcY, tarX, tarY) {
    var pathSegment = ' M' + srcX + ',' + srcY;
    pathSegment = pathSegment.concat(' L' + tarX + ',' + tarY);
    return pathSegment;
  };

  /**
   * Update link through translation while dragging or on dragend.
   * @param n Node object element.
   */
  var updateLink = function (n) {
    var predLinks = d3.map();
    var succLinks = d3.map();

    /* Get layer and/or analysis links. */
    switch (n.nodeType) {
      case 'layer':
        n.predLinks.values().forEach(function (pl) {
          predLinks.set(pl.autoId, pl);
        });
        n.succLinks.values().forEach(function (sl) {
          succLinks.set(sl.autoId, sl);
        });
        n.children.values().forEach(function (an) {
          an.predLinks.values().forEach(function (pl) {
            predLinks.set(pl.autoId, pl);
          });
          an.succLinks.values().forEach(function (sl) {
            succLinks.set(sl.autoId, sl);
          });
        });
        break;
      case 'analysis':
        n.predLinks.values().forEach(function (pl) {
          predLinks.set(pl.autoId, pl);
        });
        n.succLinks.values().forEach(function (sl) {
          succLinks.set(sl.autoId, sl);
        });
        break;
    }

    /* Get input links and update coordinates for x2 and y2. */
    predLinks.values().forEach(function (l) {
      d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
        .classed('link-transition', true)
        .transition()
        .duration(draggingActive ? 0 : nodeLinkTransitionTime)
        .attr('d', function (l) {
          var srcCoords = getVisibleNodeCoords(l.source);
          var tarCoords = getVisibleNodeCoords(l.target);

          if (linkStyle === 'bezier1') {
            return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
              tarCoords.y);
          } else {
            return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
              tarCoords.y);
          }
        });

      setTimeout(function () {
        d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
          .classed('link-transition', false);
      }, nodeLinkTransitionTime);
    });

    /* Get output links and update coordinates for x1 and y1. */
    succLinks.values().forEach(function (l) {
      d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
        .classed('link-transition', true)
        .transition()
        .duration(draggingActive ? 0 : nodeLinkTransitionTime)
        .attr('d', function (l) {
          var tarCoords = getVisibleNodeCoords(l.target);
          var srcCoords = getVisibleNodeCoords(l.source);

          if (linkStyle === 'bezier1') {
            return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
              tarCoords.y);
          } else {
            return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
              tarCoords.y);
          }
        });

      setTimeout(function () {
        d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
          .classed('link-transition', false);
      }, nodeLinkTransitionTime);
    });
  };

  /**
   * Drag start listener support for nodes.
   */
  var dragStart = function () {
    d3.event.sourceEvent.stopPropagation();
  };

  /**
   * Drag listener.
   * @param n Node object.
   */
  var dragging = function (n) {
    var self = d3.select(this);

    /* While dragging, hide tooltips. */
    hideTooltip();

    var deltaY = d3.event.y - n.y;

    /* Set coords. */
    n.x = d3.event.x;
    n.y = d3.event.y;

    /* Drag selected node. */
    updateNode(self, n, d3.event.x, d3.event.y);

    /* Drag adjacent links. */
    updateLink(n);

    if (n instanceof provvisDecl.Layer) {
      n.children.values().forEach(function (an) {
        an.x = n.x - (getABBoxCoords(an, 0).x.max -
          getABBoxCoords(an, 0).x.min) / 2 + vis.cell.width / 2;
        an.y += deltaY;
        updateNode(d3.select('#gNodeId-' + an.autoId), an, an.x, an.y);
        updateLink(an);
      });
    }

    draggingActive = true;
  };

  /**
   * Update node and link.
   * @param n Node.
   * @param dom Node as dom object.
   */
  var updateNodeAndLink = function (n, dom) {
    var self = dom;

    /* Align selected node. */
    updateNode(self, n, n.x, n.y);

    /* Align adjacent links. */
    updateLink(n);

    if (n instanceof provvisDecl.Layer) {
      n.children.values().forEach(function (an) {
        updateNode(d3.select('#gNodeId-' + an.autoId), an, an.x, an.y);
        updateLink(an);
      });
    }
  };

  /**
   * Drag end listener.
   */
  var dragEnd = function (n) {
    if (draggingActive) {
      var self = d3.select(this);

      /* Update node and adjacent links. */
      updateNodeAndLink(n, self);

      /* Prevent other mouseevents during dragging. */
      setTimeout(function () {
        draggingActive = false;
      }, 200);
    }
  };

  /**
   * Sets the drag events for nodes.
   * @param nodeType The dom nodeset to allow dragging.
   */
  var applyDragBehavior = function (domDragSet) {
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
  };

  /* TODO: Update to incorporate facet filtering and adjust link visibility
   * on loose graphs. */
  /**
   * Filter analyses by time gradient timeline view.
   * @param lowerTimeThreshold The point of time where analyses executed before
   * are hidden.
   * @param upperTimeThreshold The point of time where analyses executed after
   * are hidden.
   * @param vis The provenance visualization root object.
   */
  var filterAnalysesByTime = function (lowerTimeThreshold, upperTimeThreshold,
    vis) {
    vis.graph.lNodes = lNodesBAK;
    vis.graph.aNodes = aNodesBAK;
    vis.graph.saNodes = saNodesBAK;
    vis.graph.nodes = nodesBAK;
    vis.graph.aLinks = aLinksBAK;
    vis.graph.lLinks = lLinksBAK;

    var selAnalyses = vis.graph.aNodes.filter(function (an) {
      upperTimeThreshold.setSeconds(upperTimeThreshold.getSeconds() + 1);
      return parseISOTimeFormat(an.start) >= lowerTimeThreshold &&
      parseISOTimeFormat(an.start) <= upperTimeThreshold;
    });

    /* Set (un)filtered analyses. */
    vis.graph.aNodes.forEach(function (an) {
      if (selAnalyses.indexOf(an) === -1) {
        an.filtered = false;
        an.children.values().forEach(function (san) {
          san.filtered = false;
          san.children.values().forEach(function (n) {
            n.filtered = false;
          });
        });
      } else {
        an.filtered = true;
        an.children.values().forEach(function (san) {
          san.filtered = true;
          san.children.values().forEach(function (n) {
            n.filtered = true;
          });
        });
      }
    });

    /* Update analysis filter attributes. */
    vis.graph.aNodes.forEach(function (an) {
      if (an.children.values().some(function (san) {
          return san.filtered;
        })) {
        an.filtered = true;
      } else {
        an.filtered = false;
      }
      an.doi.filteredChanged();
    });

    /* Update layer filter attributes. */
    vis.graph.lNodes.values().forEach(function (ln) {
      if (ln.children.values().some(function (an) {
          return an.filtered;
        })) {
        ln.filtered = true;
      } else {
        ln.filtered = false;
      }
      ln.doi.filteredChanged();
    });

    /* Update analysis link filter attributes. */
    vis.graph.aLinks.forEach(function (al) {
      al.filtered = false;
    });
    vis.graph.aLinks.filter(function (al) {
      return al.source.parent.parent.filtered &&
      al.target.parent.parent.filtered;
    }).forEach(function (al) {
      al.filtered = true;
    });
    vis.graph.lLinks.values().forEach(function (ll) {
      ll.filtered = false;
    });
    vis.graph.lLinks.values().filter(function (ll) {
      return ll.source.filtered && ll.target.filtered;
    }).forEach(function (ll) {
      ll.filtered = true;
    });

    /* On filter action 'hide', splice and recompute graph. */
    if (filterAction === 'hide') {

      /* Update filtered nodesets. */
      var cpyLNodes = d3.map();
      vis.graph.lNodes.entries().forEach(function (ln) {
        if (ln.value.filtered) {
          cpyLNodes.set(ln.key, ln.value);
        }
      });
      vis.graph.lNodes = cpyLNodes;
      vis.graph.aNodes = vis.graph.aNodes.filter(function (an) {
        return an.filtered;
      });
      vis.graph.saNodes = vis.graph.saNodes.filter(function (san) {
        return san.filtered;
      });
      vis.graph.nodes = vis.graph.nodes.filter(function (n) {
        return n.filtered;
      });

      /* Update filtered linksets. */
      vis.graph.aLinks = vis.graph.aLinks.filter(function (al) {
        return al.filtered;
      });

      /* Update layer links. */
      var cpyLLinks = d3.map();
      vis.graph.lLinks.entries().forEach(function (ll) {
        if (ll.value.filtered) {
          cpyLLinks.set(ll.key, ll.value);
        }
      });
      vis.graph.lLinks = cpyLLinks;
    }

    dagreDynamicLayerLayout(vis.graph);

    if (fitToWindow) {
      fitGraphToWindow(nodeLinkTransitionTime);
    }

    updateNodeFilter();
    updateLinkFilter();
    updateAnalysisLinks(vis.graph);
    updateLayerLinks(vis.graph.lLinks);

    vis.graph.aNodes.forEach(function (an) {
      updateLink(an);
    });
    vis.graph.lNodes.values().forEach(function (ln) {
      updateLink(ln);
    });

    /* TODO: Temporarily enabled. */
    if (doiAutoUpdate) {
      recomputeDOI();
    }
  };

  /**
   * Draws the timeline view.
   * @param vis The provenance visualization root object.
   */
  var drawTimelineView = function (vis) {
    var svg = d3.select('#provenance-timeline-view').select('svg').append('g')
      .append('g').attr('transform', function () {
      return 'translate(20,0)';
    });

    var tlHeight = 50;
    var tlWidth = 250;

    var x = d3.scale.linear()
      .domain([0, tlWidth])
      .range([0, tlWidth]);

    var y = d3.scale.linear()
      .domain([5, 0])
      .range([0, tlHeight - 10]);

    timeLineGradientScale = d3.time.scale()
      .domain([Date.parse(timeColorScale.domain()[0]),
        Date.parse(timeColorScale.domain()[1])])
      .range([0, tlWidth])
      .nice();

    var xAxis = d3.svg.axis()
      .scale(timeLineGradientScale)
      .orient('bottom')
      .ticks(5);

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient('left')
      .ticks(7);

    var tlTickCoords = d3.map();

    aNodesBAK.forEach(function (an) {
      tlTickCoords.set(an.autoId,
        timeLineGradientScale(parseISOTimeFormat(an.start)));
    });

    /**
     * Drag start listener support for time lines.
     */
    var dragLineStart = function () {
      d3.event.sourceEvent.stopPropagation();
    };

    /**
     * Get lower and upper date threshold date in timeline view.
     * @param l Time line.
     * @returns {Array} An array of size 2 containing both the lower and upper
     * threshold date.
     */
    var getTimeLineThresholds = function (l) {
      var lowerTimeThreshold = Object.create(null);
      var upperTimeThreshold = Object.create(null);

      if (l.className === 'startTimeline') {
        lowerTimeThreshold = l.time;
        upperTimeThreshold = d3.select('.endTimeline').data()[0].time;
      } else {
        lowerTimeThreshold = d3.select('.startTimeline').data()[0].time;
        upperTimeThreshold = l.time;
      }

      return [lowerTimeThreshold, upperTimeThreshold];
    };

    /**
     * Update lower and upper date threshold label in timeline view.
     * @param l Time line.
     */
    var updateTimelineLabels = function (l) {
      var tlThreshold = getTimeLineThresholds(l);
      tlThreshold[1].setSeconds(tlThreshold[1].getSeconds() + 1);

      var labelStart = customTimeFormat(tlThreshold[0]);
      var labelEnd = customTimeFormat(tlThreshold[1]);

      d3.select('#tlThresholdStart').html('Start: ' + labelStart);
      d3.select('#tlThresholdEnd').html('End: ' + labelEnd);

      d3.selectAll('.tlAnalysis').each(function (an) {
        if (parseISOTimeFormat(an.start) < tlThreshold[0] ||
          parseISOTimeFormat(an.start) > tlThreshold[1]) {
          d3.select(this).classed('blendedTLAnalysis', true);
        } else {
          d3.select(this).classed('blendedTLAnalysis', false);
        }
      });
    };

    /**
     * Drag listener.
     * @param l Time line.
     */
    var draggingLine = function (l) {
      /* Check borders. */
      if (d3.event.x < 0) {
        l.x = 0;
      } else if (d3.event.x > tlWidth) {
        l.x = tlWidth;
      } else {
        l.x = d3.event.x;
      }
      l.time = new Date(timeLineGradientScale.invert(l.x));

      /* Update lines. */
      d3.select(this).attr('transform', function () {
        return 'translate(' + x(l.x) + ',0)';
      });

      /* Update labels. */
      updateTimelineLabels(l);

      /* TODO: Temporarily disabled live filtering as it does not scale
       * well with big graphs. */

      /* On hover filter update. */
      /*if (d3.entries(tlTickCoords).some(function (t) {

       if (l.className === "startTimeline") {

       */
      /* Left to right. */
      /*
       if (l.x > l.lastX) {
       if (x(l.x) - x(t.value) > 0 && x(l.x) - x(t.value) <= 1) {
       return true;
       } else {
       return false;
       }
       */
      /* Right to left. */
      /*
       } else {
       if (x(l.x) - x(t.value) >= -1 && x(l.x) - x(t.value) < 0) {
       return true;
       } else {
       return false;
       }
       }
       } else {
       */
      /* Right to left. */
      /*
       if (l.x < l.lastX) {

       */
      /* TODO: Small bug, time scale is off by 30 seconds. */
      /*
       if (x(l.x) - x(t.value) >= -5 && x(l.x) - x(t.value) < 0) {
       return true;
       } else {
       return false;
       }
       */
      /* Left to right. */
      /*
       } else {
       if (x(l.x) - x(t.value) > 0 && x(l.x) - x(t.value) <= 1) {
       return true;
       } else {
       return false;
       }
       }
       }
       })) {
       filterAnalysesByTime(getTimeLineThresholds(l)[0],
       getTimeLineThresholds(l)[1], vis);
       }*/

      /* Remember last drag x coord. */
      l.lastX = l.x;
    };

    /**
     * Drag end listener.
     * @param l Time line.
     */
    var dragLineEnd = function (l) {
      l.time = new Date(timeLineGradientScale.invert(l.x));

      /* Update labels. */
      updateTimelineLabels(l);

      /* Filter action. */
      filterAnalysesByTime(getTimeLineThresholds(l)[0],
        getTimeLineThresholds(l)[1], vis);

      filterMethod = 'timeline';
    };

    /**
     * Sets the drag events for time lines.
     * @param nodeType The dom lineset to allow dragging.
     */
    var applyTimeLineDragBehavior = function (domDragSet) {
      /* Drag and drop line enabled. */
      var dragLine = d3.behavior.drag()
        .origin(function (d) {
          return d;
        })
        .on('dragstart', dragLineStart)
        .on('drag', draggingLine)
        .on('dragend', dragLineEnd);

      /* Invoke dragging behavior on nodes. */
      domDragSet.call(dragLine);
    };

    /* Geometric zoom. */
    var redrawTimeline = function () {
      /* Translations. */
      svg.selectAll('.tlAnalysis')
        .attr('x1', function (an) {
          return x(timeLineGradientScale(parseISOTimeFormat(an.start)));
        })
        .attr('x2', function (an) {
          return x(timeLineGradientScale(parseISOTimeFormat(an.start)));
        });

      svg.selectAll('.startTimeline, .endTimeline')
        .attr('transform', function (d) {
          return 'translate(' + x(d.x) + ',' + 0 + ')';
        });

      svg.select('#timelineView')
        .attr('x', x(0))
        .attr('width', x(tlWidth) - x(0));

      svg.select('#tlxAxis')
        .attr('transform', function () {
          return 'translate(' + x(0) + ',' + tlHeight + ')';
        });

      svg.select('#tlxAxis').selectAll('.tick')
        .attr('transform', function (d) {
          return 'translate(' + (x(timeLineGradientScale(d)) -
          (d3.event.translate[0])) + ',' + 0 + ')';
        });

      svg.select('#tlxAxis').select('path').attr('d', function () {
        return 'M0,6V0H' + (tlWidth * d3.event.scale) + 'V6';
      });

      svg.select('#tlyAxis')
        .attr('transform', function () {
          return 'translate(' + x(0) + ',' + 10 + ')';
        });
    };

    /* Timeline zoom behavior. */
    var timelineZoom = d3.behavior.zoom().x(x).scaleExtent([1, 10])
      .on('zoom', redrawTimeline);

    timelineZoom(svg);

    var gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'gradientGrayscale');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#fff')
      .attr('stop-opacity', 1);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#000')
      .attr('stop-opacity', 1);

    svg.append('rect')
      .attr('id', 'timelineView')
      .attr('x', 0)
      .attr('y', 10)
      .attr('width', tlWidth)
      .attr('height', tlHeight - 10)
      .style({
        'fill': 'url(#gradientGrayscale)',
        'stroke': 'white',
        'stroke-width': '1px'
      });

    svg.append('g')
      .classed({
        'x': true,
        'axis': true
      })
      .attr('id', 'tlxAxis')
      .attr('transform', 'translate(0,' + tlHeight + ')')
      .call(xAxis);

    svg.append('g')
      .classed({
        'y': true,
        'axis': true
      })
      .attr('id', 'tlyAxis')
      .attr('transform', 'translate(0,' + 10 + ')')
      .call(yAxis);

    d3.select('#tlyAxis').selectAll('.tick').each(function (d) {
      if (d === 5) {
        d3.select(this).select('text').text('>5');
      }
    });

    var startTime = {
      className: 'startTimeline',
      x: 0,
      lastX: -1,
      time: new Date(timeLineGradientScale.invert(0))
    };
    var endTime = {
      className: 'endTimeline',
      x: tlWidth,
      lastX: tlWidth + 1,
      time: new Date(timeLineGradientScale.invert(tlWidth))
    };

    var timeLineThreshold = svg.selectAll('.line')
      .data([startTime, endTime])
      .enter().append('g').attr('transform', function (d) {
      return 'translate(' + d.x + ',0)';
    }).attr('class', function (d) {
      return d.className;
    });

    timeLineThreshold.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', tlHeight);

    timeLineThreshold.append('polygon').classed('timeMarker', true)
      .attr('points', '0,50 5,60 -5,60');
    timeLineThreshold.append('polygon').classed('timeMarker', true)
      .attr('points', '0,10 5,0 -5,0');

    svg.selectAll('.line')
      .data(function () {
        return vis.graph.aNodes;
      })
      .enter().append('line')
      .attr('id', function (an) {
        return 'tlAnalysisId-' + an.autoId;
      })
      .classed('tlAnalysis', true)
      .attr('x1', function (an) {
        return timeLineGradientScale(parseISOTimeFormat(an.start));
      })
      .attr('y1', function (an) {
        return an.children.size() >= 5 ? 10 :
          parseInt(tlHeight - (tlHeight - 10) / 5 * an.children.size(), 10);
      })
      .attr('x2', function (an) {
        return timeLineGradientScale(parseISOTimeFormat(an.start));
      })
      .attr('y2', tlHeight);

    d3.selectAll('.startTimeline, .endTimeline').on('mouseover', function () {
      d3.select(this).classed('mouseoverTimeline', true);
    });

    applyTimeLineDragBehavior(d3.selectAll('.startTimeline, .endTimeline'));

    updateTimelineLabels(startTime);
  };

  /**
   * Recomputes the DOI for every node
   */
  var recomputeDOI = function () {
    vis.graph.lNodes.values().forEach(function (l) {
      l.doi.computeWeightedSum();
      l.children.values().forEach(function (an) {
        an.doi.computeWeightedSum();
        an.children.values().forEach(function (san) {
          san.doi.computeWeightedSum();
          san.children.values().forEach(function (n) {
            n.doi.computeWeightedSum();
          });
        });
      });
    });
    updateNodeDoi();
  };

  /* TODO: Code cleanup. */
  /**
   * Draws the DOI view.
   */
  var drawDoiView = function () {
    var innerSvg = d3.select('#provenance-doi-view')
      .select('svg').select('g').select('g').attr('transform', function () {
      return 'translate(0,0)';
    }).select('g');

    var doiFactors = d3.values(provvisDecl.DoiFactors.factors);
    var doiColorScale = d3.scale.category10();

    var updateDoiView = function (data) {
      var rectOffset = 0;
      var labelOffset = 30;
      var labelsStart = (300 - data.length * labelOffset) / 2;

      /* Data join. */
      var dComp = innerSvg.selectAll('g').data(data);

      /* Update. */
      var gDCompUpdate = dComp.attr('id', function (d, i) {
        return 'doiCompId-' + i;
      }).classed({
        'doiComp': true
      });
      gDCompUpdate.select('.doiCompRect')
        .classed('doiCompRect', true)
        .attr('x', 0)
        .attr('y', function (d) {
          rectOffset += d.value * 300;
          return rectOffset - d.value * 300;
        }).attr('width', 40)
        .attr('height', function (d) {
          return d.value * 300;
        });
      gDCompUpdate.select('.doiCompHandle')
        .classed('doiCompHandle', true)
        .attr('x', 40 + labelOffset)
        .attr('y', function (d, i) {
          return labelsStart + labelOffset * i;
        }).attr('width', labelOffset)
        .attr('height', labelOffset)
        .style('fill', function (d, i) {
          return doiColorScale(10 - i);
        });
      rectOffset = 0;
      gDCompUpdate.select('.doiCompLine', true)
        .attr('x1', 40)
        .attr('y1', function (d) {
          rectOffset += d.value * 300;
          return rectOffset - (d.value * 300 / 2);
        }).attr('x2', 40 + labelOffset)
        .attr('y2', function (d, i) {
          return labelsStart + labelOffset * i + labelOffset / 2;
        })
        .style({
          'stroke': function (d, i) {
            return doiColorScale(10 - i);
          },
          'stroke-opacity': 0.7,
          'stroke-width': '2px'
        });

      /* Enter. */
      var gDCompEnter = dComp.enter().append('g')
        .attr('id', function (d, i) {
          return 'doiCompId-' + i;
        }).classed({
        'doiComp': true
      });
      gDCompEnter.append('rect')
        .classed('doiCompRect', true)
        .attr('x', 0)
        .attr('y', function (d) {
          rectOffset += d.value * 300;
          return rectOffset - d.value * 300;
        }).attr('width', 40)
        .attr('height', function (d) {
          return d.value * 300;
        }).style('fill', function (d, i) {
        return doiColorScale(10 - i);
      });
      rectOffset = 0;
      gDCompEnter.append('rect')
        .classed('doiCompHandle', true)
        .attr('x', 40 + labelOffset)
        .attr('y', function (d, i) {
          return labelsStart + labelOffset * i;
        }).attr('width', labelOffset)
        .attr('height', labelOffset)
        .style('fill', function (d, i) {
          return doiColorScale(10 - i);
        });
      rectOffset = 0;
      gDCompEnter.append('line').classed('doiCompLine', true)
        .attr('x1', 40)
        .attr('y1', function (d) {
          rectOffset += d.value * 300;
          return rectOffset - (d.value * 300 / 2);
        }).attr('x2', 40 + labelOffset)
        .attr('y2', function (d, i) {
          return labelsStart + labelOffset * i + labelOffset / 2;
        })
        .style({
          'stroke': function (d, i) {
            return doiColorScale(10 - i);
          },
          'stroke-opacity': 0.7,
          'stroke-width': '2px'
        });

      dComp.exit().remove();

      $('#doiSpinners').css('padding-top', labelsStart);
    };

    updateDoiView(doiFactors);

    doiFactors.forEach(function (dc, i) {
      $('<div/>', {
        'id': 'dc-form-' + i,
        'class': 'form dc-form',
        'style': 'height: 30px; position: absolute; left: 75px; top: ' +
          parseInt((10 - doiFactors.length) / 2 * 30 + (i + 1) * 30 - 1, 10) +
          'px;'
      }).appendTo('#' + 'doiVis');

      $('<input/>', {
        'id': 'dc-checkbox-' + i,
        'class': 'dc-checkbox',
        'type': 'checkbox',
        'checked': 'true',
        'style': 'margin-top: 0px; margin-right: 2px; vertical-align: middle;'
      }).appendTo('#' + 'dc-form-' + i);

      $('<input/>', {
        'id': 'dc-input-' + i,
        'type': 'text',
        'class': 'form-control dc-input',
        'value': dc.value,
        'style': 'display: inline; width: 27px; height: 30px; margin-bottom:' +
          ' 0px;' +
          'margin-right: 2px; text-align: left; padding: 0; margin-left: 2px;' +
          ' border-radius: 0px;'
      }).appendTo('#' + 'dc-form-' + i);

      $('<div/>', {
        'id': 'btn-group-wrapper-' + i,
        'class': 'btn-group',
        'style': 'height: 32px'
      }).appendTo('#' + 'dc-form-' + i);

      $('<div/>', {
        'id': 'dc-btn-group-' + i,
        'class': 'input-group-btn-vertical',
        'style': 'margin-right: 2px;'
      }).appendTo('#' + 'btn-group-wrapper-' + i);

      $('<button/>', {
        'id': 'dc-carret-up-' + i,
        'class': 'refinery-base btn btn-default',
        'html': '<i class=\'fa fa-caret-up\'></i>'
      }).appendTo('#' + 'dc-btn-group-' + i);

      $('<button/>', {
        'id': 'dc-carret-down-' + i,
        'class': 'refinery-base btn btn-default',
        'html': '<i class=\'fa fa-caret-down\'></i>'
      }).appendTo('#' + 'dc-btn-group-' + i);

      $('<span/>', {
        'id': 'dc-label-' + i,
        'class': 'label dc-label',
        'html': dc.label,
        'style': 'margin-left: 2px; opacity: 0.7; background-color: ' +
          doiColorScale(10 - i) + ';'
      }).appendTo('#' + 'dc-form-' + i);
    });

    $('<a/>', {
      'id': 'prov-doi-view-reset',
      'href': '#',
      'html': 'Redistribute',
      'style': 'width: 25px; position: absolute; left: 90px; top: ' +
        parseInt((10 - doiFactors.length) / 2 * 30 +
          (doiFactors.length + 1) * 30 + 10, 10) + 'px;'
    }).appendTo('#' + 'doiVis');

    /* TODO: Code cleanup. */
    /**
     * Toggle doi components.
     */
    var toggleDoiComps = function () {
      var numMaskedComps = d3.values(provvisDecl.DoiFactors.factors)
        .filter(function (dc) {
          return provvisDecl.DoiFactors.isMasked(dc.label);
        }).length;

      if (numMaskedComps > 0) {
        var accVal = d3.values(provvisDecl.DoiFactors.factors)
          .filter(function (dc, i) {
            return provvisDecl.DoiFactors.isMasked(dc.label);
          })
          .map(function (dc) {
            return dc.value;
          })
          .reduce(function (accVal, cur) {
            return accVal + cur;
          });

        var tar = 1.0;

        d3.values(provvisDecl.DoiFactors.factors)
          .forEach(function (dc, i) {
            if (provvisDecl.DoiFactors.isMasked(dc.label)) {
              var isMasked = $('#dc-checkbox-' + i)[0].checked;
              if (accVal === 0) {
                provvisDecl.DoiFactors.set(
                  d3.keys(provvisDecl.DoiFactors.factors)[i],
                  1 / numMaskedComps, isMasked);
                $('#dc-input-' + i).val(1 / numMaskedComps);
              } else {
                provvisDecl.DoiFactors.set(
                  d3.keys(provvisDecl.DoiFactors.factors)[i],
                  (dc.value / accVal) * tar, isMasked);
                $('#dc-input-' + i).val((dc.value / accVal) * tar);
              }
            }
          });
      }
      updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
    };

    /* Toggle component on svg click. */
    d3.selectAll('.doiComp').on('click', function () {
      var dcId = d3.select(this).attr('id').substr(d3.select(this).attr('id')
          .length - 1, 1);
      var val = 0.0;
      if ($('#dc-checkbox-' + dcId)[0].checked) {
        $('#dc-checkbox-' + dcId).prop('checked', false);
        $('#dc-label-' + dcId).css('opacity', 0.3);
        d3.select('#doiCompId-' + dcId)
          .select('.doiCompHandle')
          .classed('blendedDoiComp', true);
        d3.select('#doiCompId-' + dcId).select('.doiCompLine')
          .style('display', 'none');
        $('#dc-input-' + dcId).val(val);
        provvisDecl.DoiFactors.set(
          d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, false);
      } else {
        $($('#dc-checkbox-' + dcId)).prop('checked', true);
        $('#dc-label-' + dcId).css('opacity', 0.7);
        d3.select('#doiCompId-' + dcId)
          .select('.doiCompHandle')
          .classed('blendedDoiComp', false);
        d3.select('#doiCompId-' + dcId).select('.doiCompLine')
          .style('display', 'inline');
        provvisDecl.DoiFactors.set(
          d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);
      }
      toggleDoiComps();
    });

    /* Toggle component on checkbox click. */
    $('.dc-checkbox').click(function () {
      var dcId = $(this)[0].id[$(this)[0].id.length - 1];
      var val = 0.0;
      if ($(this)[0].checked) {
        $(this.parentNode).find('.dc-label').css('opacity', 0.7);
        d3.select('#doiCompId-' + dcId).select('.doiCompHandle')
          .classed('blendedDoiComp', false);
        d3.select('#doiCompId-' + dcId).select('.doiCompLine')
          .style('display', 'inline');
        val = 0.0;
        provvisDecl.DoiFactors.set(
          d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);
      } else {
        $(this.parentNode).find('.dc-label').css('opacity', 0.3);
        d3.select('#doiCompId-' + dcId).select('.doiCompHandle')
          .classed('blendedDoiComp', true);
        d3.select('#doiCompId-' + dcId).select('.doiCompLine')
          .style('display', 'none');
        val = 0.0;
        $('#dc-input-' + dcId).val(val);
        provvisDecl.DoiFactors.set(
          d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, false);
      }

      toggleDoiComps();
    });

    /* TODO: Clean up code duplication. */

    /* Increase component's influence. */
    $('.dc-form .btn:first-of-type').on('click', function () {
      var dcId = $(this)[0].id[$(this)[0].id.length - 1];
      var val = parseFloat($('#dc-input-' + dcId).val()) + 0.01;
      if ($('#dc-checkbox-' + dcId)[0].checked && val <= 1) {
        $('#dc-input-' + dcId).val(val);
        provvisDecl.DoiFactors.set(
          d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

        var accVal = d3.values(provvisDecl.DoiFactors.factors)
          .filter(function (dc, i) {
            return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);
          })
          .map(function (dc) {
            return dc.value;
          })
          .reduce(function (accVal, cur) {
            return accVal + cur;
          });

        var tar = parseFloat(1 - val);

        d3.values(provvisDecl.DoiFactors.factors)
          .forEach(function (dc, i) {
            if (i != dcId && provvisDecl.DoiFactors.isMasked(dc.label)) {
              var isMasked = $('#dc-checkbox-' + i)[0].checked;
              provvisDecl.DoiFactors.set(
                d3.keys(provvisDecl.DoiFactors.factors)[i],
                (dc.value / accVal) * tar, isMasked);
              $('#dc-input-' + i).val((dc.value / accVal) * tar);
            }
          });
        updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
      }
    });

    /* Decrease component's influence. */
    $('.dc-form .btn:last-of-type').on('click', function () {
      var dcId = $(this)[0].id[$(this)[0].id.length - 1];
      var val = parseFloat($('#dc-input-' + dcId).val()) - 0.01;
      if ($('#dc-checkbox-' + dcId)[0].checked && val >= 0) {
        $('#dc-input-' + dcId).val(val);
        provvisDecl.DoiFactors.set(
          d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

        var accVal = d3.values(provvisDecl.DoiFactors.factors)
          .filter(function (dc, i) {
            return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);
          })
          .map(function (dc) {
            return dc.value;
          })
          .reduce(function (accVal, cur) {
            return accVal + cur;
          });

        var tar = parseFloat(1 - val);

        d3.values(provvisDecl.DoiFactors.factors)
          .forEach(function (dc, i) {
            if (i != dcId && provvisDecl.DoiFactors.isMasked(dc.label)) {
              var isMasked = $('#dc-checkbox-' + i)[0].checked;
              provvisDecl.DoiFactors.set(
                d3.keys(provvisDecl.DoiFactors.factors)[i],
                (dc.value / accVal) * tar, isMasked);
              $('#dc-input-' + i).val((dc.value / accVal) * tar);
            }
          });
        updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
      }
    });

    $('.dc-input').keypress(function (e) {
      if (e.which == 13) {
        var dcId = $(this)[0].id[$(this)[0].id.length - 1];
        var val = parseFloat($('#dc-input-' + dcId).val());

        if (val > 1) {
          val = 1;
        } else if (val < 0) {
          val = 0;
        }

        $(this).val(val);
        $($('#dc-checkbox-' + dcId)).prop('checked', true);
        $('#doiCompId-' + dcId).find('.dc-label').css('opacity', 0.7);
        d3.select('#doiCompId-' + dcId).select('.doiCompHandle')
          .classed('blendedDoiComp', false);
        d3.select('#doiCompId-' + dcId).select('.doiCompLine')
          .style('display', 'inline');
        provvisDecl.DoiFactors.set(
          d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

        var accVal = d3.values(provvisDecl.DoiFactors.factors)
          .filter(function (dc, i) {
            return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);
          })
          .map(function (dc) {
            return dc.value;
          })
          .reduce(function (accVal, cur) {
            return accVal + cur;
          });

        var tar = parseFloat(1 - val);

        d3.values(provvisDecl.DoiFactors.factors).forEach(function (dc, i) {
          if (i != dcId && provvisDecl.DoiFactors.isMasked(dc.label)) {
            var isMasked = $('#dc-checkbox-' + i)[0].checked;
            provvisDecl.DoiFactors.set(
              d3.keys(provvisDecl.DoiFactors.factors)[i],
              (dc.value / accVal) * tar, isMasked);
            $('#dc-input-' + i).val((dc.value / accVal) * tar);
          }
        });
        updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
      }
    });

    $('#prov-doi-view-apply').on('click', function () {
      /* Recompute doi. */
      recomputeDOI();
    });

    $('#prov-doi-view-reset').on('click', function () {
      var val = parseFloat(1 / d3.values(provvisDecl.DoiFactors.factors)
          .filter(function (dc, i) {
            return provvisDecl.DoiFactors.isMasked(dc.label);
          }).length);

      d3.values(provvisDecl.DoiFactors.factors)
        .forEach(function (dc, i) {
          if (!provvisDecl.DoiFactors.isMasked(dc.label)) {
            $('#dc-input-' + i).val(0.0);
            provvisDecl.DoiFactors.set(
              d3.keys(provvisDecl.DoiFactors.factors)[i], 0.0, false);
          } else {
            $('#dc-input-' + i).val(val);
            provvisDecl.DoiFactors.set(
              d3.keys(provvisDecl.DoiFactors.factors)[i], val, true);
          }
        });
      updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
    });

    /* Toggle DOI auto update. */
    $('#prov-doi-trigger').click(function () {
      if ($(this).find('input[type=\'checkbox\']').prop('checked')) {
        doiAutoUpdate = true;
      } else {
        doiAutoUpdate = false;
      }
    });

    /* Show and hide doi labels. */
    $('#prov-doi-view-show').click(function () {
      if ($(this).find('input[type=\'checkbox\']').prop('checked')) {
        d3.selectAll('.nodeDoiLabel').style('display', 'inline');
      } else {
        d3.selectAll('.nodeDoiLabel').style('display', 'none');
      }
    });
  };

  /**
   * Reset css for all links.
   */
  var clearHighlighting = function () {
    hLink.classed('hiddenLink', true);
    link.each(function (l) {
      l.highlighted = false;
    });

    domNodeset.each(function (n) {
      n.highlighted = false;
      n.doi.highlightedChanged();
    });
  };

  /* TODO: Layer link highlighting. */
  /**
   * Get predecessing nodes for highlighting the path by the current
   * node selection.
   * @param n BaseNode extending constructor function.
   */
  var highlightPredPath = function (n) {
    /* Current node is highlighted. */
    n.highlighted = true;
    n.doi.highlightedChanged();

    /* Parent nodes are highlighted too. */
    var pn = n.parent;
    while (pn instanceof provvisDecl.BaseNode === true) {
      pn.highlighted = true;
      pn.doi.highlightedChanged();
      pn = pn.parent;
    }

    if (n instanceof provvisDecl.Layer) {
      n.children.values().forEach(function (an) {
        an.predLinks.values().forEach(function (l) {
          l.highlighted = true;
          l.hidden = false;
          d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);

          highlightPredPath(l.source);
        });
      });
    } else {
      /* Get svg link element, and for each predecessor call recursively. */
      n.predLinks.values().forEach(function (l) {
        l.highlighted = true;
        if (!l.hidden) {
          d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
        }
        highlightPredPath(l.source);
      });
    }
  };

  /**
   * Get succeeding nodes for highlighting the path by the current
   * node selection.
   * @param n BaseNode extending constructor function.
   */
  var highlightSuccPath = function (n) {
    /* Current node is highlighted. */
    n.highlighted = true;
    n.doi.highlightedChanged();

    /* Parent nodes are highlighted too. */
    var pn = n.parent;
    while (pn instanceof provvisDecl.BaseNode === true) {
      pn.highlighted = true;
      pn.doi.highlightedChanged();
      pn = pn.parent;
    }

    if (n instanceof provvisDecl.Layer) {
      n.children.values().forEach(function (an) {
        an.succLinks.values().forEach(function (l) {
          l.highlighted = true;
          l.hidden = false;
          d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);

          highlightSuccPath(l.target);
        });
      });
    } else {
      /* Get svg link element, and for each successor call recursively. */
      n.succLinks.values().forEach(function (l) {
        l.highlighted = true;
        if (!l.hidden) {
          d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
        }

        highlightSuccPath(l.target);
      });
    }
  };

  /**
   * Update analysis links.
   * @param graph The provenance graph.
   */
  var updateAnalysisLinks = function (graph) {
    /* Data join. */
    var ahl = vis.canvas.select('g.aHLinks').selectAll('.hLink')
      .data(graph.aLinks);

    /* Enter. */
    ahl.enter().append('path')
      .classed({
        'hLink': true
      })
      .classed('blendedLink', function () {
        return filterAction === 'blend' ? true : false;
      }).classed('filteredLink', function (l) {
      return l.filtered;
    }).classed('hiddenLink', function (l) {
      return !l.highlighted;
    }).attr('id', function (l) {
      return 'hLinkId-' + l.autoId;
    });

    /* Enter and update. */
    ahl.attr('d', function (l) {
      var srcCoords = getVisibleNodeCoords(l.source);
      var tarCoords = getVisibleNodeCoords(l.target);
      if (linkStyle === 'bezier1') {
        return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
          tarCoords.y);
      } else {
        return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
          tarCoords.y);
      }
    }).classed('blendedLink', function (l) {
      return !l.filtered && filterAction === 'blend' ? true : false;
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
    hLink = d3.selectAll('.hLink');

    /* Data join */
    var al = vis.canvas.select('g.aLinks').selectAll('.link')
      .data(graph.aLinks);

    /* Enter. */
    al.enter().append('path')
      .classed({
        'link': true,
        'aLink': true
      })
      .classed('blendedLink', function (l) {
        return !l.filtered && filterAction === 'blend' ? true : false;
      }).classed('filteredLink', function (l) {
      return l.filtered;
    }).classed('hiddenLink', function (l) {
      return l.hidden;
    }).attr('id', function (l) {
      return 'linkId-' + l.autoId;
    });

    /* Enter and update. */
    al.attr('d', function (l) {
      var srcCoords = getVisibleNodeCoords(l.source);
      var tarCoords = getVisibleNodeCoords(l.target);
      if (linkStyle === 'bezier1') {
        return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
          tarCoords.y);
      } else {
        return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
          tarCoords.y);
      }
    }).classed('blendedLink', function (l) {
      return !l.filtered && filterAction === 'blend' ? true : false;
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
    aLink = d3.selectAll('.aLink');
    link = d3.selectAll('.link');
  };

  /**
   * Creates a linear time scale ranging from the first to the last analysis
   * created.
   * @param aNodes Analysis nodes.
   * @param range Linear color scale for domain values.
   */
  var createAnalysistimeColorScale = function (aNodes, range) {
    var min = d3.min(aNodes, function (d) {
      return parseISOTimeFormat(d.start);
    });
    var max = d3.max(aNodes, function (d) {
      return parseISOTimeFormat(d.start);
    });

    return d3.time.scale()
      .domain([min, max])
      .range([range[0], range[1]]);
  };

  /**
   * Draw layered nodes.
   * @param lNodes Layer nodes.
   */
  var updateLayerNodes = function (lNodes) {
    /* Data join. */
    var ln = vis.canvas.select('g.layers').selectAll('.layer')
      .data(lNodes.values());

    /* Enter. */
    var lEnter = ln.enter().append('g')
      .classed({
        'layer': true
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
        return timeColorScale(parseISOTimeFormat(latestDate));
      })
      .attr('stop-opacity', 1);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', function (l) {
        var earliestDate = d3.max(l.children.values(), function (d) {
          return d.start;
        });
        return timeColorScale(parseISOTimeFormat(earliestDate));
      })
      .attr('stop-opacity', 1);

    /* Draw bounding box. */
    lBBox = lEnter.append('g')
      .attr('id', function (ln) {
        return 'BBoxId-' + ln.autoId;
      }).classed({
      'lBBox': true,
      'BBox': true,
      'hiddenBBox': false
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
      .attr('id', function (ln) {
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
      'labels': true
    })
      .attr('clip-path', function (ln) {
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
    lDiff.each(function (ln) {
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
      'lNode': true,
      'filteredNode': true,
      'blendedNode': false,
      'selectedNode': false
    })
      .classed({
        'hiddenNode': function (an) {
          return an.hidden;
        }
      });

    lEnter.append('g').classed({
      'children': true
    });

    var lGlyph = layerNode.append('g').classed({
      'glyph': true
    });
    var lLabels = layerNode.append('g').classed({
      'labels': true
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

    lGlyph.each(function (ln) {
      if (getLayerPredCount(ln) > 0) {
        d3.select(this).append('g').classed({
          'glAnchor': true
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
          'llAnchor': true
        });
      }
    });

    lGlyph.each(function (ln) {
      if (getLayerSuccCount(ln) > 0) {
        d3.select(this).append('g').classed({
          'grAnchor': true
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
          'rlAnchor': true
        });
      }
    });

    lGlyph.each(function (ln) {
      if (getLayerPredCount(ln) > 1) {
        d3.select(this).select('g.glAnchor').append('text')
          .attr('transform', function () {
            return 'translate(' + (-2.8 * scaleFactor * vis.radius) + ',' +
            0.5 + ')';
          })
          .text(function () {
            return getLayerPredCount(ln);
          }).attr('class', 'lLabel');
      }
    });

    lGlyph.each(function (ln) {
      if (getLayerSuccCount(ln) > 1) {
        d3.select(this).select('g.grAnchor').append('text')
          .attr('transform', function () {
            return 'translate(' + (2.8 * scaleFactor * vis.radius) + ',' +
            0.5 + ')';
          })
          .text(function () {
            return getLayerSuccCount(ln);
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
      'fill': function (d) {
        return 'url(#layerGradientId-' + d.autoId + ')';
      }
    }).classed({
      'lGlyph': true
    });

    /* Add text labels. */
    lLabels.append('text')
      .text(function (d) {
        return d.doi.doiWeightedSum;
      }).attr('class', 'nodeDoiLabel')
      .style('display', 'none');

    lLabels.append('g')
      .classed({
        'wfLabel': true
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
        'fill': function (l) {
          var latestDate = d3.min(l.children.values(), function (d) {
            return d.start;
          });
          return timeColorScale(parseISOTimeFormat(latestDate)) < '#888888' ?
            '#ffffff' : '#000000';
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
        'fill': function (l) {
          var latestDate = d3.min(l.children.values(), function (d) {
            return d.start;
          });
          return timeColorScale(parseISOTimeFormat(latestDate)) < '#888888' ?
            '#ffffff' : '#000000';
        }
      });

    /* Enter and update. */
    var lUpdate = ln.attr('id', function (d) {
      return 'gNodeId-' + d.autoId;
    }).attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });

    /* TODO: Implements update parameters. */

    /* Exit. */
    ln.exit().remove();

    /* Set dom elements. */
    layer = vis.canvas.select('g.layers').selectAll('.layer');
    lNode = d3.selectAll('.lNode');
    lBBox = d3.selectAll('.lBBox');
  };

  /**
   * Draw layered nodes.
   * @param lLinks Layer links.
   */
  var updateLayerLinks = function (lLinks) {
    /* Data join. */
    var ln = vis.canvas.select('g.lLinks').selectAll('.link')
      .data(lLinks.values());

    /* Enter. */
    ln.enter().append('path')
      .classed({
        'link': true,
        'lLink': true
      })
      .attr('id', function (d) {
        return 'linkId-' + d.autoId;
      }).classed('blendedLink', function (l) {
      return !l.filtered && filterAction === 'blend' ? true : false;
    }).classed('filteredLink', function (l) {
      return l.filtered;
    }).classed('hiddenLink', function (l) {
      return l.hidden;
    }).attr('id', function (l) {
      return 'linkId-' + l.autoId;
    });

    /* Enter and update. */
    ln.attr('d', function (l) {
      var srcCoords = getVisibleNodeCoords(l.source);
      var tarCoords = getVisibleNodeCoords(l.target);

      if (linkStyle === 'bezier1') {
        return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
          tarCoords.y);
      } else {
        return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x,
          tarCoords.y);
      }
    }).classed({
      'link': true,
      'lLink': true
    })
      .attr('id', function (d) {
        return 'linkId-' + d.autoId;
      }).classed('blendedLink', function (l) {
      return !l.filtered && filterAction === 'blend' ? true : false;
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
    lLink = vis.canvas.select('g.lLinks').selectAll('.link');
  };

  /**
   * Draw analysis nodes.
   */
  var updateAnalysisNodes = function () {
    /* Data join. */
    var lAnalysis = d3.select('g.analyses').selectAll('.analysis')
      .data(vis.graph.aNodes.sort(function (a, b) {
        return parseISOTimeFormat(a.start) - parseISOTimeFormat(b.start);
      }));

    /* Enter and update. */
    var anUpdate = lAnalysis.attr('id', function (d) {
      return 'gNodeId-' + d.autoId;
    });

    anUpdate.attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    }).style('fill', function (d) {
      return timeColorScale(parseISOTimeFormat(d.start));
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
      'aBBox': true,
      'BBox': true,
      'hiddenBBox': true
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
    analysisBBox.select('g').classed({
      'labels': true
    })
      .attr('clip-path', function (an) {
        return 'url(#aBBClipId-' + an.autoId + ')';
      })
      .select('text')
      .attr('transform', function () {
        return 'translate(' + 1 * scaleFactor * vis.radius + ',' +
        0 * scaleFactor * vis.radius + ')';
      })
      .text(function (d) {
        return '\uf013' + ' ' + d.wfCode;
      }).classed('aBBoxLabel', true).style({
      'font-family': 'FontAwesome'
    });

    /* Draw analysis node. */
    analysisNode = anUpdate.select('g')
      .attr('id', function (an) {
        return 'nodeId-' + an.autoId;
      })
      .classed({
        'aNode': true,
        'filteredNode': true,
        'blendedNode': false,
        'selectedNode': false
      })
      .classed({
        'hiddenNode': function (an) {
          return an.hidden;
        }
      });

    anUpdate.select('g').classed({
      'children': true
    });

    aGlyph = analysisNode.select('g.glyph');
    aLabels = analysisNode.select('g.labels')
      .attr('clip-path', function (an) {
        return 'url(#bbClipId-' + an.autoId + ')';
      });

    scaleFactor = 0.75;

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
      return timeColorScale(parseISOTimeFormat(d.start));
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
      'aBBox': true,
      'BBox': true,
      'hiddenBBox': true
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
    analysisBBox.append('g').classed({
      'labels': true
    })
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
      }).classed('aBBoxLabel', true).style({
      'font-family': 'FontAwesome'
    });

    /* Draw analysis node. */
    var analysisNode = anEnter.append('g')
      .attr('id', function (an) {
        return 'nodeId-' + an.autoId;
      })
      .classed({
        'aNode': true,
        'filteredNode': true,
        'blendedNode': false,
        'selectedNode': false
      })
      .classed({
        'hiddenNode': function (an) {
          return an.hidden;
        }
      });

    anEnter.append('g').classed({
      'children': true
    });

    var aGlyph = analysisNode.append('g').classed({
      'glyph': true
    });
    var aLabels = analysisNode.append('g').classed({
      'labels': true
    })
      .attr('clip-path', function (an) {
        return 'url(#bbClipId-' + an.autoId + ')';
      });

    aGlyph.each(function (an) {
      if (an.predLinks.size() > 0) {
        d3.select(this).append('g').classed({
          'glAnchor': true
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
          'laAnchor': true
        });
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
        d3.select(this).append('g').classed({
          'grAnchor': true
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
          'raAnchor': true
        });
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
        'aGlyph': true
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
      }).text(function () {
      return '\uf085';
    }).classed('an-node-type-icon', true)
      .style({
        'fill': function (an) {
          return timeColorScale(parseISOTimeFormat(an.start)) < '#888888' ?
            '#ffffff' : '#000000';
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
        'fill': function (an) {
          return timeColorScale(parseISOTimeFormat(an.start)) < '#888888' ?
            '#ffffff' : '#000000';
        }
      });

    /* Exit. */
    lAnalysis.exit().remove();

    /* Set dom elements. */
    analysis = vis.canvas.select('g.analyses').selectAll('.analysis');
    aNode = d3.selectAll('.aNode');
    aBBox = d3.selectAll('.aBBox');
  };

  /**
   * Draws the subanalalysis containing links.
   * @param san Subanalysis node.
   */
  var drawSubanalysisLinks = function (san) {
    /* Draw highlighting links. */
    /* Data join. */
    var sahl = d3.select('#gNodeId-' + san.autoId)
      .select('g.saHLinks').selectAll('.hLink')
      .data(san.links.values());

    /* Enter and update. */
    sahl.attr('d',
      function (l) {
        if (linkStyle === 'bezier1') {
          return drawBezierLink(l, l.source.x, l.source.y, l.target.x,
            l.target.y);
        } else {
          return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
            l.target.y);
        }
      }).classed({
      'hLink': true,
      'hiddenLink': true
    }).attr('id', function (l) {
      return 'hLinkId-' + l.autoId;
    });

    /* Enter. */
    sahl.enter().append('path')
      .attr('d', function (l) {
        if (linkStyle === 'bezier1') {
          return drawBezierLink(l, l.source.x, l.source.y, l.target.x,
            l.target.y);
        } else {
          return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
            l.target.y);
        }
      })
      .classed({
        'hLink': true,
        'hiddenLink': true
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
      } else {
        return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
          l.target.y);
      }
    }).classed({
      'link': true,
      'saLink': true,
      'hiddenLink': true
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
        } else {
          return drawStraightLink(l, l.source.x, l.source.y, l.target.x,
            l.target.y);
        }
      }).classed({
      'link': true,
      'saLink': true,
      'hiddenLink': true
    })
      .attr('id', function (l) {
        return 'linkId-' + l.autoId;
      });

    /* Exit. */
    sal.exit().remove();
  };

  /**
   * Draw subanalysis nodes.
   * @param saNodes Subanalysis nodes.
   */
  var drawSubanalysisNodes = function () {
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

      saEnter.each(function (san) {
        var self = d3.select(this);
        /* Draw links for each subanalysis. */

        d3.select('#gNodeId-' + san.autoId).append('g')
          .classed({
            'saHLinks': true
          });
        d3.select('#gNodeId-' + san.autoId).append('g')
          .classed({
            'saLinks': true
          });
        drawSubanalysisLinks(san);

        /* Compute bounding box for subanalysis child nodes. */
        var saBBoxCoords = getWFBBoxCoords(san, 0);

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
          'saBBox': true,
          'BBox': true,
          'hiddenBBox': true
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
          'saNode': true,
          'filteredNode': true,
          'blendedNode': false,
          'selectedNode': false
        })
          .classed({
            'hiddenNode': function (san) {
              return san.hidden;
            }
          });

        self.append('g').classed({
          'children': true
        });

        var saGlyph = subanalysisNode.append('g').classed({
          'glyph': true
        });
        var saLabels = subanalysisNode.append('g').classed({
          'labels': true
        })
          .attr('clip-path', 'url(#bbClipId-' + san.autoId + ')');

        saGlyph.each(function (san) {
          if (san.predLinks.size() > 0) {
            d3.select(this).append('g')
              .classed({
                'glAnchor': true
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
              'lsaAnchor': true
            });
          }
        });

        saGlyph.each(function (san) {
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

        saGlyph.each(function (san) {
          if (san.succLinks.size() > 0) {
            saGlyph.append('g').classed({
              'grAnchor': true
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
              'rsaAnchor': true
            });
          }
        });

        saGlyph.each(function (san) {
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
            'fill': function (san) {
              return timeColorScale(parseISOTimeFormat(san.parent.start)) <
              '#888888' ? '#ffffff' : '#000000';
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
            'fill': function (san) {
              return timeColorScale(parseISOTimeFormat(san.parent.start)) <
              '#888888' ? '#ffffff' : '#000000';
            }
          });
      });
    });

    /* Set dom elements. */
    saNode = d3.selectAll('.saNode');
    subanalysis = d3.selectAll('.subanalysis');
    saBBox = d3.selectAll('.saBBox');

    saLink = d3.selectAll('.saLink');
    link = d3.selectAll('.link');
    hLink = d3.selectAll('.hLink');
  };

  /**
   * Draw nodes.
   * @param nodes All nodes within the graph.
   */
  var drawNodes = function () {
    subanalysis.each(function (san) {
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

      node.each(function (d) {
        var self = d3.select(this);
        self.attr('class', function (d) {
          return 'node ' + d.nodeType + 'Node';
        }).attr('id', function (d) {
          return 'nodeId-' + d.autoId;
        }).classed('blendedNode', function (l) {
          return !l.filtered && filterAction === 'blend' ? true : false;
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
          'glyph': true
        });
        var nLabels = self.append('g').classed({
          'labels': true
        })
          .attr('clip-path', 'url(#bbClipId-' + d.autoId + ')');

        nGlyph.each(function (n) {
          if (n.predLinks.size() > 0) {
            d3.select(this).append('g')
              .classed({
                'glAnchor': true
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
              'lnAnchor': true
            });
          }
        });

        nGlyph.each(function (n) {
          if (n.succLinks.size() > 0) {
            nGlyph.append('g').classed({
              'grAnchor': true
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
              'rnAnchor': true
            });
          }
        });

        if (d.nodeType === 'raw' || d.nodeType === 'intermediate' ||
          d.nodeType === 'stored') {
          nGlyph
            .append('circle')
            .attr('r', function (d) {
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
          .text(function (d) {
            return d.doi.doiWeightedSum;
          }).attr('class', 'nodeDoiLabel')
          .style('display', 'none');

        nLabels.each(function (d) {
          d3.select(this).append('text')
            .attr('transform', function () {
              return 'translate(' + (-1.5 * scaleFactor * vis.radius) + ',' +
              (-1.5 * scaleFactor * vis.radius) + ')';
            })
            .text(function (d) {
              var nodeAttrLabel = '';

              if (d.nodeType === 'stored') {
                nodeAttrLabel = d.attributes.get('name');
              } else {
                /* Trim data transformation node names for
                 testtoolshed repo.*/
                if (d.nodeType === 'dt') {
                  if (d.name.indexOf(': ') > 0) {
                    var firstPart = d.name.substr(d.name.indexOf(': ') + 2, d.name.length - d.name.indexOf(': ') - 2);
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

        nLabels.each(function (d) {
          if (d.nodeType === 'stored') {

            d3.select(this).append('text')
              .text(function () {
                return '\uf0f6';
              })
              .classed('stored-node-type-icon', true)
              .style({
                'fill': function (n) {
                  return timeColorScale(parseISOTimeFormat(
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
  };

  /**
   * Compute bounding box for child nodes.
   * @param n BaseNode.
   * @param offset Cell offset.
   * @returns {{x: {min: *, max: *}, y: {min: *, max: *}}} Min and
   * max x, y coords.
   */
  var getWFBBoxCoords = function (n, offset) {
    var minX;
    var minY;
    var maxX;
    var maxY = 0;

    if (n.children.empty() || !n.hidden) {
      minX = (-cell.width / 2 + offset);
      maxX = (cell.width / 2 - offset);
      minY = (-cell.width / 2 + offset);
      maxY = (cell.width / 2 - offset);
    } else {
      minX = d3.min(n.children.values(), function (d) {
        return d.x - cell.width / 2 + offset;
      });
      maxX = d3.max(n.children.values(), function (d) {
        return d.x + cell.width / 2 - offset;
      });
      minY = d3.min(n.children.values(), function (d) {
        return d.y - cell.height / 2 + offset;
      });
      maxY = d3.max(n.children.values(), function (d) {
        return d.y + cell.height / 2 - offset;
      });
    }

    return {
      x: {
        min: minX,
        max: maxX
      },
      y: {
        min: minY,
        max: maxY
      }
    };
  };

  /**
   * Compute bounding box for expanded analysis nodes.
   * @param an Analysis node.
   * @param offset Cell offset.
   * @returns {{x: {min: number, max: number}, y: {min: number, max: number}}}
   * Min and max x, y coords.
   */
  var getABBoxCoords = function (an, offset) {
    if (!offset) {
      offset = 0;
    }

    var minX = !an.hidden ? an.x : d3.min(an.children.values(), function (san) {
      return !san.hidden ? an.x + san.x : d3.min(san.children.values(),
        function (cn) {
          return !cn.hidden ? an.x + san.x + cn.x : an.x;
        });
    });
    var maxX = !an.hidden ? an.x : d3.max(an.children.values(), function (san) {
      return !san.hidden ? an.x + san.x : d3.max(san.children.values(),
        function (cn) {
          return !cn.hidden ? an.x + san.x + cn.x : an.x;
        });
    });
    var minY = !an.hidden ? an.y : d3.min(an.children.values(), function (san) {
      return !san.hidden ? an.y + san.y : d3.min(san.children.values(),
        function (cn) {
          return !cn.hidden ? an.y + san.y + cn.y : an.y;
        });
    });
    var maxY = !an.hidden ? an.y : d3.max(an.children.values(), function (san) {
      return !san.hidden ? an.y + san.y : d3.max(san.children.values(),
        function (cn) {
          return !cn.hidden ? an.y + san.y + cn.y : an.y;
        });
    });

    return {
      x: {
        min: minX + offset,
        max: maxX + cell.width - offset
      },
      y: {
        min: minY + offset,
        max: maxY + cell.height - offset
      }
    };
  };

  /**
   * Dagre layout including layer nodes.
   * @param graph The provenance graph.
   */
  var dagreLayerLayout = function (graph) {
    var g = new dagre.graphlib.Graph();

    g.setGraph({
      rankdir: 'LR',
      nodesep: 0,
      edgesep: 0,
      ranksep: 0,
      marginx: 0,
      marginy: 0
    });

    g.setDefaultEdgeLabel(function () {
      return {};
    });

    var curWidth = 0;
    var curHeight = 0;

    graph.lNodes.values().forEach(function (ln) {
      curWidth = vis.cell.width;
      curHeight = vis.cell.height;

      g.setNode(ln.autoId, {
        label: ln.autoId,
        width: curWidth,
        height: curHeight
      });
    });

    graph.lLinks.values().forEach(function (l) {
      g.setEdge(l.source.autoId, l.target.autoId, {
        minlen: 1,
        weight: 1,
        width: 0,
        height: 0,
        labelpos: 'r',
        labeloffset: 0
      });
    });

    dagre.layout(g);

    var dlLNodes = d3.entries(g._nodes);
    graph.lNodes.values().forEach(function (ln) {
      curWidth = vis.cell.width;
      curHeight = vis.cell.height;

      ln.x = dlLNodes.filter(function (d) {
          return d.key === ln.autoId.toString();
        })[0].value.x - curWidth / 2;

      ln.y = dlLNodes.filter(function (d) {
          return d.key === ln.autoId.toString();
        })[0].value.y - curHeight / 2;

      updateNodeAndLink(ln, d3.select('#gNodeId-' + ln.autoId));
    });
  };

  /* TODO: Code cleanup. */
  /**
   * Dynamic Dagre layout.
   * @param graph The provenance Graph.
   */
  var dagreDynamicLayerLayout = function (graph) {
    /* Initializations. */
    var g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: 'LR',
      nodesep: 1 * scaleFactor * vis.radius,
      edgesep: 0,
      ranksep: 4 * scaleFactor * vis.radius,
      marginx: 0,
      marginy: 0
    });
    g.setDefaultEdgeLabel(function () {
      return {};
    });
    var anBBoxCoords = {};
    var curWidth = 0;
    var curHeight = 0;
    var exNum = 0;
    var accY = 0;

    /* Add layer or analysis nodes with a dynamic bounding box size
     * (based on visible child nodes). */
    graph.lNodes.values().forEach(function (ln) {
      d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', true);
      if (!ln.hidden) {
        if (ln.filtered) {
          d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', false);
        }
        curWidth = vis.cell.width;
        curHeight = vis.cell.height;

        /* Check exaggerated layer children. */
        /* Add visible dimensions to layer node without bounding boxes. */
        /* Based on current y-coord order, the stack of nodes will be drawn
         vertically. */
        /* Child nodes inherit x-coord of layer node and y-coord will be
         computed based on the statement above.*/
        /* Layer node number labels may be updated. */
        /* Maybe add a bounding box for layered node and exaggerated nodes.*/

        exNum = 0;
        accY = ln.y + vis.cell.height;
        ln.children.values().filter(function (an) {
          return an.filtered || filterAction === 'blend';
        }).sort(function (a, b) {
          return a.y - b.y;
        }).forEach(function (an) {
          if (an.exaggerated && an.filtered) {
            exNum++;
            an.x = an.parent.x;
            an.y = accY;
            accY += (getABBoxCoords(an, 0).y.max - getABBoxCoords(an, 0).y.min);

            updateNodeAndLink(an, d3.select('#gNodeId-' + an.autoId));
            d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', false);
            d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
          } else {
            an.x = an.parent.x;
            an.y = an.parent.y;
          }
        });

        /* Set layer label and bounding box. */
        var numChildren = ln.children.values().filter(function (an) {
          return an.filtered || filterAction === 'blend';
        }).length;
        d3.select('#nodeId-' + ln.autoId).select('g.labels').select('.lnLabel')
          .text(function () {
            return numChildren - exNum + '/' + ln.children.size();
          });

        /* Get potential expanded bounding box size. */
        var accHeight = curHeight;
        var accWidth = curWidth;
        ln.children.values().filter(function (an) {
          return an.filtered || filterAction === 'blend';
        }).forEach(function (an) {
          if (an.exaggerated) {
            anBBoxCoords = getABBoxCoords(an, 0);
            if (anBBoxCoords.x.max - anBBoxCoords.x.min > accWidth) {
              accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
            }
            accHeight += anBBoxCoords.y.max - anBBoxCoords.y.min;
          }
        });

        d3.select('#lBBClipId-' + ln.autoId)
          .select('rect')
          .attr('width', accWidth)
          .attr('height', accHeight);

        d3.select('#BBoxId-' + ln.autoId).attr('transform',
          'translate(' + (-accWidth / 2) + ',' +
          (-vis.cell.height / 2) + ')')
          .select('rect')
          .attr('width', accWidth)
          .attr('height', accHeight);

        g.setNode(ln.autoId, {
          label: ln.autoId,
          width: accWidth,
          height: accHeight
        });
      } else {
        ln.children.values().filter(function (an) {
          return an.filtered || filterAction === 'blend';
        }).forEach(function (an) {
          anBBoxCoords = getABBoxCoords(an, 0);
          curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
          curHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;
          g.setNode(an.autoId, {
            label: an.autoId,
            width: curWidth,
            height: curHeight
          });
        });
      }
    });

    /* Add layer-to-layer links. */
    graph.lLinks.values().forEach(function (ll) {
      if (!ll.hidden) {
        g.setEdge(ll.source.autoId, ll.target.autoId, {
          minlen: 1,
          weight: 1,
          width: 0,
          height: 0,
          labelpos: 'r',
          labeloffset: 0
        });
      }
    });

    /* Add analysis-mixed links. */
    graph.aLinks.forEach(function (l) {
      if (!l.hidden) {

        /* Either the layer or the analysis is visible and therefore
         virtual links are created.*/
        var src = l.source.parent.parent.parent.autoId;
        var tar = l.target.parent.parent.parent.autoId;
        if (l.source.parent.parent.parent.hidden) {
          src = l.source.parent.parent.autoId;
        }
        if (l.target.parent.parent.parent.hidden) {
          tar = l.target.parent.parent.autoId;
        }

        g.setEdge(src, tar, {
          minlen: 1,
          weight: 1,
          width: 0,
          height: 0,
          labelpos: 'r',
          labeloffset: 0
        });
      }
    });

    /* Compute layout. */
    dagre.layout(g);

    /* Set layer and analysis coords. */
    layoutCols = d3.map();
    var accWidth = 0;
    var accHeight = 0;

    /* Assign x and y coords for layers or analyses. Check filter action
     as well as exaggerated nodes. */
    d3.map(g._nodes).values().forEach(function (n) {
      if (typeof n !== 'undefined') {
        if (graph.lNodes.has(n.label) && (graph.lNodes.get(n.label).filtered ||
          filterAction === 'blend')) {
          var ln = graph.lNodes.get(n.label);
          accHeight = vis.cell.height;
          accWidth = vis.cell.width;

          ln.children.values().filter(function (an) {
            return an.filtered || filterAction === 'blend';
          }).forEach(function (an) {
            if (an.exaggerated) {
              anBBoxCoords = getABBoxCoords(an, 0);
              if (anBBoxCoords.x.max - anBBoxCoords.x.min > accWidth) {
                accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
              }
              accHeight += anBBoxCoords.y.max - anBBoxCoords.y.min;
            }
          });

          ln.x = n.x - vis.cell.width / 2;
          ln.y = n.y - accHeight / 2;

          exNum = 0;
          accY = ln.y + vis.cell.height;
          ln.children.values().filter(function (an) {
            return an.filtered || filterAction === 'blend';
          }).sort(function (a, b) {
            return a.y - b.y;
          }).forEach(function (an) {
            anBBoxCoords = getABBoxCoords(an, 0);
            curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
            an.x = ln.x - curWidth / 2 + vis.cell.width / 2;

            if (an.exaggerated) {
              an.y = accY;
              accY += (getABBoxCoords(an, 0).y.max -
              getABBoxCoords(an, 0).y.min);
            } else {
              an.y = an.parent.y;
            }
          });
        } else {
          var an = graph.aNodes.filter(function (an) {
            return an.autoId === n.label && (an.filtered ||
            filterAction === 'blend');
          })[0];

          if (an && typeof an !== 'undefined') {
            anBBoxCoords = getABBoxCoords(an, 0);
            accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
            accHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;

            an.x = n.x - accWidth / 2;
            an.y = n.y - accHeight / 2;
          }
        }

        /* Compute layouted columns. */
        if (layoutCols.has(n.x)) {
          layoutCols.get(n.x).nodes.push(n.label);
        } else {
          layoutCols.set(n.x, {
            nodes: [],
            width: 0
          });
          layoutCols.get(n.x).nodes.push(n.label);
        }
        if (accWidth > layoutCols.get(n.x).width) {
          layoutCols.get(n.x).width = accWidth;
        }
      }
    });

    /* Update graph dom elements. */
    vis.graph.lNodes.values().forEach(function (ln) {
      updateNodeAndLink(ln, d3.select('#gNodeId-' + ln.autoId));
    });

    /* Reorder node columns by y-coords. */
    layoutCols.values().forEach(function (c) {
      c.nodes = c.nodes.sort(function (a, b) {
        return a.y - b.y;
      });
    });
  };

  /* TODO: Code cleanup. */
  /* TODO: Add transitions to bounding boxes. */
  /**
   * Sets the visibility of links and (a)nodes when collapsing or expanding
   * analyses.
   * @param d Node.
   * @param keyStroke Keystroke being pressed at mouse click.
   * @param trigger Function triggered by user interaction or automatic
   * doi-function.
   */
  var handleCollapseExpandNode = function (d, keyStroke, trigger) {
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
        hideChildNodes(cn);
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
        wfBBoxCoords = getWFBBoxCoords(d, 0);
        d.x = 0;
        updateLink(d.parent);
        updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);

        /* Shift sibling subanalyses vertical. */
        siblings = d.parent.children.values().filter(function (san) {
          return san !== d && san.y > d.y;
        });
        siblings.forEach(function (san) {
          san.y += wfBBoxCoords.y.max - wfBBoxCoords.y.min - cell.height;
          updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
        });

        /* Adjust analysis bounding box. */
        anBBoxCoords = getABBoxCoords(d.parent, 0);
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
          updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
        });
        updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);
      } else if (d.nodeType === 'analysis') {

        /* Adjust analysis bounding box. */
        anBBoxCoords = getABBoxCoords(d, 0);
        d3.select('#BBoxId-' + d.autoId).select('rect')
          .attr('width', function () {
            return anBBoxCoords.x.max - anBBoxCoords.x.min;
          })
          .attr('height', function () {
            return anBBoxCoords.y.max - anBBoxCoords.y.min;
          });

        /* Update. */
        updateLink(d);
        updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);
      } else {
        d.children.values().filter(function (an) {
          return an.filtered;
        }).forEach(function (an) {
          d3.select('#BBoxId-' + an.autoId).classed({
            'hiddenBBox': false
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
          anBBoxCoords = getABBoxCoords(an, 0);
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
        updateLink(d);
        updateNode(d3.select('#gNodeId-' + d.autoId), d, d.x, d.y);
      }

    } else if (keyStroke === 'c' && d.nodeType !== 'layer') {
      /* Collapse. */

      /* Collapse subanalyses. */
      if (d.nodeType === 'subanalysis') {
        d.parent.children.values().forEach(function (san) {
          d3.select('#BBoxId-' + san.autoId).classed({
            'hiddenBBox': true
          });
        });

      } else if (d.nodeType === 'analysis') {
        d.parent.children.values().forEach(function (an) {
          d3.select('#BBoxId-' + an.autoId).classed({
            'hiddenBBox': true
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
          'hiddenBBox': false
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
          wfBBoxCoords = getWFBBoxCoords(d.parent, 0);
          siblings = d.parent.parent.children.values().filter(function (san) {
            return san !== d.parent && san.y > d.parent.y;
          });
          siblings.forEach(function (san) {
            san.y -= wfBBoxCoords.y.max - wfBBoxCoords.y.min - cell.height;
            updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
          });

          if (d.parent.parent.children.values().filter(function (san) {
              return san !== d.parent;
            }).some(function (san) {
              return san.hidden;
            })) {
            anBBoxCoords = getABBoxCoords(d.parent.parent, 0);
            d.parent.x = (anBBoxCoords.x.max - anBBoxCoords.x.min) / 2 -
              vis.cell.width / 2;
            updateNode(d3.select('#gNodeId-' + d.parent.autoId),
              d.parent, d.parent.x, d.parent.y);
          }

          if (d.parent.parent.children.values().filter(function (san) {
              return san !== d.parent;
            }).every(function (san) {
              return !san.hidden;
            })) {
            d.parent.parent.children.values().forEach(function (san) {
              san.x = 0;
              updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x,
                san.y);
            });
          }
        }

      }

      /* Set node visibility. */
      d.parent.hidden = false;
      d3.select('#nodeId-' + d.parent.autoId).classed('hiddenNode', false);
      hideChildNodes(d.parent);

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
        updateLink(d.parent);

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

        updateLink(d.parent);
        updateNode(d3.select('#gNodeId-' + d.parent.autoId), d.parent,
          d.parent.x, d.parent.y);
      } else {
        /* Set saBBox visibility. */
        d3.select('#BBoxId-' + d.parent.autoId).classed('hiddenBBox', true);

        /* Update. */
        updateLink(d.parent.parent);
        updateNode(d3.select('#gNodeId-' + d.parent.parent.autoId),
          d.parent.parent, d.parent.parent.x, d.parent.parent.y);

        /* Compute bounding box for analysis child nodes. */
        anBBoxCoords = getABBoxCoords(d.parent.parent, 0);

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
          anBBoxCoords = getABBoxCoords(d.parent.parent, 0);

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
        updateLink(d.parent.parent);
      }
    }

    if (trigger === 'user') {
      /* Recompute layout. */
      dagreDynamicLayerLayout(vis.graph);

      if (fitToWindow) {
        fitGraphToWindow(nodeLinkTransitionTime);
      }
    }
  };

  /**
   * Path highlighting.
   * @param d Node.
   * @param keyStroke Keystroke being pressed at mouse click.
   */
  var handlePathHighlighting = function (d, keyStroke) {
    /* Clear any highlighting. */
    clearHighlighting();

    if (keyStroke === 's') {

      /* Highlight path. */
      highlightSuccPath(d);
    } else if (keyStroke === 'p') {

      /* Highlight path. */
      highlightPredPath(d);
    }

    d3.select('.aHLinks').selectAll('.hLink').each(function (l) {
      if (l.highlighted) {
        l.hidden = false;
        d3.select(this).classed('hiddenLink', false);
      }
    });

    /* TODO: Temporarily enabled. */
    if (doiAutoUpdate) {
      recomputeDOI();
    }
  };


  /* TODO: Revise. */
  /**
   * Fit visualization onto free windows space.
   * @param transitionTime The time in milliseconds for the duration of the
   * animation.
   */
  var fitGraphToWindow = function (transitionTime) {
    var min = [0, 0];
    var max = [0, 0];

    vis.graph.aNodes.forEach(function (an) {
      var anBBox = getABBoxCoords(an, 0);
      if (anBBox.x.min < min[0]) {
        min[0] = anBBox.x.min;
      }
      if (anBBox.x.max > max[0]) {
        max[0] = anBBox.x.max;
      }
      if (anBBox.y.min < min[1]) {
        min[1] = anBBox.y.min;
      }
      if (anBBox.y.max > max[1]) {
        max[1] = anBBox.y.max;
      }
    });

    /* TODO: Fix for temporary sidebar overlap. */
    var sidebarOverlap = $('#provenance-sidebar').width() -
    $('#solr-facet-view').width() -
    parseFloat($('#main-area').css('margin-left').replace('px', ''));


    var delta = [max[0] - min[0], max[1] - min[1]];
    var factor = [(vis.width / delta[0]), (vis.height / delta[1])];
    var newScale = d3.min(factor.concat([3])) * 0.9;
    var newPos = [(sidebarOverlap > 0 ? sidebarOverlap : 0) +
    vis.margin.left * 2 * newScale,
      ((vis.height - delta[1] * newScale) / 2 + vis.margin.top * 2)];

    vis.canvas
      .transition()
      .duration(transitionTime)
      .attr('transform', 'translate(' + newPos + ')scale(' + newScale + ')');

    vis.zoom.translate(newPos);
    vis.zoom.scale(newScale);

    /* Semantic zoom. */
    setTimeout(function () {
      if (newScale < 1) {
        d3.selectAll('.BBox').classed('hiddenNode', true);
        d3.selectAll('.lDiff, .aDiff').classed('hiddenNode', true);

      } else {
        d3.selectAll('.BBox').classed('hiddenNode', false);
        d3.selectAll('.lDiff, .aDiff').classed('hiddenNode', false);
      }

      if (newScale < 1.7) {
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

    }, transitionTime);


    /* Background rectangle fix. */
    vis.rect.attr('transform', 'translate(' +
      (-newPos[0] / newScale) + ',' +
      (-newPos[1] / newScale) + ')' + ' ' +
      'scale(' + (1 / newScale) + ')');

    /* Quick fix to exclude scale from text labels. */
    vis.canvas.selectAll('.lBBoxLabel')
      .transition()
      .duration(transitionTime)
      .attr('transform', 'translate(' +
        1 * scaleFactor * vis.radius + ',' +
        0.5 * scaleFactor * vis.radius + ') ' +
        'scale(' + (1 / newScale) + ')');

    vis.canvas.selectAll('.aBBoxLabel')
      .transition()
      .duration(transitionTime)
      .attr('transform', 'translate(' +
        1 * scaleFactor * vis.radius + ',' +
        0 * scaleFactor * vis.radius + ') ' +
        'scale(' + (1 / newScale) + ')');

    vis.canvas.selectAll('.nodeDoiLabel')
      .transition()
      .duration(transitionTime)
      .attr('transform', 'translate(' + 0 + ',' +
        (1.6 * scaleFactor * vis.radius) + ') ' +
        'scale(' + (1 / newScale) + ')');

    vis.canvas.selectAll('.nodeAttrLabel')
      .transition()
      .duration(transitionTime)
      .attr('transform', 'translate(' +
        (-1.5 * scaleFactor * vis.radius) + ',' +
        (-1.5 * scaleFactor * vis.radius) + ') ' +
        'scale(' + (1 / newScale) + ')');

    /* Trim nodeAttrLabel */
    /* Get current node label pixel width. */
    var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
    d3.transform(d3.select('.canvas').select('g').select('g')
      .attr('transform')).scale[0];

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

  /**
   * Clears node selection.
   */
  var clearNodeSelection = function () {
    domNodeset.each(function (d) {
      d.selected = false;
      d.doi.selectedChanged();
      d3.select('#nodeId-' + d.autoId).classed('selectedNode', false);
      $('#nodeId-' + d.autoId).find('.glyph').find('rect, circle')
        .css({
          'stroke': colorStrokes
        });
    });

    $('#nodeInfoTitle').html('Select a node: - ');
    $('#nodeInfoTitleLink').html('');
    $('#' + 'provenance-nodeInfo-content').html('');

    selectedNodeSet = d3.map();

    $('.filteredNode').hover(function () {
      $(this).find('rect, circle').css({
        'stroke': colorHighlight
      });
    }, function () {
      $(this).find('rect, circle').css({
        'stroke': colorStrokes
      });
    });

  };

  /**
   * Left click on a node to select and reveal additional details.
   * @param d Node
   */
  var handleNodeSelection = function (d) {
    clearNodeSelection();
    d.selected = true;
    propagateNodeSelection(d, true);
    selectedNodeSet.set(d.autoId, d);
    d3.select('#nodeId-' + d.autoId).classed('selectedNode', d.selected)
      .select('.glyph').select('rect, circle')
      .style({
        'stroke': colorHighlight
      });

    $('#nodeId-' + d.autoId).hover(function () {
      $(this).find('rect, circle').css({
        'stroke': colorHighlight
      });
    }, function () {
      $(this).find('rect, circle').css({
        'stroke': colorHighlight
      });
    });

    d.doi.selectedChanged();
    if (doiAutoUpdate) {
      recomputeDOI();
    }
  };


  /* TODO: Clean up. */
  /* TODO: May add bounding box color. */
  /**
   * Colorcoding view.
   */
  var drawColorcodingView = function () {
    var wfColorScale = d3.scale.category10();
    var wfColorData = d3.map();

    wfColorData.set('dataset', 0);
    var wfIndex = 1;
    vis.graph.workflowData.values().forEach(function (wf) {
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
        'id': 'provvis-cc-wf-tr-' + i
      }).appendTo('#prov-ctrl-cc-workflow-content');

      $('<td/>', {
        'id': 'provvis-cc-wf-td-' + i
      }).appendTo('#provvis-cc-wf-tr-' + i);

      $('<label/>', {
        'id': 'provvis-cc-wf-label-' + i,
        'class': 'provvis-cc-label',
        'html': '<input id="provvis-cc-wf-color-' + i +
          '" type="text">' + wfName
      }).appendTo('#provvis-cc-wf-td-' + i);

      $('<em/>', {
        'id': 'provvis-cc-wf-hex-' + i,
        'class': 'provvis-cc-hide-hex',
        'html': wfColorScale(wf.value)
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
      link.style({
        'stroke': color
      });
      domNodeset.style({
        'stroke': color
      });
      $('.glAnchor, .grAnchor').css({
        'stroke': color,
        'fill': color
      });
    };

    var updateHighlightColor = function (color) {
      $('#provvis-cc-highlight-hex').text(color);
      hLink.style({
        'stroke': color
      });

      $('.filteredNode').hover(function () {
        $(this).find('rect, circle').css({
          'stroke': color
        });
      }, function () {
        $(this).find('rect, circle').css({
          'stroke': colorStrokes
        });
      });

      $('.glAnchor, .grAnchor').hover(function () {
        $(this).css({
          'stroke': color,
          'fill': color
        });
      }, function () {
        $(this).css({
          'stroke': colorStrokes,
          'fill': colorStrokes
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

    $('#provvis-cc-layer').spectrum({
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
      switch (checkedColor) {
        case 'none':
          domNodeset.select('.glyph').selectAll('rect, circle')
            .style({
              'fill': '#ffffff'
            });
          domNodeset.selectAll('.anLabel, .sanLabel, .anwfLabel, ' +
            '.sanwfLabel, .an-node-type-icon, .san-node-type-icon')
            .style({
              'fill': '#000000'
            });
          lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon')
            .style({
              'fill': '#000000'
            });
          break;
        case 'time':
          lNode.each(function (l) {
            d3.select('#nodeId-' + l.autoId).select('.glyph')
              .selectAll('rect').style('fill', function (d) {
              return 'url(#layerGradientId-' + l.autoId + ')';
            });
          });
          lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon').style({
            'fill': function (l) {
              var latestDate = d3.min(l.children.values(), function (d) {
                return d.start;
              });
              return timeColorScale(parseISOTimeFormat(latestDate)) <
              '#888888' ? '#ffffff' : '#000000';
            }
          });

          aNode.select('.glyph').selectAll('rect, circle')
            .style('fill', function (d) {
              return timeColorScale(parseISOTimeFormat(d.start));
            });
          aNode.selectAll('.anLabel, .anwfLabel, .an-node-type-icon').style({
            'fill': function (an) {
              return timeColorScale(parseISOTimeFormat(an.start)) <
              '#888888' ? '#ffffff' : '#000000';
            }
          });


          saNode.select('.glyph').selectAll('rect, circle')
            .style('fill', function (d) {
              return timeColorScale(parseISOTimeFormat(d.parent.start));
            });
          saNode.selectAll('.sanLabel, .sanwfLabel, .san-node-type-icon')
            .style({
              'fill': function (san) {
                return timeColorScale(parseISOTimeFormat(san.parent.start)) <
                '#888888' ? '#ffffff' : '#000000';
              }
            });

          node.select('.glyph').selectAll('rect, circle')
            .style('fill', function (d) {
              return timeColorScale(
                parseISOTimeFormat(d.parent.parent.start));
            });
          node.selectAll('.stored-node-type-icon').style({
            'fill': function (n) {
              return timeColorScale(parseISOTimeFormat(n.parent.parent.start)) <
              '#888888' ? '#ffffff' : '#000000';
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
                'fill': wfc(wfColorData.get(cur.wfCode))
              });
          });
          domNodeset.selectAll('.anLabel, .sanLabel, .anwfLabel, ' +
            '.sanwfLabel, .an-node-type-icon, .san-node-type-icon')
            .style({
              'fill': '#000000'
            });
          lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon')
            .style({
              'fill': '#000000'
            });
          break;
        case 'nodetype':
          var nt = function (t) {
            return $('#provvis-cc-' + t + '-hex').text();
          };

          domNodeset.each(function (d) {
            d3.select('#nodeId-' + d.autoId).select('.glyph')
              .selectAll('rect, circle').style({
              'fill': nt(d.nodeType)
            });
          });
          domNodeset.selectAll('.anLabel, .sanLabel, .anwfLabel, ' +
            '.sanwfLabel, .an-node-type-icon, .san-node-type-icon')
            .style({
              'fill': '#000000'
            });
          lNode.selectAll('.lnLabel, .wfLabel, .l-node-type-icon')
            .style({
              'fill': '#000000'
            });
          node.selectAll('.stored-node-type-icon').style({
            'fill': '#ffffff'
          });
          break;
      }
    };
  };

  /* TODO: Left clicking on href links doesn't trigger the download. */
  /**
   * Update node info tab on node selection.
   * @param selNode Selected node.
   */
  var updateNodeInfoTab = function (selNode) {
    var title = ' - ';
    var titleLink = ' - ';
    var data = Object.create(null);
    var nodeDiff = d3.map();
    var diffNegIns = 0;
    var diffPosIns = 0;
    var diffNegSA = 0;
    var diffPosSA = 0;
    var diffNegOuts = 0;
    var diffPosOuts = 0;

    switch (selNode.nodeType) {
      case 'raw':
      case 'special':
      case 'intermediate':
      case 'stored':
        data = vis.graph.nodeData.get(selNode.uuid);
        if (typeof data !== 'undefined') {
          title = '<i class="fa fa-sitemap rotate-icon-90"></i>&nbsp;' +
          selNode.fileType;
          if (data.file_url !== null) {
            /* TODO: Trigger download without window.open. */
            titleLink = '<a title="Download linked file" href="' +
              data.file_url + '" onclick=window.open("' + data.file_url +
              '")>' +
              '<i class="fa fa-arrow-circle-o-down"></i>&nbsp;' + data.name + '</a>';
          } else {
            titleLink = ' - ';
          }
        }
        break;

      case 'dt':
      /* TODO: Add tool_state parameters column. */
      /* From parent workflow steps attribute, extract step by id.
       * var steps = vis.graph.workflowData
       * .get(selNode.parent.wfUuid).steps; */

        data = vis.graph.nodeData.get(selNode.uuid);
        if (typeof data !== 'undefined') {
          title = '<i class="fa fa-sitemap rotate-icon-90"></i>&nbsp;' +
          selNode.fileType;
          if (data.file_url !== null) {
            /* TODO: Trigger download without window.open. */
            titleLink = '<a title="Download linked file" href="' +
              data.file_url + '" onclick=window.open("' + data.file_url +
              '")>' +
              '<i class="fa fa-arrow-circle-o-down"></i>&nbsp;' + data.name + '</a>';
          }
        }
        break;

      case 'subanalysis':
        data = vis.graph.workflowData.get(selNode.parent.wfUuid);
        if (typeof data !== 'undefined') {
          title = '<i class="fa fa-cog"></i>&nbsp; Analysis Group';
          titleLink = '<a href=/workflows/' + selNode.wfUuid +
            ' target="_blank">' +
            selNode.parent.wfName + '</a>';
        } else {
          title = '<i class="fa fa-cog"></i>&nbsp; Dataset';
        }

        if (selNode.parent.motifDiff.numIns !== 0 ||
          selNode.parent.motifDiff.numOuts !== 0 ||
          selNode.parent.motifDiff.numSubanalyses !== 0) {
          if (selNode.parent.motifDiff.numIns < 0) {
            diffNegIns += selNode.parent.motifDiff.numIns;
          } else {
            diffPosIns += selNode.parent.motifDiff.numIns;
          }
          if (selNode.parent.motifDiff.numSubanalyses < 0) {
            diffNegSA += selNode.parent.motifDiff.numSubanalyses;
          } else {
            diffPosSA += selNode.parent.motifDiff.numSubanalyses;
          }
          if (selNode.parent.motifDiff.numOuts < 0) {
            diffNegOuts += selNode.parent.motifDiff.numOuts;
          } else {
            diffPosOuts += selNode.parent.motifDiff.numOuts;
          }
        }
        break;

      case 'analysis':
        data = vis.graph.analysisData.get(selNode.uuid);
        if (typeof data !== 'undefined') {
          title = '<i class="fa fa-cogs"></i>&nbsp; Analysis';
          titleLink = '<a href=/workflows/' + selNode.wfUuid +
            ' target="_blank">' +
            selNode.wfName + '</a>';
        } else {
          title = '<i class="fa fa-cogs"></i>&nbsp; Dataset';
        }
        if (selNode.motifDiff.numIns !== 0 || selNode.motifDiff.numOuts !== 0 ||
          selNode.motifDiff.numSubanalyses !== 0) {
          if (selNode.motifDiff.numIns < 0) {
            diffNegIns += selNode.motifDiff.numIns;
          } else {
            diffPosIns += selNode.motifDiff.numIns;
          }
          if (selNode.motifDiff.numSubanalyses < 0) {
            diffNegSA += selNode.motifDiff.numSubanalyses;
          } else {
            diffPosSA += selNode.motifDiff.numSubanalyses;
          }
          if (selNode.motifDiff.numOuts < 0) {
            diffNegOuts += selNode.motifDiff.numOuts;
          } else {
            diffPosOuts += selNode.motifDiff.numOuts;
          }
        }
        break;

      case 'layer':
        data = {
          aggregation_count: selNode.children.size(),
          workflow: selNode.wfName,
          subanalysis_count: selNode.motif.numSubanalyses,
          wfUuid: selNode.motif.wfUuid
        };

        if (typeof data !== 'undefined') {
          title = '<i class="fa fa-bars"></i>&nbsp; Layer';
          titleLink = '<a href=/workflows/' + data.wfUuid +
            ' target="_blank">' + data.workflow + '</a>';
        }
        if (selNode.children.values().some(function (an) {
            return an.motifDiff.numIns !== 0 || an.motifDiff.numOuts !== 0 ||
            an.motifDiff.numSubanalyses !== 0;
          })) {
          selNode.children.values().forEach(function (an) {
            if (an.motifDiff.numIns < 0) {
              diffNegIns += an.motifDiff.numIns;
            } else {
              diffPosIns += an.motifDiff.numIns;
            }
            if (an.motifDiff.numSubanalyses < 0) {
              diffNegSA += an.motifDiff.numSubanalyses;
            } else {
              diffPosSA += an.motifDiff.numSubanalyses;
            }
            if (an.motifDiff.numOuts < 0) {
              diffNegOuts += an.motifDiff.numOuts;
            } else {
              diffPosOuts += an.motifDiff.numOuts;
            }
          });
        }
        break;
    }

    /* Add diff info to data. */
    if (diffNegIns !== 0 || diffPosIns !== 0) {
      nodeDiff.set('Diff: Inputs', (diffNegIns + ' ' + diffPosIns));
    }
    if (diffNegSA !== 0 || diffPosSA !== 0) {
      nodeDiff.set('Diff: Subanalyses', (diffNegSA + ' ' + diffPosSA));
    }
    if (diffNegOuts !== 0 || diffPosOuts !== 0) {
      nodeDiff.set('Diff: Outputs', (diffNegOuts + ' ' + diffPosOuts));
    }

    $('#nodeInfoTitle').html(title);
    $('#nodeInfoTitleLink').html(titleLink);

    $('#' + 'provenance-nodeInfo-content').html('');
    nodeDiff.entries().forEach(function (d) {
      $('<div/>', {
        'class': 'refinery-subheader',
        'html': '<h4>' + d.key + '</h4>'
      }).appendTo('#' + 'provenance-nodeInfo-content');
      $('<p/>', {
        'class': 'provvisNodeInfoValue provvisNodeInfoDiff',
        'html': '<i><b>' + d.value + '</b></i>'
      }).appendTo('#' + 'provenance-nodeInfo-content');
    });

    d3.entries(data).forEach(function (d) {
      $('<div/>', {
        'class': 'refinery-subheader',
        'html': '<h4>' + d.key + '</h4>'
      }).appendTo('#' + 'provenance-nodeInfo-content');
      $('<p/>', {
        'class': 'provvisNodeInfoValue',
        'html': '<i>' + d.value + '</i>'
      }).appendTo('#' + 'provenance-nodeInfo-content');
    });
  };

  /**
   * Get workflow name string.
   * @param n Node of type BaseNode.
   * @returns {string} The name string.
   */
  var getWfNameByNode = function (n) {
    var wfName = 'dataset';
    var an = n;
    while (!(an instanceof provvisDecl.Analysis)) {
      an = an.parent;
    }
    if (typeof vis.graph.workflowData.get(an.wfUuid) !== 'undefined') {
      wfName = vis.graph.workflowData.get(an.wfUuid).name;
    }
    return wfName.toString();
  };

  /**
   * Adds tooltips to nodes.
   */
  var handleTooltips = function () {
    /**
     * Helper function for tooltip creation.
     * @param key Property name.
     * @param value Property value.
     * @returns {string} Inner html code.
     */
    var createHTMLKeyValuePair = function (key, value) {
      return '<b>' + key + ': ' + '</b>' + value;
    };

    /* Node tooltips. */
    node.on('mouseover', function (d) {
      var self = d3.select(this);
      var ttStr = createHTMLKeyValuePair('Name', d.name) + '<br>' +
        createHTMLKeyValuePair('Type', d.fileType) + '<br>' +
        createHTMLKeyValuePair('File Url', d.fileUrl) + '<br>' +
        createHTMLKeyValuePair('UUID', d.uuid) + '<br>';
      d.attributes.forEach(function (key, value) {
        ttStr += createHTMLKeyValuePair(key, value) + '<br>';
      });
      showTooltip(ttStr, event);
      /*self.classed("mouseoverNode", true);*/
      d.parent.parent.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
      });
      d3.select('#BBoxId-' + d.parent.autoId).classed('mouseoverBBox', true);
      self.select('.labels').attr('clip-path', '');

      /* Get current node label pixel width. */
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
      self.select('.nodeAttrLabel').text(attrText);

      d3.selectAll('.node:not(#nodeId-' + d.autoId +
        ')').selectAll('.nodeAttrLabel').transition()
        .duration(nodeLinkTransitionTime).attr('opacity', 0);

    }).on('mousemove', function (d) {
      var ttStr = createHTMLKeyValuePair('Name', d.name) + '<br>' +
        createHTMLKeyValuePair('Type', d.fileType) + '<br>' +
        createHTMLKeyValuePair('File Url', d.fileUrl) + '<br>' +
        createHTMLKeyValuePair('UUID', d.uuid) + '<br>';
      d.attributes.forEach(function (key, value) {
        ttStr += createHTMLKeyValuePair(key, value) + '<br>';
      });
      d3.select('#BBoxId-' + d.parent.autoId).classed('mouseoverBBox', true);
      showTooltip(ttStr, event);
    }).on('mouseout', function (d) {
      var self = d3.select(this);
      hideTooltip();
      /*self.classed("mouseoverNode", false);*/
      d.parent.parent.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
      });
      d3.select('#BBoxId-' + d.parent.autoId).classed('mouseoverBBox', false);
      self.select('.labels').attr('clip-path',
        'url(#bbClipId-' + d.autoId + ')');


      /* Get current node label pixel width. */
      var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
      d3.transform(d3.select('.canvas').select('g').select('g')
        .attr('transform')).scale[0];
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
        self.select('.nodeAttrLabel').text(attrText);
        var trimRatio = parseInt(attrText.length * (maxLabelPixelWidth /
          self.select('.nodeAttrLabel').node().getComputedTextLength()), 10);
        if (trimRatio < attrText.length) {
          self.select('.nodeAttrLabel').text(attrText.substr(0, trimRatio - 3) +
            '...');
        }
      }

      d3.selectAll('.nodeAttrLabel').transition()
        .duration(nodeLinkTransitionTime).attr('opacity', 1);
    });

    /* Subanalysis tooltips. */
    saNode.on('mouseover', function (d) {
      var self = d3.select(this);
      self.select('.labels').attr('clip-path', '');
      d.parent.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
      });
    }).on('mousemove', function (d) {}).on('mouseout', function (d) {
      var self = d3.select(this);
      self.select('.labels').attr('clip-path',
        'url(#bbClipId-' + d.autoId + ')');
      d.parent.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
      });
    });

    /* Analysis tolltips. */
    aNode.on('mouseover', function (d) {
      var self = d3.select(this);
      self.select('.labels').attr('clip-path', '');
      d.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
      });
    }).on('mousemove', function (d) {}).on('mouseout', function (d) {
      var self = d3.select(this);
      self.select('.labels')
        .attr('clip-path', 'url(#bbClipId-' + d.autoId + ')');
      d.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
      });
    });

    /* Layer . */
    lNode.on('mouseover', function () {
      var self = d3.select(this);
      self.select('.labels').select('.wfLabel').attr('clip-path', '');
    }).on('mousemove', function (d) {}).on('mouseout', function (d) {
      var self = d3.select(this);
      self.select('.labels').select('.wfLabel')
        .attr('clip-path', 'url(#bbClipId-' + d.autoId + ')');
    });

    /* On mouseover subanalysis bounding box. */
    saBBox.on('mouseover', function (d) {
      var self = d3.select(this);
      self.classed('mouseoverBBox', true);
      d.parent.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
      });
      self.select('.labels').attr('clip-path', '');
    /*
          d.children.values().forEach( function (n) {
            /!* Get current node label pixel width. *!/
            var attrText = (n.label === "") ? n.name : n.label;
            if (n.nodeType === "stored") {
              var selAttrName = "";
              $("#prov-ctrl-visible-attribute-list > li").each(function () {
                if ($(this).find("input[type='radio']").prop("checked")) {
                  selAttrName = $(this).find("label").text();
                }
              });
              attrText = n.attributes.get(selAttrName);
            }

            /!* Set label text. *!/
            d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel").text(attrText);
          });*/
    }).on('mouseout', function (d) {
      var self = d3.select(this);
      self.classed('mouseoverBBox', false);
      d.parent.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
      });
      self.select('.labels')
        .attr('clip-path', 'url(#saBBClipId-' + d.autoId + ')');
    /*
          d.children.values().forEach( function (n) {
            /!* Get current node label pixel width. *!/
            var maxLabelPixelWidth = (cell.width - 2 * scaleFactor * vis.radius) *
                d3.transform(d3.select(".canvas").select("g").select("g")
                    .attr("transform")).scale[0];
            var attrText = (n.label === "") ? n.name : n.label;
            if (n.nodeType === "stored") {
              var selAttrName = "";
              $("#prov-ctrl-visible-attribute-list > li").each(function () {
                if ($(this).find("input[type='radio']").prop("checked")) {
                  selAttrName = $(this).find("label").text();
                }
              });
              attrText = n.attributes.get(selAttrName);
            }

            /!* Set label text. *!/
            d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel").text(attrText);
            var trimRatio = parseInt(attrText.length * (maxLabelPixelWidth /
                d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel").node().getComputedTextLength()), 10);
            if (trimRatio < attrText.length) {
              d3.select("nodeId-" + n.autoId).select(".nodeAttrLabel").text(attrText.substr(0, trimRatio - 3) +
                  "...");
            }
          });*/
    });

    /* On mouseover analysis bounding box. */
    aBBox.on('mouseover', function (an) {
      var self = d3.select(this);
      self.select('.labels').attr('clip-path', '');
      //d3.select("#BBoxId-" + an.autoId).classed("mouseoverBBox", true);
      an.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.3);
      });
    }).on('mouseout', function (an) {
      var self = d3.select(this);
      self.select('.labels')
        .attr('clip-path', 'url(#aBBClipId-' + an.autoId + ')');
      //d3.select("#BBoxId-" + an.autoId).classed("mouseoverBBox", false);
      an.parent.children.values().forEach(function (sibling) {
        d3.select('#BBoxId-' + sibling.autoId).style('stroke-opacity', 0.0);
      });
    });

    /* On mouseover layer bounding box. */
    lBBox.on('mouseover', function () {
      var self = d3.select(this);
      self.select('.labels').attr('clip-path', '');
    //self.classed("mouseoverBBox", true);
    }).on('mouseout', function (ln) {
      var self = d3.select(this);
      self.select('.labels')
        .attr('clip-path', 'url(#lBBClipId-' + ln.autoId + ')');
    //self.classed("mouseoverBBox", false);
    });

    /* On mouseover timeline analysis lines. */
    d3.selectAll('.tlAnalysis').on('mouseover', function (an) {
      showTooltip(
        createHTMLKeyValuePair('Created', parseISOTimeFormat(an.start)) +
        '<br>' +
        createHTMLKeyValuePair('Workflow', getWfNameByNode(an)) +
        '<br>', event);
      d3.select('#BBoxId-' + an.autoId).classed('mouseoverTlBBox', true);
    }).on('mousemove', function (an) {
      showTooltip(
        createHTMLKeyValuePair('Created', parseISOTimeFormat(an.start)) +
        '<br>' +
        createHTMLKeyValuePair('Workflow', getWfNameByNode(an)) +
        '<br>', event);
    }).on('mouseout', function (an) {
      hideTooltip();
      d3.select('#BBoxId-' + an.autoId).classed('mouseoverTlBBox', false);
    });
  };

  /**
   * Expand all analsyes into workflow nodes.
   */
  var showAllWorkflows = function () {
    /* Set node visibility. */
    lNode.each(function (ln) {
      ln.hidden = true;
    });
    lNode.classed('hiddenNode', true);
    aNode.each(function (an) {
      an.hidden = true;
    });
    aNode.classed('hiddenNode', true);
    saNode.each(function (san) {
      san.hidden = true;
    });
    saNode.classed('hiddenNode', true);
    node.each(function (n) {
      n.hidden = false;
    });
    node.classed('hiddenNode', false);

    /* Bounding box visibility. */
    saBBox.each(function (san) {
      if (san.filtered && san.children.values().some(function (cn) {
          return !cn.hidden;
        })) {
        d3.select(this).classed('hiddenBBox', false);
      } else {
        d3.select(this).classed('hiddenBBox', true);
      }
    });

    /* Layer exaggeration label control. */
    aBBox.each(function (an) {
      if (an.filtered && an.parent.hidden) {
        d3.select(this).classed('hiddenBBox', false);
        d3.select(this).select('text').classed('hiddenLabel', false);
      }
    });

    aNode.each(function (an) {
      /* Adjust dataset subanalysis coords. */
      if (an.uuid === 'dataset') {
        var yOffset = 0;
        an.children.values().sort(function (a, b) {
          return a.y - b.y;
        }).forEach(function (san, i) {
          var wfBBoxCoords = getWFBBoxCoords(san, 0);
          san.y = yOffset;
          yOffset += (wfBBoxCoords.y.max - wfBBoxCoords.y.min);
          san.x = 0;
          /* TODO: May cause problems. Revise! */
          updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
        });
      } else {
        /* Adjust subanalysis coords. */
        var wfBBoxCoords = getWFBBoxCoords(an.children.values()[0], 0);
        an.children.values().sort(function (a, b) {
          return a.y - b.y;
        }).forEach(function (san, i) {
          san.y = i * (wfBBoxCoords.y.max - wfBBoxCoords.y.min);
          san.x = 0;
          /* TODO: May cause problems. Revise! */
          updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
        });
      }

      /* Adjust analysis bounding box. */
      var anBBoxCoords = getABBoxCoords(an, 0);
      d3.selectAll('#BBoxId-' + an.autoId + ', #aBBClipId-' + an.autoId)
        .selectAll('rect')
        .attr('width', function () {
          return anBBoxCoords.x.max - anBBoxCoords.x.min;
        })
        .attr('height', function () {
          return anBBoxCoords.y.max - anBBoxCoords.y.min;
        });
      d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);

      if (!an.filtered) {
        d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', true);
      }
    });

    /* Set link visibility. */
    link.each(function (l) {
      l.hidden = false;
    });
    link.classed('hiddenLink', false);

    link.each(function (l) {
      if (l.filtered) {
        l.hidden = false;
        if (l.highlighted) {
          d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
        }
      } else {
        if (filterAction === 'hide') {
          l.hidden = true;
          d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', true);
        } else {
          l.hidden = false;
          if (l.highlighted) {
            d3.select('#hLinkId-' + l.autoId).classed('hiddenLink', false);
          }
        }
      }
    });

    lLink.each(function (l) {
      l.hidden = true;
    });
    lLink.classed('hiddenLink', true);
  };

  /**
   * Collapse all analyses into single subanalysis nodes.
   */
  var showAllSubanalyses = function () {
    /* Set node visibility. */
    lNode.each(function (ln) {
      ln.hidden = true;
    });
    lNode.classed('hiddenNode', true);
    aNode.each(function (an) {
      an.hidden = true;
    });
    aNode.classed('hiddenNode', true);
    saNode.each(function (san) {
      san.hidden = false;
    });
    saNode.classed('hiddenNode', false);
    node.each(function (n) {
      n.hidden = true;
    });
    node.classed('hiddenNode', true);

    /* Bounding box visibility. */
    saBBox.classed('hiddenBBox', true);

    aNode.each(function (an) {
      /* Adjust subanalysis coords. */
      an.children.values().sort(function (a, b) {
        return a.y - b.y;
      }).forEach(function (san, i) {
        san.y = i * vis.cell.height;
        san.x = 0;
        updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
      });

      /* Adjust analysis bounding box. */
      var anBBoxCoords = getABBoxCoords(an, 0);
      d3.selectAll('#BBoxId-' + an.autoId + ', #aBBClipId-' + an.autoId)
        .selectAll('rect')
        .attr('width', vis.cell.width)
        .attr('height', function () {
          return anBBoxCoords.y.max - anBBoxCoords.y.min;
        });
      d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);

      if (!an.filtered) {
        d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', true);
      }
    });

    /* Link visibility. */
    aNode.each(function (an) {
      an.links.values().forEach(function (l) {
        d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
          .classed('hiddenLink', true);
        l.hidden = true;
      });
      an.inputs.values().forEach(function (ain) {
        ain.predLinks.values().forEach(function (l) {
          d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
          l.hidden = false;
        });
      });
    });

    lLink.each(function (l) {
      l.hidden = true;
    });
    lLink.classed('hiddenLink', true);
  };

  /**
   * Collapse all analyses into single analysis nodes.
   */
  var showAllAnalyses = function () {
    /* Node visibility. */
    lNode.each(function (ln) {
      ln.hidden = true;
    });
    lNode.classed('hiddenNode', true);

    aNode.each(function (an) {
      an.hidden = false;
      hideChildNodes(an);

      /* Filtered visibility. */
      if (an.filtered) {
        d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
      }

      /* Bounding box size. */
      d3.selectAll('#BBoxId-' + an.autoId + ', #aBBClipId-' + an.autoId)
        .select('rect')
        .attr('width', vis.cell.width)
        .attr('height', vis.cell.height);

      /* Adjust subanalysis coords. */
      an.children.values().sort(function (a, b) {
        return a.y - b.y;
      }).forEach(function (san, i) {
        san.y = i * vis.cell.height;
        san.x = 0;
        updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
      });
    });
    aNode.classed('hiddenNode', false);

    /* Bounding box visibility. */
    saBBox.classed('hiddenBBox', true);

    /* Link visibility. */
    aNode.each(function (an) {
      an.links.values().forEach(function (l) {
        d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
          .classed('hiddenLink', true);
        l.hidden = true;
      });
      an.inputs.values().forEach(function (ain) {
        ain.predLinks.values().forEach(function (l) {
          d3.select('#linkId-' + l.autoId).classed('hiddenLink', false);
          l.hidden = false;
        });
      });
    });

    lLink.each(function (l) {
      l.hidden = true;
    });
    lLink.classed('hiddenLink', true);
  };

  /**
   * Collapse all nodes into single layer nodes.
   */
  var showAllLayers = function () {
    /* Node visibility. */
    lNode.each(function (ln) {
      ln.hidden = false;
      hideChildNodes(ln);

      /* Layer exaggeration reset. */
      ln.children.values().forEach(function (an) {
        an.exaggerated = false;
      });

      /* Filtered visibility. */
      if (ln.filtered) {
        d3.select('BBoxId-' + ln.autoId).classed('hiddenBBox', false);
      }
    });
    lNode.classed('hiddenNode', false);

    /* Bounding box visibility. */
    saBBox.classed('hiddenBBox', true);
    aBBox.classed('hiddenBBox', true);

    /* Link visibility. */
    aNode.each(function (an) {
      an.links.values().forEach(function (l) {
        d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
          .classed('hiddenLink', true);
        l.hidden = true;
      });

      /* Adjust subanalysis coords. */
      an.children.values().sort(function (a, b) {
        return a.y - b.y;
      }).forEach(function (san, i) {
        san.y = i * vis.cell.height;
        san.x = 0;
        updateNode(d3.select('#gNodeId-' + san.autoId), san, san.x, san.y);
      });
    });

    aLink.each(function (l) {
      l.hidden = true;
    });
    aLink.classed('hiddenLink', true);

    lLink.each(function (l) {
      l.hidden = false;
    });
    lLink.classed('hiddenLink', false);

    /* Show highlighted alinks. */
    d3.select('.aHLinks').selectAll('.hLink').each(function (l) {
      if (l.highlighted) {
        l.hidden = false;
        d3.select(this).classed('hiddenLink', false);
      }
    });
  };

  /**
   * Handle interaction controls.
   * @param graph Provenance graph object.
   */
  var handleToolbar = function (graph) {
    $('#prov-ctrl-layers-click').click(function () {
      showAllLayers();
      dagreDynamicLayerLayout(graph);
      if (fitToWindow) {
        fitGraphToWindow(nodeLinkTransitionTime);
      }
    });

    $('#prov-ctrl-analyses-click').click(function () {
      showAllAnalyses();
      dagreDynamicLayerLayout(graph);
      if (fitToWindow) {
        fitGraphToWindow(nodeLinkTransitionTime);
      }
    });

    $('#prov-ctrl-subanalyses-click').click(function () {
      showAllSubanalyses();
      dagreDynamicLayerLayout(graph);
      if (fitToWindow) {
        fitGraphToWindow(nodeLinkTransitionTime);
      }
    });

    $('#prov-ctrl-workflows-click').click(function () {
      showAllWorkflows();
      dagreDynamicLayerLayout(graph);
      if (fitToWindow) {
        fitGraphToWindow(nodeLinkTransitionTime);
      }
    });

    /* Switch filter action. */
    $('#prov-ctrl-filter-action > label').click(function () {
      filterAction = $(this).find('input[type=\'radio\']').prop('value');
      if (filterMethod === 'timeline') {
        filterAnalysesByTime(d3.select('.startTimeline')
          .data()[0].time, d3.select('.endTimeline').data()[0].time, vis);
      } else {
        runRenderUpdatePrivate(vis, lastSolrResponse);
      }
    });

    /* Choose visible node attribute. */
    $('[id^=prov-ctrl-visible-attribute-list-]').click(function () {
      /* Set and get chosen attribute as active. */
      $(this).find('input[type=\'radio\']').prop('checked', true);
      var selAttrName = $(this).find('label').text();

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
          var selAttrName = '';
          $('#prov-ctrl-visible-attribute-list > li').each(function () {
            if ($(this).find('input[type=\'radio\']').prop('checked')) {
              selAttrName = $(this).find('label').text();
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
          }, nodeLinkTransitionTime);
      } else {
        $('#provenance-sidebar')
          .animate({
            left: '20'
          }, nodeLinkTransitionTime);

        /* TODO: Temporary fix for sidbear div. */
        $('#provvis-sidebar-content').css({
          'height': vis.canvas.height
        });
      }
    });

    /* Switch fit to screen on or off. */
    $('#prov-ctrl-toggle-fit').click(function () {
      if (!$('#prov-ctrl-toggle-fit')[0].checked) {
        fitToWindow = false;
      } else {
        fitToWindow = true;
      }
    });
  };


  /* TODO: Recompute layout only after all nodes were collapsed/expanded. */

  /**
   * Handle events.
   * @param graph Provenance graph object.
   */
  var handleEvents = function (graph) {
    handleToolbar(graph);

    /* Handle click separation on nodes. */
    var domNodesetClickTimeout;
    domNodeset.on('mousedown', function (d) {
      if (d3.event.defaultPrevented) {
        return;
      }
      clearTimeout(domNodesetClickTimeout);


      /* Click event is executed after 100ms unless the double click event
       below clears the click event timeout.*/
      domNodesetClickTimeout = setTimeout(function () {
        if (!draggingActive) {
          handleNodeSelection(d);
          updateNodeInfoTab(d);
        }
      }, 200);
    });

    domNodeset.on('dblclick', function (d) {
      if (d3.event.defaultPrevented) {
        return;
      }
      clearTimeout(domNodesetClickTimeout);

      /* Double click event is executed when this event is triggered before
       the click timeout has finished. */
      handleCollapseExpandNode(d, 'e');
    });

    /* Handle click separation on other dom elements. */
    var bRectClickTimeout;
    d3.selectAll('.brect, .link, .hLink, .vLine, .hLine', '.cell')
      .on('click', function () {
        if (d3.event.defaultPrevented) {
          return;
        }
        clearTimeout(bRectClickTimeout);

        /* Click event is executed after 100ms unless the double click event
         below clears the click event timeout.*/
        bRectClickTimeout = setTimeout(function () {
          clearHighlighting(graph.links);
          clearNodeSelection();

          /* TODO: Temporarily enabled. */
          if (doiAutoUpdate) {
            recomputeDOI();
          }
        }, 200);
      });

    d3.selectAll('.brect, .link, .hLink, .vLine, .hLine, .cell')
      .on('dblclick', function () {
        if (d3.event.defaultPrevented) {
          return;
        }
        clearTimeout(bRectClickTimeout);

        /* Double click event is executed when this event is triggered
         before the click timeout has finished. */
        fitGraphToWindow(1000);
      });

    /* Handle tooltips. */
    handleTooltips();
    /* TODO: Currently disabled. */
    //handleDebugTooltips();

    /* Collapse on bounding box click.*/
    saBBox.on('click', function (d) {
      if (!draggingActive) {
        handleCollapseExpandNode(d.children.values()[0], 'c');

        /* TODO: Temporarily disabled. */
        /* Deselect. */
        //clearNodeSelection();

      /* Update node doi. */
      //updateNodeDoi();
      }
    });

    /* Collapse on bounding box click.*/
    var aBBoxClickTimeout;
    aBBox.on('click', function (d) {
      if (d3.event.defaultPrevented) {
        return;
      }
      clearTimeout(aBBoxClickTimeout);

      aBBoxClickTimeout = setTimeout(function () {
        if (!draggingActive) {
          if (d.hidden) {
            if (d.children.values().some(function (san) {
                return san.hidden;
              })) {
              d.children.values().forEach(function (san) {
                handleCollapseExpandNode(san.children.values()[0], 'c');
              });
            } else {
              handleCollapseExpandNode(d.children.values()[0], 'c');
            }
          } else {
            handleCollapseExpandNode(d, 'c');
          }

        /* TODO: Temporarily disabled. */
        /* Deselect. */
        //clearNodeSelection();
        /* Update node doi. */
        //updateNodeDoi();
        }
      }, 200);
    });

    aBBox.on('dblclick', function (d) {
      if (d3.event.defaultPrevented) {
        return;
      }
      clearTimeout(aBBoxClickTimeout);

      if (!draggingActive) {
        d.children.values().forEach(function (san) {
          handleCollapseExpandNode(san.children.values()[0], 'c');
        });
        handleCollapseExpandNode(d.children.values()[0], 'c');
        handleCollapseExpandNode(d, 'c');

      /* TODO: Temporarily disabled. */
      /* Deselect. */
      //clearNodeSelection();
      /* Update node doi. */
      //updateNodeDoi();
      }
    });

    /* Collapse to layer node. */
    lBBox.on('click', function (d) {
      if (d3.event.defaultPrevented) {
        return;
      }

      if (!draggingActive) {
        d.children.values().forEach(function (an) {
          an.children.values().forEach(function (san) {
            handleCollapseExpandNode(san.children.values()[0], 'c');
          });
          handleCollapseExpandNode(an.children.values()[0], 'c');
        });
        handleCollapseExpandNode(d.children.values()[0], 'c');

      /* TODO: Temporarily disabled. */
      /* Deselect. */
      //clearNodeSelection();
      /* Update node doi. */
      //updateNodeDoi();
      }
    });

    /* Handle path highlighting. */
    d3.selectAll('.glAnchor').on('click', function (d) {
      handlePathHighlighting(d, 'p');
    }).on('mousedown', function () {
      d3.event.stopPropagation();
    });

    d3.selectAll('.grAnchor').on('click', function (d) {
      handlePathHighlighting(d, 's');
    }).on('mousedown', function () {
      d3.event.stopPropagation();
    });
  };

  /**
   * Compute doi weight based on analysis start time.
   * @param aNodes Analysis nodes.
   */
  var initDoiTimeComponent = function (aNodes) {
    var min = d3.time.format.iso(new Date(0));
    var max = d3.time.format.iso(new Date(0));

    if (aNodes.length > 1) {
      min = d3.min(aNodes, function (d) {
        return parseISOTimeFormat(d.start);
      });
      max = d3.max(aNodes, function (d) {
        return parseISOTimeFormat(d.start);
      });
    }

    var doiTimeScale = d3.time.scale()
      .domain([min, max])
      .range([0.0, 1.0]);

    aNodes.forEach(function (an) {
      an.doi.initTimeComponent(doiTimeScale(parseISOTimeFormat(an.start)));
      an.children.values().forEach(function (san) {
        san.doi.initTimeComponent(doiTimeScale(parseISOTimeFormat(an.start)));
        san.children.values().forEach(function (n) {
          n.doi.initTimeComponent(doiTimeScale(parseISOTimeFormat(an.start)));
        });
      });
    });

    vis.graph.lNodes.values().forEach(function (l) {
      l.doi.initTimeComponent(d3.mean(l.children.values(), function (an) {
        return doiTimeScale(parseISOTimeFormat(an.start));
      }));
    });
  };

  /**
   * Compute doi weight based on nodes initially set as filtered.
   * @param lNodes Layer nodes.
   */
  var initDoiFilterComponent = function (lNodes) {
    lNodes.values().forEach(function (ln) {
      ln.filtered = true;
      ln.doi.filteredChanged();

      ln.children.values().forEach(function (an) {
        an.filtered = true;
        an.doi.filteredChanged();

        an.children.values().forEach(function (san) {
          san.filtered = true;
          san.doi.filteredChanged();

          san.children.values().forEach(function (n) {
            n.filtered = true;
            n.doi.filteredChanged();
          });
        });
      });
    });
  };

  /**
   * Compute doi weight based on the motif diff.
   * @param lNodes Layer nodes.
   * @param aNodes Analysis nodes.
   */
  var initDoiLayerDiffComponent = function (lNodes, aNodes) {
    var doiDiffMin = 0;
    var doiDiffMax = d3.max(aNodes, function (an) {
      return d3.max([Math.abs(an.motifDiff.numIns),
        Math.abs(an.motifDiff.numSubanalyses),
        Math.abs(an.motifDiff.numOuts)], function (d) {
        return d;
      });
    });

    doiDiffScale = d3.scale.linear()
      .domain([doiDiffMin, doiDiffMax])
      .range([0.0, 1.0]);

    /* Init analysis nodes with a factor in relation to the highes diff in
     the whole graph. */
    aNodes.forEach(function (an) {
      an.doi.initLayerDiffComponent(doiDiffScale(Math.abs(an.motifDiff.numIns) +
        Math.abs(an.motifDiff.numOuts) +
        Math.abs(an.motifDiff.numSubanalyses)));
      an.children.values().forEach(function (san) {
        san.doi.initLayerDiffComponent(an.doi.doiLayerDiff);
        san.children.values().forEach(function (cn) {
          cn.doi.initLayerDiffComponent(an.doi.doiLayerDiff);
        });
      });
    });

    /* Init layer nodes with max value from child nodes. */
    lNodes.values().forEach(function (ln) {
      var anMax = d3.max(ln.children.values(), function (an) {
        return an.doi.doiLayerDiff;
      });
      ln.doi.initLayerDiffComponent(anMax);
    });
  };

  /**
   * Concats an array of dom elements.
   * @param domArr An array of dom class selector strings.
   */
  var concatDomClassElements = function (domArr) {
    var domClassStr = '';
    domArr.forEach(function (d) {
      domClassStr += '.' + d + ',';
    });

    return d3.selectAll(domClassStr.substr(0, domClassStr.length - 1));
  };

  /**
   * Main render module function.
   * @param provVis The provenance visualization root object.
   */
  var runRenderPrivate = function (provVis) {
    /* Save vis object to module scope. */
    vis = provVis;
    cell = provVis.cell;

    lNodesBAK = vis.graph.lNodes;
    aNodesBAK = vis.graph.aNodes;
    saNodesBAK = vis.graph.saNodes;
    nodesBAK = vis.graph.nodes;
    lLinksBAK = vis.graph.lLinks;
    aLinksBAK = vis.graph.aLinks;

    analysisWorkflowMap = vis.graph.analysisWorkflowMap;

    width = vis.graph.l.width;
    depth = vis.graph.l.depth;

    timeColorScale = createAnalysistimeColorScale(vis.graph.aNodes,
      ['white', 'black']);
    initDoiTimeComponent(vis.graph.aNodes);

    /* Init all nodes filtered. */
    initDoiFilterComponent(vis.graph.lNodes);
    filterAction = 'blend';

    /* Init all nodes with the motif diff. */
    initDoiLayerDiffComponent(vis.graph.lNodes, vis.graph.aNodes);

    /* Draw analysis links. */
    vis.canvas.append('g').classed({
      'aHLinks': true
    });
    vis.canvas.append('g').classed({
      'aLinks': true
    });
    updateAnalysisLinks(vis.graph);

    /* Draw layer nodes and links. */
    dagreLayerLayout(vis.graph);
    vis.canvas.append('g').classed({
      'lLinks': true
    });
    vis.canvas.append('g').classed({
      'layers': true
    });
    updateLayerLinks(vis.graph.lLinks);
    updateLayerNodes(vis.graph.lNodes);

    /* Draw analysis nodes. */
    vis.canvas.append('g').classed({
      'analyses': true
    });
    updateAnalysisNodes();

    /* Draw subanalysis nodes. */
    drawSubanalysisNodes();

    /* Draw nodes. */
    drawNodes();

    /* Concat aNode, saNode and node. */
    domNodeset = concatDomClassElements(['lNode', 'aNode', 'saNode', 'node']);

    /* Add dragging behavior to nodes. */
    applyDragBehavior(layer);
    applyDragBehavior(analysis);

    /* Initiate doi. */
    vis.graph.aNodes.forEach(function (an) {
      handleCollapseExpandNode(an, 'c', 'auto');
    });
    updateNodeFilter();
    updateLinkFilter();
    updateNodeDoi();

    /* Draw timeline view. */
    drawTimelineView(vis);

    /* Draw doi view. */
    drawDoiView();

    /* Draw colorcoding view. */
    drawColorcodingView();

    /* Event listeners. */
    handleEvents(vis.graph);

    /* Set initial graph position. */
    fitGraphToWindow(0);
    /*console.log(vis.graph);*/
    console.log('Graph has ' + vis.graph.nodes.length + ' files and tools, ' + vis.graph.links.length + ' Links, ' + vis.graph.saNodes.length + ' Analysis Groups, ' + vis.graph.aNodes.length + ' analyses, and ' + vis.graph.lNodes.size() + ' layers.');
  };


  /* TODO: On facet filter reset button, reset filter as well. */
  /**
   * Update filtered nodes.
   */
  var updateNodeFilter = function () {
    /* Hide or blend (un)selected nodes. */

    /* Layers. */
    layer.each(function (ln) {
      var self = d3.select(this).select('#nodeId-' + ln.autoId);
      if (!ln.filtered) {

        /* Blend/Hide layer node. */
        self.classed('filteredNode', false)
          .classed('blendedNode', function () {
            return filterAction === 'blend' ? true : false;
          });
        d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', true);
      } else {
        self.classed('filteredNode', true).classed('blendedNode', false);
        if (!ln.hidden) {
          d3.select('#BBoxId-' + ln.autoId).classed('hiddenBBox', false);
        }
      }
    });

    /* Analyses and child nodes. */
    analysis.each(function (an) {
      var self = d3.select(this).select('#nodeId-' + an.autoId);
      if (!an.filtered) {

        /* Blend/Hide analysis. */
        self.classed('filteredNode', false)
          .classed('blendedNode', function () {
            return filterAction === 'blend' ? true : false;
          });
        d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', true);

        /* Update child nodes. */
        an.children.values().forEach(function (san) {
          d3.select('#nodeId-' + san.autoId)
            .classed('filteredNode', false)
            .classed('blendedNode', function () {
              return filterAction === 'blend' ? true : false;
            });

          san.children.values().forEach(function (n) {
            d3.select('#nodeId-' + n.autoId)
              .classed('filteredNode', false)
              .classed('blendedNode', function () {
                return filterAction === 'blend' ? true : false;
              });
          });
        });

      } else {

        /* Update child nodes. */
        an.children.values().forEach(function (san) {
          d3.select('#nodeId-' + san.autoId)
            .classed('filteredNode', true)
            .classed('blendedNode', false);
          san.children.values().forEach(function (n) {
            if (n.filtered) {
              d3.select('#nodeId-' + n.autoId)
                .classed('filteredNode', true)
                .classed('blendedNode', false);
            } else {
              d3.select('#nodeId-' + n.autoId)
                .classed('filteredNode', false)
                .classed('blendedNode', false);
            }
          });

          if (an.children.values().some(function (san) {
              return !san.hidden;
            }) ||
            an.children.values().some(function (san) {
              return san.children.values().some(function (n) {
                return !n.hidden;
              });
            })) {
            d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
          }
        });

        if (!an.hidden) {
          d3.select('#BBoxId-' + an.autoId).classed('hiddenBBox', false);
        }

        /* Display analysis. */
        self.classed('filteredNode', true).classed('blendedNode', false);
      }
    });
  };

  /**
   * Update filtered links.
   */
  var updateLinkFilter = function () {
    saLink.classed('filteredLink', false);

    saNode.each(function (san) {
      if (!san.filtered) {
        san.links.values().forEach(function (l) {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed('filteredLink', false);
          if (filterAction === 'blend') {
            d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
              .classed('blendedLink', true);
          } else {
            d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
              .classed('blendedLink', false);
          }
        });
      } else {
        san.links.values().forEach(function (l) {
          d3.selectAll('#linkId-' + l.autoId + ', #hLinkId-' + l.autoId)
            .classed({
              'filteredLink': true,
              'blendedLink': false
            });
        });
      }
    });
  };

  /**
   * On attribute filter change, the provenance visualization will be updated.
   * @param vis The provenance visualization root object.
   * @param solrResponse Query response object holding information about
   * attribute filter changed.
   */
  var runRenderUpdatePrivate = function (vis, solrResponse) {
    var selNodes = [];

    filterMethod = 'facet';

    if (solrResponse instanceof SolrResponse) {

      vis.graph.lNodes = lNodesBAK;
      vis.graph.aNodes = aNodesBAK;
      vis.graph.saNodes = saNodesBAK;
      vis.graph.nodes = nodesBAK;
      vis.graph.aLinks = aLinksBAK;
      vis.graph.lLinks = lLinksBAK;

      /* Copy filtered nodes. */
      solrResponse.getDocumentList().forEach(function (d) {
        selNodes.push(vis.graph.nodeMap.get(d.uuid));
      });

      /* Update subanalysis and workflow filter attributes. */
      vis.graph.nodes.forEach(function (n) {
        if (selNodes.map(function (d) {
            return d.parent;
          }).indexOf(n.parent) === -1) {
          n.parent.children.values().forEach(function (cn) {
            cn.filtered = false;
          });
          n.parent.filtered = false;
          n.parent.links.values().forEach(function (l) {
            l.filtered = false;
          });
        } else {

          /* Filter pred path. */
          var filterPredPath = function (curN) {
            curN.filtered = true;
            curN.predLinks.values().forEach(function (l) {
              l.filtered = true;
              if (l.source.parent === curN.parent) {
                filterPredPath(l.source);
              }
            });
          };
          filterPredPath(n);

          n.parent.filtered = true;
          n.parent.links.values().forEach(function (l) {
            l.filtered = true;
          });
        }

        /* Filtered attribute changed. */
        n.parent.children.values().forEach(function (cn) {
          cn.doi.filteredChanged();
        });
        n.parent.doi.filteredChanged();
      });

      /* Update analysis filter attributes. */
      vis.graph.aNodes.forEach(function (an) {
        if (an.children.values().some(function (san) {
            return san.filtered;
          })) {
          an.filtered = true;
        } else {
          an.filtered = false;
        }
        an.doi.filteredChanged();
      });

      /* Update layer filter attributes. */
      vis.graph.lNodes.values().forEach(function (ln) {
        if (ln.children.values().some(function (an) {
            return an.filtered;
          })) {
          ln.filtered = true;
        } else {
          ln.filtered = false;
        }
        ln.doi.filteredChanged();
      });

      /* Update analysis link filter attributes. */
      vis.graph.aLinks.forEach(function (al) {
        al.filtered = false;
      });
      vis.graph.aLinks.filter(function (al) {
        return al.source.parent.parent.filtered &&
        al.target.parent.parent.filtered;
      }).forEach(function (al) {
        al.filtered = true;
      });
      vis.graph.lLinks.values().forEach(function (ll) {
        ll.filtered = false;
      });
      vis.graph.lLinks.values().filter(function (ll) {
        return ll.source.filtered && ll.target.filtered;
      }).forEach(function (ll) {
        ll.filtered = true;
      });


      /* On filter action 'hide', splice and recompute graph. */
      if (filterAction === 'hide') {

        /* Update filtered nodesets. */
        var cpyLNodes = d3.map();
        vis.graph.lNodes.entries().forEach(function (ln) {
          if (ln.value.filtered) {
            cpyLNodes.set(ln.key, ln.value);
          }
        });
        vis.graph.lNodes = cpyLNodes;
        vis.graph.aNodes = vis.graph.aNodes.filter(function (an) {
          return an.filtered;
        });
        vis.graph.saNodes = vis.graph.saNodes.filter(function (san) {
          return san.filtered;
        });
        vis.graph.nodes = vis.graph.nodes.filter(function (n) {
          return n.filtered;
        });

        /* Update filtered linksets. */
        vis.graph.aLinks = vis.graph.aLinks.filter(function (al) {
          return al.filtered;
        });

        /* Update layer links. */
        var cpyLLinks = d3.map();
        vis.graph.lLinks.entries().forEach(function (ll) {
          if (ll.value.filtered) {
            cpyLLinks.set(ll.key, ll.value);
          }
        });
        vis.graph.lLinks = cpyLLinks;
      }

      dagreDynamicLayerLayout(vis.graph);
      if (fitToWindow) {
        fitGraphToWindow(nodeLinkTransitionTime);
      }

      updateNodeFilter();
      updateLinkFilter();
      updateAnalysisLinks(vis.graph);
      updateLayerLinks(vis.graph.lLinks);

      vis.graph.aNodes.forEach(function (an) {
        updateLink(an);
      });
      vis.graph.lNodes.values().forEach(function (ln) {
        updateLink(ln);
      });

      /* TODO: Currently enabled. */
      if (doiAutoUpdate) {
        recomputeDOI();
      }
    }
    lastSolrResponse = solrResponse;
  };

  /**
   * Publish module function.
   */
  return {
    run: function (vis) {
      runRenderPrivate(vis);
    },
    update: function (vis, solrResponse) {
      runRenderUpdatePrivate(vis, solrResponse);
    }
  };
}());
