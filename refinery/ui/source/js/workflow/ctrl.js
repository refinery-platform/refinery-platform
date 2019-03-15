/**
 * Workflow Graph Ctrl
 * @namespace WorkflowGraphyCtrl
 * @desc Main controller for the workflow graph partial
 * @memberOf refineryApp.refineryWorkflow
 * @author (c) Stefan Luger 2013 - 2014
 */
(function () {
  'use strict';

  angular
    .module('refineryWorkflow')
    .controller('WorkflowGraphCtrl', WorkflowGraphCtrl);

  WorkflowGraphCtrl.$inject = ['$', 'd3', 'settings'];

  function WorkflowGraphCtrl (
    $,
    d3,
    settings
  ) {
    var vm = this;
    vm.workflowUuid = '';

    var runWorkflowVisualization = runWorkflowVisualizationPrivate;
    // js module pattern
    // #################################################################
    // ########## GLOBAL MEMBERS #######################################
    // #################################################################
    var canvas = null;
    var zoom = null;
    var force = {};
    var shapeDim = {};
    var layoutProp = null;
    // properties table
    var table = null; // eslint-disable-line no-unused-vars
    var dataset = null; // actual dataset
    var inNodes = null;
    var outNodes = null;
    var layout = $('#cb_layout_kind_refinery').checked ? '1' : '0';
    vm.reloadWorkflow = reloadWorkflowPrivate;
    vm.toggleVisibility = toggleVisibilityPrivate;

    activate();

    function activate () {
      vm.workflowUuid = settings.djangoApp.workflowUuid;

      if (vm.workflowUuid) {
        var workflowUrl = settings.appRoot + settings.refineryApiV2
          + '/workflows/' + vm.workflowUuid + '/graph/';
        runWorkflowVisualization(workflowUrl);
      }
    }

    // #################################################################
    // ########## WORKFLOW LOADER ######################################
    // #################################################################

    /*
     * deletes the svg elements and current displayed table
     */
    var clearSvg = function () {
      if (canvas) {
        d3.select(canvas).selectAll('.link').remove();
        d3.select(canvas).selectAll('.node').remove();
        d3.select(canvas).selectAll('svg').remove();
      }
      d3.select('#workflowtbl').remove();

      canvas = null;
      force = {};
      zoom = null;
      shapeDim = {};
      layoutProp = null;
      table = null; // properties table
      dataset = null; // actual dataset
      inNodes = null;
      outNodes = null;
      layout = document.getElementById('cb_layoutKind_refinery').checked ? '1' : '0';
    };

    /*
     * reloads the whole workflow visualization from scratch through the
      * visualizeWorkflow function
     */
    function reloadWorkflowPrivate (workflowUrl) {
      clearSvg();

      canvas = initCanvas('#vis_workflow');
      angular.copy(initDimensions(60, 30, 50, 11, 50, 6), shapeDim);
      layoutProp = initForceLayout(100, 1, 0.9, -100, 0.8, 0.0);

      d3.json(workflowUrl, function (error, data) {
        visualizeWorkflow(data, canvas);
      });

      return false;
    }

    /*
     * toggle visibility of table via button click
     *
     * id: id of the div element to be toggled
     */
    function toggleVisibilityPrivate (id) {
      var element = document.getElementById(id);

      if (element.style.display === 'block') {
        element.style.display = 'none';
      } else {
        element.style.display = 'block';
      }
    }

    // refinery injection for the workflow visualization
    function runWorkflowVisualizationPrivate (workflowUrl) {
      // initialize svg to body
      canvas = initCanvas('#vis_workflow');

      // initialize window and shape dimensions
      shapeDim = initDimensions(60, 30, 50, 11, 50, 6);

      // initialize force layout properties
      layoutProp = initForceLayout(100, 1, 0.9, -100, 0.8, 0.0);

      // process and visualize workflow data from JSON file
      d3.json(workflowUrl, function (error, data) {
        visualizeWorkflow(data, canvas);
      });
    }


  // #################################################################
  // ########## ENUMS ################################################
  // #################################################################

    // supported layouts
    var layoutKind = {
      GALAXY: '0',
      REFINERY: '1'
    };

    // distinguish whether the left or right side of a node is collapsed/expanded
    var layoutTranslation = {
      COLLAPSE_LEFT: 0,
      EXPAND_LEFT: 1,
      COLLAPSE_RIGHT: 2,
      EXPAND_RIGHT: 3
    };


  // #################################################################
  // ########## HELPERS ##############################################
  // #################################################################

    /*
     * create custom tooltips
     *
     * args: contains name and value attributes for property
     * tt_id: node selector id
     */
    function createTooltip (args, ttId) {
      return d3.tip()
        .attr('class', 'file-tt')
        .attr('id', ttId)
        .offset([-10, 0])
        .html(function () {
          var content = '';
          args.forEach(function (tt) {
            content = content.concat('<strong>' + tt.name + '</strong>'
              + ' <span style="color:#fa9b30">' + tt.value + '</span><br>');
          });
          return content;
        });
    }

    /*
     * remove global d3-tip tooltip
     *
     * nodeSelector: tooltip id grouped by node id
     */
    function removeGlobalTooltip (nodeSelector) {
      d3.select('body').selectAll(nodeSelector).remove();
    }

    /*
     * event for expanding the left side of a node
     *
     * x: the anchor circle svg element
     */
    function nodeInputConCircleEvent (x) {
      if (!x.expanded_in_con) {
        x.expanded_in_con = true;
        dataset.columns[x.column].inputs += 1;

        if (dataset.columns[x.column].inputs === 1 && (
          layout === layoutKind.REFINERY || layout === layoutKind.GALAXY
          )) {
          updateColumnTranslation(x.column, layoutTranslation.EXPAND_LEFT);
        }

        d3.select(this.parentNode).selectAll('.nodeInputConG').each(function (z, j) {
          d3.select(this).append('rect')
            .attr('class', 'inputConRect')
            .attr('x', function () {
              return -shapeDim.node_io.offset - shapeDim.node_io.width;
            })
            .attr('y', function () {
              return (shapeDim.node_io.height + 2) * (j + 1)
                - getInputConnsLength(this.parentNode.parentNode.__data__.id)
                * (shapeDim.node_io.height + 2) / 2 - shapeDim.node_io.height;
            })
            .attr('width', shapeDim.node_io.width)
            .attr('height', shapeDim.node_io.height)
            .attr('rx', 1)
            .attr('ry', 1)
            .attr('fill', 'lightsteelblue')
            .attr('stroke', 'gray')
            .attr('stroke-width', 1);

            // when path was highlighted before, fill rectangle orange
          var selPath = d3.select(this.parentNode.parentNode)[0][0]
              .__data__.subgraph[+d3.select(this).attr('id')[14]];
          if (selPath[0].highlighted) {
            d3.select(this).selectAll('.inputConRect').attr('fill', 'orange');
          }

          // add file name
          d3.select(this).append('text')
            .attr('class', 'inputConRectTitle')
            .text(function (d) {
              return cutIoFileName(d.output_name);
            })
            .attr('x', function () {
              return -shapeDim.node_io.offset - shapeDim.node_io.width
                + 2 + shapeDim.circle.r;
            })
            .attr('y', function () {
              return (shapeDim.node_io.height + 2) * (j + 1)
                - getInputConnsLength(this.parentNode.parentNode.__data__.id)
                * (shapeDim.node_io.height + 2) / 2 - 3;
            });

          // create moving anchors
          d3.select(this.parentNode).append('g')
            .attr('class', 'inputConRectCircleG')
            .attr('transform', function () {
              return 'translate('
                + parseInt(-shapeDim.node_io.offset - shapeDim.node_io.width, 10)
                + ',' + parseInt((shapeDim.node_io.height + 2) * (j + 1)
                  - getInputConnsLength(this.parentNode.parentNode.__data__.id)
                  * (shapeDim.node_io.height + 2) / 2
                  - shapeDim.node_io.height / 2, 10) + ')';
            })
            .append('circle')
            .attr('class', 'inputConRectCircle')
            .attr('r', shapeDim.circle.r)
            .attr('stroke', 'gray')
            .attr('stroke-width', 1.5)
            .attr('fill', 'lightsteelblue');

          // create tooltip
          var args = [];
          args.push({ name: 'id:', value: z.id });
          args.push({ name: 'output_name:', value: z.output_name });

          // create d3-tip tooltips
          var tip = createTooltip(args, 'tt_id-' + x.id);

          // invoke tooltip on dom element
          d3.select(this).call(tip);
          d3.select(this).on('mouseover', tip.show)
            .on('mouseout', tip.hide);
        });

            // hide input circle
        d3.select('#node_' + this.parentNode.__data__.id)
          .select('.nodeInputConCircle').attr('opacity', 0);

        force.resume();
        update();
      }
    }

    /*
     * event for expanding the left side of a node
     *
     * x: the anchor circle svg element
     */
    function nodeOutputCircleEvent (x) {
      if (!x.expanded_out) {
        x.expanded_out = true;
        dataset.columns[x.column].outputs += 1;

        if (
          dataset.columns[x.column].outputs === 1 && (
          layout === layoutKind.REFINERY || layout === layoutKind.GALAXY)
        ) {
          updateColumnTranslation(x.column, layoutTranslation.EXPAND_RIGHT);
        }

        d3.select(this.parentNode).selectAll('.nodeOutputG').each(function (z, j) {
          d3.select(this).append('rect')
            .attr('id', function () {
              return 'outputRect_' + j;
            })
            .attr('class', 'outputRect')
            .attr('x', function () {
              return shapeDim.node_io.offset;
            })
            .attr('y', function () {
              return (shapeDim.node_io.height + 2) * (j + 1)
                - getOutputsLength(this.parentNode.parentNode.__data__.id)
                * (shapeDim.node_io.height + 2) / 2 - shapeDim.node_io.height;
            })
            .attr('width', shapeDim.node_io.width)
            .attr('height', shapeDim.node_io.height)
            .attr('rx', 1)
            .attr('ry', 1)
            .attr('fill', function () {
              var color = 'lightsteelblue';
              // when path was highlighted before, fill rectangle orange
              getSuccLinksByNodeId(
                this.parentNode.parentNode.__data__.id
              ).forEach(function (l) {
                if (l.highlighted && outputInputConFileLink(l)[0] === j) {
                  color = 'orange';
                }
              });
              return color;
            })
            .attr('stroke', 'gray')
            .attr('stroke-width', 1);

          // add file name
          d3.select(this).append('text')
            .attr('id', function () {
              return 'outRectTitle_' + j;
            })
            .attr('class', 'outRectTitle')
            .text(function (d) {
              return cutIoFileName(d.name);
            })
            .attr('x', shapeDim.node_io.offset + 2)
            .attr('y', function () {
              return (shapeDim.node_io.height + 2) * (j + 1)
                - getOutputsLength(this.parentNode.parentNode.__data__.id)
                * (shapeDim.node_io.height + 2) / 2 - 3;
            });

            // create moving anchors

            // files imported back to refinery
            // when name is key element of annotation properties,
            // rename it to its value element and display it in italic style
            // and add a steelblue filled circle to the right of the rect
          var anchor = d3.select(this).append('g')
            .attr('class', 'outRectCircleG')
            .attr('transform', function () {
              return 'translate('
                + parseInt(shapeDim.node_io.offset + shapeDim.node_io.width, 10) + ','
                + parseInt((shapeDim.node_io.height + 2) * (j + 1)
                  - getOutputsLength(this.parentNode.parentNode.__data__.id)
                  * (shapeDim.node_io.height + 2) / 2
                  - shapeDim.node_io.height / 2, 10) + ')';
            });
          var anchorCircle = anchor.append('circle')
            .attr('class', 'outRectCircle')
            .attr('r', shapeDim.circle.r)
            .attr('stroke', 'gray')
            .attr('stroke-width', 1.5);

          var storedOutput = checkStoredOutputs(anchorCircle);

          // create tooltip
          var args = [];
          args.push({ name: 'name:', value: z.name });
          args.push({ name: 'type:', value: z.type });
          if (storedOutput !== 'undefined') {
            args.push({ name: 'stored as:', value: storedOutput });
          }

          // create d3-tip tooltips
          var tip = createTooltip(args, 'tt_id-' + x.id);

          // invoke tooltip on dom element
          d3.select(this).call(tip);
          d3.select(this).on('mouseover', tip.show)
              .on('mouseout', tip.hide);
        });

        force.resume();
        update();
      }
    }

    /*
     * event for expanding the left side of a node
     *
     * x: the anchor circle svg element
     */
    function nodeInputCircleEvent (x) {
      var inputRect = null;

      if (!x.expanded_out) {
        x.expanded_out = true;
        dataset.columns[x.column].outputs += 1;

        if (dataset.columns[x.column].outputs === 1 && (
          layout === layoutKind.REFINERY || layout === layoutKind.GALAXY
          )) {
          updateColumnTranslation(x.column, layoutTranslation.EXPAND_RIGHT);
        }
        inputRect = d3.select(this.parentNode).select('.nodeInput')
          .selectAll('.inputRectTitle');

        var inputRectG = inputRect.data(function (d) {
          return dataset.steps[d.id].inputs;
        })
          .enter()
          .append('g');

        inputRectG.append('rect')
          .attr('class', 'inputRect')
          .attr('id', function (d, i) {
            return 'inputRect_' + i;
          })
          .attr('x', shapeDim.node_io.offset)
          .attr('y', function (d, i) {
            return (shapeDim.node_io.height + 2) * (i + 1)
              - getInputsLength(this.parentNode.parentNode.parentNode.__data__.id)
              * (shapeDim.node_io.height + 2) / 2 - shapeDim.node_io.height;
          })
          .attr('width', shapeDim.node_io.width)
          .attr('height', shapeDim.node_io.height)
          .attr('rx', 1)
          .attr('ry', 1)
          .attr('fill', 'lightsteelblue')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1);

        // when path was highlighted before, fill rectangle orange
        // get links via source id and for each link
        getSuccLinksByNodeId(x.id).forEach(function (l) {
          if (l.highlighted) {
            d3.select('#node_' + l.source.id)
              .select('.nodeInput')
              .select('#inputRect_' + outputInputConFileLink(l)[0])
              .attr('fill', 'orange');
          }
        });

        // add file name
        inputRectG
          .append('text')
          .attr('class', 'inputRectTitle')
          .text(function (d) {
            return cutIoFileName(d.name);
          })
          .attr('x', shapeDim.node_io.offset + 2)
          .attr('y', function (d, i) {
            return (shapeDim.node_io.height + 2) * (i + 1)
              - getInputsLength(this.parentNode.parentNode.parentNode.__data__.id)
              * (shapeDim.node_io.height + 2) / 2 - 3;
          });

        // create moving anchors
        inputRectG
          .append('g')
          .attr('class', 'inRectCircleG')
          .attr('transform', function (d, i) {
            return 'translate('
              + parseInt(shapeDim.node_io.offset + shapeDim.node_io.width, 10) + ','
              + parseInt((shapeDim.node_io.height + 2) * (i + 1)
                - getInputsLength(this.parentNode.parentNode.parentNode.__data__.id)
                * (shapeDim.node_io.height + 2) / 2
                - shapeDim.node_io.height / 2, 10) + ')';
          })
          .append('circle')
          .attr('class', 'inRectCircle')
          .attr('r', shapeDim.circle.r)
          .attr('stroke', 'gray')
          .attr('stroke-width', 1.5)
          .attr('fill', 'lightsteelblue');

        // create tooltip
        inputRectG.each(function (d) {
          var args = [];
          args.push({ name: 'description:', value: d.description });
          args.push({ name: 'name:', value: d.name });

          // create d3-tip tooltips
          var tip = createTooltip(args, 'tt_id-' + x.id);

          // invoke tooltip on dom element
          d3.select(this).call(tip);
          d3.select(this).on('mouseover', tip.show)
            .on('mouseout', tip.hide);
        });

        // hide input circle
        d3.select('#node_' + this.parentNode.__data__.id)
          .select('.nodeInputCircle').attr('opacity', 0);

        force.resume();
        update();
      }
    }

  // TODO: magically the the height gets expanded by x when resizing the width
    // or height of the window
    /*
     * adds responsiveness on window resize to the visualization
     *
     */
    function resize () {
      // calc new width after resize
      var newWidth = parseInt(d3.select('#vis_workflow').style('width'), 10);
      var newHeight = parseInt(d3.select('#vis_workflow').style('height'), 10);

      // set svg
      d3.select('#vis_workflow').select('svg')
        .attr('width', newWidth + 'px')
        .attr('height', newHeight + 'px');

      // set canvas
      canvas
        .attr('width', newWidth + 'px')
        .attr('height', newHeight + 'px');

      // update globals
      shapeDim.window.width = newWidth;
      shapeDim.window.height = newHeight;

      // update visualization
      // fitWfToWindow(0);

      // update overlay
      d3.select('.overlay')
        .attr('x', -newWidth + 'px')
        .attr('y', -newHeight + 'px')
        .attr('width', newWidth * 4 + 'px')
        .attr('height', newHeight * 4 + 'px');
    }

    /*
     * create a circle left and right to the node for interaction purposes
     *
     * gElement: input_con, output, input
     * node: node of datastructure node
     * gStr: class name for the group element
     * element: the circle svg element appended
     * str: class name for the element
     * xTrans: translation in x direction
     *
     * returns the group element
     */
    function createNodeCircle (gElement, node, gStr, str, xTrans) {
      // group element
      // eslint-disable-next-line no-param-reassign
      gElement = node.append('g').attr('transform', function () {
        return 'translate(' + parseInt((xTrans), 10) + ',' + 0 + ')';
      }).attr('class', gStr);

      // circle element
      gElement.append('circle')
        .attr('class', str)
        .attr('r', shapeDim.circle.r)
        .attr('stroke', 'gray')
        .attr('stroke-width', 1.5)
        .attr('fill', 'lightsteelblue');

      return gElement;
    }

    /*
     * for each output file of a node, stored outputs are checked
     *
     * output: a single output file of a node
     */
    function checkStoredOutputs (output) {
      var curNodeId = output[0][0].parentNode.parentNode.parentNode.__data__.id;
      var curNode = dataset.steps[curNodeId];
      var annoProperties = parseNodeAnnotation(curNode.annotation);
      var nodeCircle = d3.select('#node_' + curNodeId).select('.nodeOutputCircle');
      var keys = annoProperties.map(function (k) {
        return k.key;
      });
      var values = annoProperties.map(function (v) {
        return v.value;
      });

      // fill stored outputs
      output.attr('fill', function (d) {
        return (keys.indexOf(d.name) !== -1) ? 'steelblue' : 'lightsteelblue';
      });

      // hide output circle
      nodeCircle.attr('opacity', 0);

      // rename files and stylize them italic
      var index = keys.indexOf(output[0][0].__data__.name);
      var nodeOutputG = d3.select(output[0][0].parentNode.parentNode);

      // if current output file is stored in the key-value array
      if (index !== -1) {
        // rename and stylize italic
        nodeOutputG.select('.outRectTitle')
          .text(cutIoFileName(values[index])).attr('font-style', 'italic');
        return values[index];
      } else { // eslint-disable-line no-else-return
        return 'undefined';
      }
    }

    /*
     * dye circles if they contain stored outputs
     *
     * node: node of datastructure node
     */
    function dyeCircles (nodeId) {
      var nodeCircle = [];
      var curNode = dataset.steps[nodeId];
      var annoProperties = parseNodeAnnotation(curNode.annotation);

      if (annoProperties.length !== 0) {
        nodeCircle = d3.select('#node_' + nodeId)
          .select('.nodeOutputCircle').select('.fileIconOutputCircle');
        nodeCircle.attr('fill', 'steelblue');
      }
    }

    /*
     * clears highlighted links, nodes and inputcon rects
     *
     * link: link datastructure after the force layout is executed
     */
    function clearHighlighting (link) {
      var selPath = [];
      var selNodeRect = null;
      var selPathRect = null;

      link.each(function (l) {
        selPath.push(l);
      });

      // for every link
      dyePath(selPath, selNodeRect, selPathRect, 'gray', 1.5, 'lightsteelblue', false);

      // for each out_node
      outNodes.forEach(function (y) {
        dyeNode(y, 'gray', 1.5, 'lightsteelblue');
      });
    }

    /*
     * fits the current workflow to the window
     *
     * transitionTime: specify the ms when a transition occurs,
     * with 0 no transition is executed
     */
    function fitWfToWindow (transitionTime) {
      var min = [d3.min(dataset.nodes, function (d) {
        return d.x;
      }), d3.min(dataset.nodes, function (d) {
        return d.y;
      })];
      var max = [d3.max(dataset.nodes, function (d) {
        return d.x;
      }), d3.max(dataset.nodes, function (d) {
        return d.y;
      })];
      var delta = [max[0] - min[0], max[1] - min[1]];
      var factor = [(shapeDim.window.width - shapeDim.margin.left * 4) / delta[0],
        (shapeDim.window.height - shapeDim.margin.top * 4) / delta[1]
      ];
      // old_pos = zoom.translate(),
      var newScale = d3.min(factor.concat([2])); // limit fit to window
          // zoom level to 2.
      var newPos = [
        ((shapeDim.window.width - shapeDim.margin.left - delta[0] * newScale) / 2),
        ((shapeDim.window.height - shapeDim.margin.left - delta[1] * newScale) / 2)];

      newPos[0] -= min[0] * newScale;
      newPos[1] -= min[1] * newScale;

      if (transitionTime !== 0) {
        canvas
          .transition()
          .duration(1000)
          .attr('transform', 'translate(' + newPos + ')scale(' + newScale + ')');
      } else {
        canvas.attr('transform', 'translate(' + newPos + ')scale(' + newScale + ')');
      }

      zoom.translate(newPos);
      zoom.scale(newScale);
    }

  // TODO: generalize for all attributes
    /*
     * calculates column order through links of nodes
     *
     * node: the current node with datastructure node
     */
    function calcColumns (node) {
      var succs = getSuccNodesByNode(node);

          // for each successor
      succs.forEach(function (x) {
        // check predecessors visited
        var preds = getPredNodesByNode(x);
        var maxCol = 0;
        var allVisited = true;
        preds.forEach(function (y) {
          if (y.visited) {
            if (y.column > maxCol) {
              maxCol = y.column;
            }
          } else {
            // only if one predecessor wasn't written, start backtracking
            allVisited = false;
          }
        });

        if (allVisited) {
          x.column = maxCol + 1;
          x.visited = true;
          calcColumns(x);
        }
      });
    }

    /*
     * shift specific nodes by rows
     *
     * rowShift: number of rows to shift
     * col: for nodes up to column
     * row: for nodes from row
     */
    function shiftNodesByRows (rowShift, col, row) {
      getNodesByColumnRange(0, col).forEach(function (d) {
        if (d.row >= row) {
          d.row += rowShift;
        }
      });
    }

    /*
     * get number of nodes visited already
     *
     * arr: an array of nodes
     * returns the number of nodes visited already
     */
    function getNumberOfVisitedNodesByArr (nodes) {
      var count = 0;

      nodes.forEach(function (id) {
        if (dataset.nodes[id].visited) {
          count++;
        }
      });

      return count;
    }

    /*
     * gets all predecessor nodes for a node
     *
     * node: node of datastructure nodes
     * returns a set of nodes
     */
    function getPredNodesByNode (node) {
      var predLinks = [];
      var predNodes = [];

      dataset.links.forEach(function (link) {
        if (link.target === node.id) {
          predLinks.push(link);
        }
      });

      predLinks.forEach(function (link) {
        predNodes.push(dataset.nodes[link.source]);
      });

      return predNodes;
    }

    /*
     * gets all successor nodes for a node
     *
     * node: node of datastructure nodes
     * returns a set of nodes
     */
    function getSuccNodesByNode (node) {
      var succLinks = [];
      var succNodes = [];

      dataset.links.forEach(function (link) {
        if (link.source === node.id) {
          succLinks.push(link);
        }
      });

      succLinks.forEach(function (link) {
        succNodes.push(dataset.nodes[link.target]);
      });

      return succNodes;
    }

    /*
     * get nodes of columns from begin to end column id
     *
     * begin: column according to grid layout
     * end: (including) column according to grid layout
     * returns a set of nodes
     */
    function getNodesByColumnRange (begin, end) {
      var nodesToTranslate = [];

      dataset.nodes.forEach(function (node) {
        if (node.column >= begin && node.column <= end) {
          nodesToTranslate.push(node);
        }
      });

      return nodesToTranslate;
    }

    /*
     * collapse/expand the left/right side of a column
     *
     * col: column according to grid layout
     * action: enum for the specific translation
     */
    function updateColumnTranslation (col, action) {
      var nodesToTranslate = [];

      // LEFT SIDE - get nodes to the left
      if (action === layoutTranslation.COLLAPSE_LEFT
        || action === layoutTranslation.EXPAND_LEFT) {
        nodesToTranslate = getNodesByColumnRange(0, col - 1);

        nodesToTranslate.forEach(function (node) {
          // translate nodes in columns to the left in pos x direction
          if (action === layoutTranslation.COLLAPSE_LEFT) {
            node.px += shapeDim.column.delta_x;
                // translate nodes in columns to the left in neg x direction
          } else {
            node.px -= shapeDim.column.delta_x;
          }
        });
      } else { // RIGHT SIDE - get nodes to the right
        nodesToTranslate = getNodesByColumnRange(col + 1, dataset.graph_depth);

        nodesToTranslate.forEach(function (node) {
          // translate nodes in columns to the right in neg x direction
          if (action === layoutTranslation.COLLAPSE_RIGHT) {
            node.px -= shapeDim.column.delta_x;
            // translate nodes in columns to the right in pos x direction
          } else {
            node.px += shapeDim.column.delta_x;
          }
        });
      }
    }

    /*
     * get nodes by column
     *
     * col: column according to grid layout
     * returns a set of nodes
     */
    function getNodesByCol (col) {
      var colNodes = [];
      dataset.nodes.forEach(function (node) {
        if (node.column === col) {
          colNodes.push(node);
        }
      });
      return colNodes;
    }

    /*
     * get all output nodes, the nodes without a successor
     *
     * returns a set of output nodes
     */
    function getOutputNodes () {
      var outputNodes = [];

      dataset.nodes.forEach(function (node) {
        if (node.type === 'output') {
          outputNodes.push(node);
        }
      });

      return outputNodes;
    }

    /*
     * get all input nodes, the nodes without a predecessor
     *
     * returns a set of input nodes
     */
    function getInputNodes () {
      var inputNodes = [];

      dataset.nodes.forEach(function (node) {
        if (node.type === 'input') {
          inputNodes.push(node);
        }
      });

      return inputNodes;
    }

    /*
     * set the width of a graph by counting the leaf-nodes
     *
     * returns the number of nodes leaf-nodes
     */
    function setGraphWidth () {
      dataset.graph_width = getOutputNodes().length;
    }

    /*
     * traverse the tree dfs by a given node id and set the depth for the graph
     *
     * curNode: the current node in the traversal process
     * pathDepth: the accumulated path length for the current recursion depth
     */
    function traverseDfs (curNode, pathDepth) {
      var preds = [];
      dataset.links.forEach(function (link) {
        if (link.target === curNode.id) {
          preds.push(link);
        }
      });

      if (curNode.type === 'input') {
        if (pathDepth > dataset.graph_depth) {
          dataset.graph_depth = pathDepth;
        }
      } else {
        preds.forEach(function (link) {
          traverseDfs(dataset.nodes[link.source], (+pathDepth) + 1);
        });
      }
    }

    /*
     * set the longest path of the graph by finding a maximum path
     */
    function setGraphDepth () {
      getOutputNodes().forEach(function (d) {
        traverseDfs(d, 1);
      });
    }

    /*
     * cuts the input, output and input_con file name regarding the
     * width of io_node rectangles
     *
     * str: the full string
     * returns the cut string to display
     */
    function cutIoFileName (strIn) {
      if (strIn.length > shapeDim.node_io.width / 5) {
        return strIn.substring(0, 9) + '..';
      }

      return strIn;
    }

    /*
     * calculates the length of the node title and splits into two text elements,
     * cuts it if it is too long and adds a tooltip
     *
     * d: node
     */
    function nodeTitle () {
      var textSize = [];
      var nodeName = [];
      var charSize = [];
      var charsPerRow = [];
      var delimiter = [];
      var delimiterPosChar = 0;
      var lineBreakPos = 0;

      delimiter = [' ', '-', '\/', '\\', ':', '.', '_', ',', ';'];

      // create a svg element for the full string
      this[0].forEach(function (x, i) {
        d3.select(x).append('text')
          .attr('class', 'nodeTitle1')
          .attr('x', 0)
          .attr('y', 0)
          .text(function () {
            return dataset.steps[i].name;
          });
      });

      // break first line if necessary with line breaks on
      this[0].forEach(function (x, i) {
        d3.select(x).select('.nodeTitle1')
          .text(function (d) {
            textSize[i] = this.getComputedTextLength()
              + parseInt(shapeDim.node.title_margin, 10);
            nodeName[i] = dataset.steps[d.id].name;
            charSize[i] = textSize[i] / nodeName[i].length;
            charsPerRow[i] = parseInt(Math.floor(shapeDim.node.width / charSize[i]), 10);
            lineBreakPos = charsPerRow[i];

            if (nodeName[i].length > charsPerRow[i] + 1) {
              delimiterPosChar = nodeName[i][parseInt(charsPerRow[i], 10)];

              // check for linebreak
              if (nodeName[i].length > charsPerRow[i] + 1
                && (delimiter.indexOf(delimiterPosChar) === -1)) {
                var cur = 0;
                var max = 0;
                delimiter.forEach(function (c) {
                  cur = nodeName[i].substring(0, charsPerRow[i]).lastIndexOf(c);
                  if (cur > max) {
                    max = cur;
                  }
                });
                lineBreakPos = max;

                if (lineBreakPos === 0) {
                  lineBreakPos = charsPerRow[i];
                  return nodeName[i].substring(0, charsPerRow[i] + 1) + '-';
                } else {  // eslint-disable-line no-else-return
                  return nodeName[i].substring(0, lineBreakPos + 1);
                }
              } else { // eslint-disable-line no-else-return
                return nodeName[i].substring(0, charsPerRow[i] + 1);
              }
            } else {
              return nodeName[i];
            }
          })
        .attr('text-anchor', 'middle')
        .attr('y', function () {
          if (nodeName[i].length > charsPerRow[i] + 1) {
            return '12';
          } else { // eslint-disable-line no-else-return
            return shapeDim.node.height / 2 + 4;
          }
        });

        // add a second line if necessary
        if (nodeName[i].length > charsPerRow[i] + 1) {
          d3.select(x).append('text')
            .attr('class', 'nodeTitle2')
            .attr('x', 0)
            .attr('y', 12)
            .text(function () {
              if ((nodeName[i].length - (lineBreakPos + 1)) < charsPerRow[i]) {
                return nodeName[i].substring(lineBreakPos + 1, nodeName[i].length);
              } else {  // eslint-disable-line no-else-return
                // if string is still too long, add points
                return nodeName[i].substring(lineBreakPos + 1, lineBreakPos
                    + charsPerRow[i] - 1) + '..';
              }
            })
            .attr('text-anchor', 'middle')
            .attr('y', 24);
        }
      });
    }

    /*
     * dyes a single node
     *
     * node: the node of datastructure node
     * stroke: border color
     * strokeWidth: border width
     * fill: fill color
     */
    function dyeNode (node, stroke, strokeWidth, fill) {
      var nodeRect = d3.select('#node_' + node.id);

      nodeRect.select('.nodeRect')
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth);

      nodeRect.selectAll('.inputConRect')
        .attr('fill', fill);
    }

    /*
     * dyes a path beginning at the selected node triggered via the path selection
     *
     * selPath: the selected path consisting of links
     * selNodeRect: the svg element of the selected node
     * selPathRect: an array of svg elements of the predecessing links
      * within the path
     * stroke: border color
     * strokeWidth: border width
     * fill: fill color
     */
    function dyePath (
      selPath,
      selNodeRect,
      selPathRect,
      stroke,
      strokeWidth,
      fill,
      highlighted
    ) {
      // this node
      if (selNodeRect !== null) {
        selNodeRect
          .attr('stroke', stroke)
          .attr('stroke-width', strokeWidth);
      }
      if (selPathRect !== null) {
        selPathRect
          .attr('fill', fill);
      }

      // links and source nodes for the selected path
      selPath.forEach(function (l) {
        l.highlighted = highlighted;

        d3.select('#' + l.id)
          .attr('stroke', stroke)
          .attr('stroke-width', strokeWidth);

        d3.select('#node_' + l.source.id).select('.nodeRect')
          .attr('stroke', stroke)
          .attr('stroke-width', strokeWidth);

        d3.select('#node_' + l.source.id).selectAll('.inputConRect')
          .attr('fill', fill);

        d3.select('#node_' + l.source.id).select('.nodeOutput')
          .select('#outputRect_' + outputInputConFileLink(l)[0])
          .attr('fill', fill);

        d3.select('#node_' + l.source.id).selectAll('.inputRect')
          .attr('fill', fill);
      });
    }

    /*
     * get all links by a given source node id
     *
     * id: source node id
     * returns array of links
     */
    function getSuccLinksByNodeId (id) {
      var links = [];
      dataset.links.forEach(function (x) {
        if (x.source.id === id) {
          links.push(x);
        }
      });
      return links;
    }

    /* extracts all possible paths(links) via backtracking to root nodes
    starting with the selected node id
     *
     * id: selected node id
     * subgraph: an array of paths
     * curPathId: path index
     * curNodeId: current node id
     * subPathLength: length of branch until a split
     */
    function getSubgraphById (
      id,
      subgraph,
      curPathId,
      curNodeId,
      subPathLength
    ) {
      var preds = [];
      dataset.links.forEach(function (link) {
        if (link.target === curNodeId) {
          preds.push(link);
        }
      });

      if (preds.length > 0) {
        // foreach predecessor
        preds.forEach(function (x) {
          // origin of path has two or more branches
          if (x.target === id) {
            curPathId++;  // eslint-disable-line no-param-reassign
            subgraph.push([]);
          }

          // push current link to current path
          subgraph[curPathId].push(x);
          // and execute recursion with source id of the current link as current node id
          // eslint-disable-next-line no-param-reassign
          getSubgraphById(id, subgraph, curPathId, x.source, ++subPathLength);
        });
      }
        // otherwise, the current node id is a root node, and we leave this recursion branch
    }

    /*
     * gets target nodes by a given source id
     *
     * srcId: source node id
     * returns array of node ids representing target nodes
     */
    function getSuccNodesByNodeId (srcId) {
      var succs = [];

      dataset.links.forEach(function (x) {
        if (x.source === srcId) {
          succs.push(x.target);
        }
      });

      return succs;
    }

    /*
     * get the length of the inputs array for an integer id of a node
     *
     * nodeId: node id integer
     * returns the number of inputs of the node
     */
    function getInputsLength (nodeId) {
      return dataset.steps[nodeId].inputs.length;
    }

    /*
     * get the length of the input_connections array for an integer id of a node
     *
     * nodeId: node id integer
     * returns the number of input_connections of the node
     */
    function getInputConnsLength (nodeId) {
      return d3.values(dataset.steps[nodeId].input_connections).length;
    }

    /*
     * get the length of the outputs array for an integer id of a node
     *
     * nodeId: node id integer
     * returns the number of outputs of the node
     */
    function getOutputsLength (nodeId) {
      return dataset.steps[nodeId].outputs.length;
    }

    /*
     * get index pair of the outputs elem and input_connections elem
     * for each link between two nodes
     *
     * link: contains source and target node
     * returns the linked index pair of outputs elem and input_connections elem
     */
    function outputInputConFileLink (link) {
      var iSrcOut = 0;
      var jTarIn = 0;

      if (typeof link.source.id !== 'undefined'
        && typeof dataset.steps[link.source.id] !== 'undefined') {
        // eslint-disable-next-line array-callback-return
        dataset.steps[link.source.id].outputs.some(function (x, i) {	// source node
          // eslint-disable-next-line array-callback-return
          d3.values(dataset.steps[link.target.id].input_connections)
            .some(function (y, j) {  // eslint-disable-line array-callback-return
              // target node
              if (x.name === y.output_name && link.source.id === y.id) {
                iSrcOut = i;
                jTarIn = j;
              }
            });
        });
      }

      return [iSrcOut, jTarIn];
    }

    /*
     * similar to outputInputConFileLink but for links where the
     * source node is of type input
     *
     * link: contains source and target node
     * returns the linked index pair of input elem and input_connections elem
     */
    function inputInputConFileLink (link) {
      var iSrcOut = 0;
      var jTarIn = 0;
      if (typeof link.source.id !== 'undefined'
        && typeof dataset.steps[link.source.id] !== 'undefined') {
        d3.values(dataset.steps[link.target.id].input_connections)
          .some(function (y, j) {	// eslint-disable-line array-callback-return
            // target node
            if (link.source.id === y.id) {
              jTarIn = j;
            }
          });
      }

      return [iSrcOut, jTarIn];
    }

    /*
     * checks whether an array contains a given integer element
     *
     * arr: the array (e.g. links)
     * nodeId: the element (e.g. node id)
     * returns true if the array contains the element
     */
    function srcElemInArr (arr, nodeId) {
      var found = false;

      arr.some(function (d) { // eslint-disable-line array-callback-return
        if (+d.source === +nodeId) {
          found = true;
        }
      });

      return found;
    }

    /*
     * adds zoom behavior to the top svg root element
     */
    function geometricZoom () {
      canvas.attr('transform', 'translate(' + d3.event.translate[0] + ','
        + d3.event.translate[1] + ')scale(' + (d3.event.scale) + ')');
    }

    /*
     * dragging start behavior for the force layout
     *
     * d: node which gets dragged
     */
    function dragstart () {
      d3.event.sourceEvent.stopPropagation();
    }

    /*
     * dragging end behavior for the force layout
     *
     * d: node which gets dragged
     */
    function dragend () {

    }

// #################################################################
// ########## INITIALIZATIONS ######################################
// #################################################################

// TODO: fix height growing issue
    /*
     * initializes a svg canvas root element and sets an id
     * if no width and height is specified, the proportions are set automatically
     *
     * divId required for deletion
     * width, height: proportions
     * returns the actual generated svg canvas
     */
    function initCanvas (divId) {
      canvas = d3.select(divId).append('svg')
        .attr('width', d3.select('#vis_workflow').style('width'))
        .attr('height', function () {
          return window.innerHeight * 0.8 + 'px';
        })
        .append('g');

      return canvas;
    }

    /*
     * initializes the most important svg element shape dimension properties
     *
     * nodeWidth, nodeHeight: the proportions of a node
     * ioWidth, ioHeight, ioOffset: proportions of in- and output
      * files attached to a node
     * margin for the svg canvas
     * returns the proportions for global storing purposes
     */
    function initDimensions (
      nodeWidth,
      nodeHeight,
      ioWidth,
      ioHeight,
      margin,
      ioOffset
    ) {
      return {
        window: { width: parseInt(d3.select('#vis_workflow').style('width'), 10),
          height: parseInt(d3.select('#vis_workflow').style('height'), 10) },
        node: { width: nodeWidth, height: nodeHeight, title_margin: 30 },
        node_io: { width: ioWidth, height: ioHeight, offset: ioOffset },
        margin: { left: margin, top: margin, right: margin, bottom: margin },
        circle: { r: nodeHeight / 6 },
        column: { width: nodeWidth * 1.7, delta_x: ioWidth + ioOffset },
        row: { height: nodeHeight * 2 }
      };
    }

    /*
     * initializes force layout with given attributes
     *
     * for parameters explanation
     * please lookup: https://github.com/mbostock/d3/wiki/Force-Layout#wiki-force
     *
     * returns the layout data structure
     */
    function initForceLayout (
      linkDistance,
      linkStrength,
      friction,
      charge,
      theta,
      gravity
    ) {
      return {
        size: [shapeDim.window.width, shapeDim.window.height],
        linkDistance: linkDistance,
        linkStrength: linkStrength,
        friction: friction,
        charge: charge,
        theta: theta,
        gravity: gravity
      };
    }

// #################################################################
// ########## TABLE HELPERS ########################################
// #################################################################

    /*
     * creates a table on click
     *
     * node: node datastructure of dataset after the force layout is executed
     */
    function createTable (node) {
      // add new table on click
      var table = d3.select('#node_table');  // eslint-disable-line no-shadow
      var propTbl = table.append('table')
            .attr('id', 'workflowtbl')
            .classed('table table-bordered table-condensed table-responsive', true);
      var tbody = propTbl.append('tbody');
      var tableEntries = [];

      // generate two-dimensional array dataset
      d3.entries(dataset.steps[node.id]).forEach(function (y) {
        switch (y.key) {
          case 'name':
          case 'tool_id':
          case 'tool_version':
          case 'tool_state':
          case 'annotation':
            tableEntries.push([y.key, y.value]);
            break;
          default:
            break;
        }
      });

      // nested tr-td selection for actual entries
      var tr = tbody.selectAll('tr')
        .data(tableEntries)
        .enter()
        .append('tr');

      var td = tr.selectAll('td')   // eslint-disable-line no-unused-vars
        .data(function (d) {
          return d;
        })
        .enter()
        .append('td')
        .call(evalNodeParams);
    }

    /*
     * resolve nested object within the tool state elements
     *
     * parent: the parent cell
     */
    function createNestedRecursiveToolStateTable (parent, properties) {
      var obj = d3.entries(properties);
      var td = parent.append('table')
        .classed('table table-condensed', true)
        .classed('table-bordered', false)
        .append('tbody').selectAll('tr')
        .data(obj)
        .enter()
        .append('tr')
        .selectAll('td')
        .data(function (d) {
          return [d.key, d.value];
        })
        .enter()
        .append('td');

        // if data data contains another nested object, call recursively
        // if not, just add the text to td
      td.each(function (data) {
        if (typeof data === 'object') {
          createNestedRecursiveToolStateTable(d3.select(this), data);
        } else {
          d3.select(this).text(function (dataOut) {
            return dataOut;
          });
        }
      });
    }

      /*
       * appends a table to its parent element
       * for tool state node element
       *
       * parent: html table cell element (parent table)
       */
    function createNestedToolStateTable (parent) {
      var text = parent[0][0].__data__;

      // prepare json
      text = text.replace(/\\/g, '');
      text = text.replace(/\'\{\'/g, '\{\'');
      text = text.replace(/\'\}\'/g, '\'\}');
      text = text.replace(/\'\'/g, '\'');
      text = text.replace(/\}\',/g, '\},');
      text = text.replace(/\}\'/g, '\}');

      // eliminate __xxxx__ parameters
      text = text.replace(/\'__(\S*)__\':\s{1}\d*(,\s{1})?/g, '');
      text = text.replace(/,\s{1}null/g, '');
      text = text.replace(/,\s{1}\}/g, '\}');

      // transform to json object
      var jsonData = JSON.parse(text);
      var obj = d3.entries(jsonData);

      // add nested table
      var td = parent.append('table')
        .classed('table table-condensed', true)
        .classed('table-bordered', false)
        .append('tbody').selectAll('tr')
        .data(obj)
        .enter()
        // add table row
        .append('tr')
        .selectAll('td')
        .data(function (d) {
          return [d.key, d.value];
        })
        .enter()
        // add table data
        .append('td');

      // if data data contains another nested object, call recursively
      // if not, just add the text to td
      td.each(function (data) {
        if (typeof data === 'object') {
          createNestedRecursiveToolStateTable(d3.select(this), data);
        } else {
          d3.select(this).text(function (data) { // eslint-disable-line no-shadow
            return data;
          });
        }
      });
    }

    /*
     * parses a string for its annotation parameters via regex
     *
     * text: string
     */
    function parseNodeAnnotation (text) {
      var annoProperties = [];

      if (text.length !== 0 && typeof text !== 'undefined') {
        var jsonSet = JSON.parse(d3.values(text).join(''));
        var kvSet = d3.entries(jsonSet);

        kvSet.forEach(function (a) {
          annoProperties.push({
            key: a.key,
            value: (a.value.name + '.' + a.value.type
            + '\n' + a.value.description).toString()
          });
        });
      }

      return annoProperties;
    }

// TODO: fix table width / overflow
    /*
     * appends a table to its parent element
     * for annotation node element
     *
     * parent: html table cell element (parent table)
     * returns: a key-value-pair list of annotation files
     */
    function createNestedAnnotationTable (parent) {
      var text = parent[0][0].__data__;
      var annoProperties = parseNodeAnnotation(text);

      if (typeof parent !== 'undefined') {
        parent.append('table')
          .classed('table table-condensed', true)
          .classed('table-bordered', false)
          .append('tbody').selectAll('tr')
          .data(annoProperties)
          .enter()
          .append('tr')
          .selectAll('td')
          .data(function (d) {
            return [d.key, d.value];
          })
          .enter()
          .append('td')
          .text(function (d) {
            return d;
          });
      }
    }

      /*
       * evaluates the node parameters for the table view
       *
       * tr: table row html element containing two tds
       *
       */
    function evalNodeParams (tr) {
      tr.each(function (d) {
        var td = null; // eslint-disable-line no-unused-vars
        if (this.cellIndex === 0) {
          switch (d) {
            case 'name':
              td = d3.select(this).text('Name');
              break;
            case 'id':
              td = d3.select(this).text('ID');
              break;
            case 'tool_id':
              td = d3.select(this).text('Tool ID');
              break;
            case 'tool_version':
              td = d3.select(this).text('Tool Version');
              break;
            case 'tool_state':
              td = d3.select(this).text('Parameters');
              break;
            case 'annotation':
              td = d3.select(this).text('Annotation');
              break;
            default:
              break;
          }
        } else if (this.cellIndex === 1) {
          if (this.__data__) {
            switch (this.parentNode.__data__[0]) {
              case 'name':
              case 'id':
              case 'tool_version':
                td = d3.select(this).text(d);
                break;
              case 'tool_id':
                td = d3.select(this).text(d);
                break;
              case 'tool_state':
                td = d3.select(this).append('div')
                  .attr('class', 'nestedTable').call(createNestedToolStateTable);
                break;
              case 'annotation':
                td = d3.select(this).call(createNestedAnnotationTable);
                break;
              default:
                break;
            }
          }
        }
      });
    }


  // #################################################################
  // ########## LAYOUT UPDATE ########################################
  // #################################################################

      /*
       * rearange link, node and linklabel positions for each tick in the force layout
       * links can be eighter cubic, quadratic, diagonals (d3 intern) or simple lines
       */
    function update () {
      // custom cubic bezier curve links
      canvas.selectAll('.link').attr('d', function (d) {
        // adapt start and end point to detailed view aswell
        var path = '';
        var srcXMovExp = d.source.x + shapeDim.node.width / 2
          + shapeDim.node_io.offset + shapeDim.node_io.width;
        var srcXExp = d.source.x + shapeDim.node.width
          + shapeDim.node_io.offset + shapeDim.node_io.width;
        var srcYExp = (shapeDim.node_io.height + 2) * (outputInputConFileLink(d)[0] + 1)
          - getOutputsLength(d.source.id) * (shapeDim.node_io.height + 2) / 2
          - shapeDim.node_io.height + shapeDim.node_io.height / 2;
        var tarXExp = d.target.x - shapeDim.node_io.width - shapeDim.node_io.offset;
        var tarYExp = (shapeDim.node_io.height + 2) * (outputInputConFileLink(d)[1] + 1)
          - getInputConnsLength(d.target.id) * (shapeDim.node_io.height + 2) / 2
          - shapeDim.node_io.height + shapeDim.node_io.height / 2;

        // when the source node is a input node
        if (getOutputsLength(d.source.id) === 0) {
          srcYExp = (shapeDim.node_io.height + 2) * (outputInputConFileLink(d)[0] + 1)
            - getInputsLength(d.source.id) * (shapeDim.node_io.height + 2) / 2
            - shapeDim.node_io.height + shapeDim.node_io.height / 2;

          tarYExp = (shapeDim.node_io.height + 2) * (inputInputConFileLink(d)[1] + 1)
            - getInputConnsLength(d.target.id) * (shapeDim.node_io.height + 2) / 2
            - shapeDim.node_io.height + shapeDim.node_io.height / 2;
        }

        // both source and target are collapsed
        if (d.source.expanded_out === false && d.target.expanded_in_con === false) {
          path = 'M' + (d.source.x + shapeDim.node.width / 2) + ',' + (d.source.y)	// M
            + ' c' + ((d.target.x - d.source.x - shapeDim.node.width) / 2)
            + ',' + '0 '	// C1
            + ((d.target.x - d.source.x - shapeDim.node.width) / 2) + ','
            + (d.target.y - d.source.y) + ' '	// C2
            + (d.target.x - d.source.x - shapeDim.node.width) + ','
            + (d.target.y - d.source.y);		// C3
        } else if (d.source.expanded_out === true
          && d.target.expanded_in_con === false) {
           // only source is expanded
          path = 'M' + (srcXMovExp) + ',' + (d.source.y + srcYExp)					// M
            + ' c' + ((d.target.x - srcXExp) / 2) + ',' + '0 ' // C1
            + ((d.target.x - srcXExp) / 2) + ','
            + (d.target.y - d.source.y - srcYExp) + ' '	// C2
            + (d.target.x - srcXExp) + ',' + (d.target.y - d.source.y - srcYExp); // C3
        } else if (
          // only target is expanded
          d.source.expanded_out === false && d.target.expanded_in_con === true
        ) {
          path = 'M' + (d.source.x + shapeDim.node.width / 2) + ','
            + (d.source.y)								// M
            + ' c' + ((tarXExp - (d.source.x + shapeDim.node.width)) / 2)
            + ',' + '0 '									// C1
            + ((tarXExp - (d.source.x + shapeDim.node.width)) / 2) + ','
            + (d.target.y - d.source.y + tarYExp) + ' '	// C2
            + (tarXExp - (d.source.x + shapeDim.node.width)) + ','
            + (d.target.y - d.source.y + tarYExp);		// C3
        } else {
          // both source and target are expanded
          path = 'M' + (srcXMovExp) + ',' + (d.source.y + srcYExp)	// M
            + ' c' + ((tarXExp - srcXExp) / 2) + ',' + '0 '	     // C1
            + ((tarXExp - srcXExp) / 2) + ','
            + (d.target.y - d.source.y - srcYExp + tarYExp) + ' '	// C2
            + (tarXExp - srcXExp) + ','
            + (d.target.y - d.source.y - srcYExp + tarYExp);		// C3
        }

        return path;
      });

      // node
      canvas.selectAll('.node').attr('transform', function (d) {
        return 'translate(' + parseInt(d.x, 10) + ',' + parseInt(d.y, + 10) + ')';
      });
    }


  // #################################################################
  // ########## MAIN #################################################
  // #################################################################

      /*
       * main callback function which takes care of:
       *		- parsing the json file
       *		- setting up the d3 scale
       *		- defining the force layout
       *		- printing workflow name and annotation
       *		- providing drag support
       * 		- extracting links and nodes from the json file
       *		- appends the actual link and node shapes
       *
       * data: raw datastructure from json file
       * canvas: visualization svg canvas
       */
    function visualizeWorkflow (data, canvas) { // eslint-disable-line no-shadow
      // extracted workflow dataset
      dataset = {
        steps: d3.values(data.steps),
        links: [],
        nodes: [],
        name: '',
        annotation: {},
        graph_depth: 0,
        graph_width: 0,
        columns: []
      };

      // x scale
      var xscale = d3.scale.linear()
        .domain([0, shapeDim.window.width])
        .range([0, shapeDim.window.width]);
      // y scale
      var yscale = d3.scale.linear()
        .domain([0, shapeDim.window.height])
        .range([0, shapeDim.window.height]);

          // zoom behavior (only with ctrl key down)
      zoom = d3.behavior.zoom();
      d3.select('#vis_workflow').select('svg').call(zoom.on('zoom', geometricZoom))
        .on('dblclick.zoom', null)
        .on('mousewheel.zoom', null)
        .on('DOMMouseScroll.zoom', null)
        .on('wheel.zoom', null);

      // zoom is allowed with ctrl-key down only
      d3.select('body').on('keydown', function () {
        if (d3.event.ctrlKey) {
          d3.select('#vis_workflow').select('svg')
            .call(zoom.on('zoom', geometricZoom));
        }
      });

      // on zoomend, disable zoom behavior again
      zoom.on('zoomend', function () {
        d3.select('#vis_workflow').select('svg').call(zoom.on('zoom', geometricZoom))
          .on('dblclick.zoom', null)
          .on('mousewheel.zoom', null)
          .on('DOMMouseScroll.zoom', null)
          .on('wheel.zoom', null);
      });

      // overlay rect for zoom
      canvas.append('g').append('rect')
        .attr('class', 'overlay')
        .attr('x', -shapeDim.window.width)
        .attr('y', -shapeDim.window.height)
        .attr('width', shapeDim.window.width * 4)
        .attr('height', shapeDim.window.height * 4)
        .attr('fill', 'none')
        .attr('pointer-events', 'all');

      // force layout definition
      force = d3.layout.force()
        .size(layoutProp.size)
        .linkDistance(layoutProp.linkDistance)
        .linkStrength(layoutProp.linkStrength)
        .friction(layoutProp.friction)
        .charge(layoutProp.charge)
        .theta(layoutProp.theta)
        .gravity(layoutProp.gravity)
        .on('tick', update);

      // drag and drop node enabled
      var drag = force.drag()
        .on('dragstart', dragstart)
        .on('dragend', dragend);

      // extract links via input connections
      dataset.steps.forEach(
        function (y) {
          if (y.input_connections !== null) {
            d3.values(y.input_connections).forEach(function (x) {
              dataset.links.push({
                source: +x.id, target: +y.id,
                id: ('link_' + x.id + '_' + y.id), highlighted: false
              });
            });
          }
        }
      );

      // extract nodes from steps
      dataset.steps.forEach(function (d) {
        if (d3.values(d.input_connections).length === 0) {
          dataset.nodes.push({ id: d.id, fixed: true, type: 'input' });
        } else if (!srcElemInArr(dataset.links, d.id)) {
          dataset.nodes.push({ id: d.id, fixed: true, type: 'output' });
        } else {
          dataset.nodes.push({ id: d.id, fixed: true });
        }
        dataset.nodes[d.id].highlighted = false;
        dataset.nodes[d.id].expanded_out = false;
        dataset.nodes[d.id].expanded_in_con = false;
        dataset.nodes[d.id].visited = false;
      });

      // add graph metrics
      inNodes = getInputNodes();
      outNodes = getOutputNodes();

      // set columns for nodes
      inNodes.forEach(function (d) {
        d.column = 0;
        d.visited = true;
      });

      inNodes.forEach(function (d) {
        calcColumns(d);
      });

      setGraphWidth();
      setGraphDepth();

      // add column expansion logic
      for (var k = 0; k < dataset.graph_depth; k++) {
        dataset.columns.push({ inputs: 0, outputs: 0 });	// number of
        // inputs and outputs of nodes expanded initially set to 0
      }

      // save subgraph for each node
      dataset.nodes.forEach(function (d, i) {
        var selNodeId = d.id;
        var subgraph = [];
        var graphIndex = -1;

        getSubgraphById(selNodeId, subgraph, graphIndex, selNodeId, 0);

        if (subgraph.length === 0) {
          dataset.nodes[i].subgraph = [];
        } else {
          dataset.nodes[i].subgraph = subgraph;
        }
      });

        // -----------------------------------------------------------------
        // ------------------- GALAXY LAYOUT COORDINATES -------------------
        // -----------------------------------------------------------------
      if (layout === layoutKind.GALAXY) {
        dataset.steps.forEach(function (d) {
          if (d.position !== null) {
            dataset.nodes[d.id].x = xscale(d.position.left);
            dataset.nodes[d.id].y = yscale(d.position.top);
          }
        });
      } else if (layout === layoutKind.REFINERY) {
        // ------------------- REFINERY LAYOUT COORDINATES -------------------
        // init rows for inputs first
        inNodes.forEach(function (d, i) {
          d.row = i;
        });

        // set all nodes to unvisited
        dataset.nodes.forEach(function (d) {
          d.visited = false;
        });

        // process layout
        for (var iDepth = 0; iDepth < dataset.graph_depth; iDepth++) {
          // for each column
          getNodesByCol(iDepth).forEach(function (cur) { // eslint-disable-line no-loop-func
            // get successors for column nodes
            var succNodes = getSuccNodesByNodeId(cur.id);

            // branch -> new rows to add before and after
            if (succNodes.length > 1) {
              // successors already visited
              var visited = getNumberOfVisitedNodesByArr(succNodes);
              var rowShift = parseInt(succNodes.length / 2, 10);

              // shift nodes before and after
              // only if there are more than one successor
              if (succNodes.length - visited > 1) {
                shiftNodesByRows(rowShift, cur.column, cur.row);
                shiftNodesByRows(rowShift, cur.column, cur.row + 1);
              }

              var succRow = cur.row - rowShift + visited;
              succNodes.forEach(function (succ) {
                if (succNodes.length % 2 === 0 && succRow === cur.row) {
                  succRow++;
                }

                if (dataset.nodes[succ].visited === false) {
                  dataset.nodes[succ].row = succRow;
                  dataset.nodes[succ].visited = true;
                  succRow++;
                }
              });
            } else {
              succNodes.forEach(function (succ) {
                dataset.nodes[succ].row = dataset.nodes[cur.id].row;
              });
            }
          });
        }

        var maxRow = 0;
        dataset.nodes.forEach(function (d) {
          if (d.row > maxRow) {
            maxRow = d.row;
          }
        });
        dataset.graph_rows = maxRow + 1;

        // set coordinates for nodes
        for (var i = 0; i < dataset.graph_depth; i++) {
          getNodesByCol(i).forEach(function (cur) { // eslint-disable-line no-loop-func
            cur.x = xscale(shapeDim.margin.left + cur.column * shapeDim.column.width);
            cur.y = yscale(shapeDim.margin.top + cur.row * shapeDim.row.height);
          });
        }
      } else {
        console.log('ERROR: No layout chosen!');
      }

        // -----------------------------------------------------------------
        // ------------------- SVG ELEMENTS --------------------------------
        // -----------------------------------------------------------------

      // force layout links and nodes
      var link = canvas.selectAll('.link');
      var node = canvas.selectAll('.node');

      // link represented as line
      link = link
        .data(dataset.links)
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('id', function (d) {
          return 'link_' + d.source + '_' + d.target;
        })
        .attr('stroke', 'gray')
        .attr('stroke-width', 1.5);

      // node represented as a group
      node = node
        .data(dataset.nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('id', function (d) {
          return 'node_' + d.id;
        })
        .call(drag);

      var nodeG = node.append('g').attr('class', 'nodeG');

      // node shape
      nodeG.append('rect')
        .attr('class', 'nodeRect')
        .attr('width', shapeDim.node.width)
        .attr('height', shapeDim.node.height)
        .attr('x', -shapeDim.node.width / 2)
        .attr('y', -shapeDim.node.height / 2)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', 'lightsteelblue')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1.5);

      // node title
      nodeG.append('g')
        .attr('transform', function () {
          return 'translate(' + 0 + ',' + parseInt(-shapeDim.node.height / 2, 10) + ')';
        })
        .attr('class', 'nodeTitle')
        .call(nodeTitle);

      // create tooltip
      // create d3-tip tooltips
      nodeG.each(function () {
        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function (d) {
            return '<span style="color:#fa9b30">' + dataset.steps[d.id].name + '</span>';
          });

        // invoke tooltip on dom element
        d3.select(this).call(tip);
        d3.select(this).on('mouseover', tip.show)
          .on('mouseout', tip.hide);
      });

      // node inputs
      var nodeInput = node.append('g').attr('transform', function () {
        return 'translate(' + parseInt((shapeDim.node.width / 2), 10) + ',' + 0 + ')';
      }).attr('class', 'nodeInput');

      // add groups for title rect pairs
      nodeInput.selectAll('nodeInputG')
        .data(function (d) {
          return d3.values(dataset.steps[d.id].inputs);
        }).enter().append('g')
        .attr('class', 'nodeInputG')
        .attr('id', function (d, m) {
          return 'nodeInputG_' + m;
        });

      // create input circle
      var nodeInputCircle = createNodeCircle(
        nodeInputCircle,
        node,
        'nodeInputCircle',
        'fileIconInputCircle',
        shapeDim.node.width / 2
      );

      // node input_con
      var nodeInputCon = node.append('g').attr('transform', function () {
        return 'translate(' + parseInt((-shapeDim.node.width / 2), 10) + ',' + 0 + ')';
      }).attr('class', 'nodeInputCon');

      // add groups for title rect pairs - without the interaction is not possible
      nodeInputCon.selectAll('nodeInputConG')
        .data(function (d) {
          return d3.values(dataset.steps[d.id].input_connections);
        }).enter().append('g')
        .attr('class', 'nodeInputConG').attr('id', function (d, l) {
          return 'nodeInputConG_' + l;
        });

      // create input con circle
      var nodeInputConCircle = createNodeCircle(
        nodeInputConCircle,
        node,
        'nodeInputConCircle',
        'fileIconInputConCircle',
        -shapeDim.node.width / 2
      );

      // node outputs
      var nodeOutput = node.append('g').attr('transform', function () {
        return 'translate(' + parseInt((shapeDim.node.width / 2), 10) + ',' + 0 + ')';
      }).attr('class', 'nodeOutput');

      // add groups for title rect pairs
      nodeOutput.selectAll('nodeOutputG')
        .data(function (d) {
          return d3.values(dataset.steps[d.id].outputs);
        })
        .enter()
        .append('g')
        .attr('class', 'nodeOutputG')
        .attr('id', function (d, n) {
          return 'nodeOutputG_' + n;
        });

      // create output circle
      var nodeOutputCircle = createNodeCircle(
        nodeOutputCircle,
        node,
        'nodeOutputCircle',
        'fileIconOutputCircle',
        shapeDim.node.width / 2
      );

      // dye circles when they contain at least one stored output
      node.each(function (d) {
        dyeCircles(d.id);
      });

      // remove unused svg elements (node specific)
      node.each(function (d) {
        // remove input svg group from nodes without inputs
        if (d3.values(dataset.steps[d.id].inputs).length === 0) {
          d3.select(this).select('.nodeInputCircle').remove();
          d3.select(this).select('.nodeInput').remove();
        }
        // remove input_cons icons and selectable node path
        if (d3.values(dataset.steps[d.id].input_connections).length === 0) {
          d3.select(this).select('.nodeInputConCircle').remove();
          d3.select(this).select('.nodePath').remove();
        }
        // remove output icons
        if (d3.values(dataset.steps[d.id].outputs).length === 0) {
          d3.select(this).select('.nodeOutputCircle').remove();
        }
        // change node rect for input nodes
        if (d3.values(dataset.steps[d.id].input_connections).length === 0) {
          d3.select(this).select('.nodeRect').attr('fill', 'white');
        }
      });

      // -----------------------------------------------------------------
      // ------------------- FORCE LAYOUT START --------------------------
      // -----------------------------------------------------------------

      // execute force layout
      // attention: after executing the force layout, link.source and
      // link.target obtain the node data structures instead of simple integer ids
      force.nodes(dataset.nodes).links(dataset.links).start();

      // initial fit to window call
      fitWfToWindow(0);

      // -----------------------------------------------------------------
      // ------------------- EVENTS --------------------------------------
      // -----------------------------------------------------------------

      // -----------------------------------------------------------------
      // ------------------- CLEAR HIGHLIGHTING AND REMOVE TABLE ---------
      // -----------------------------------------------------------------
      var overlayOnClick = function () {
        // remove old table on click
        d3.select('#workflowtbl').remove();
        clearHighlighting(link);
      };

      // -----------------------------------------------------------------
      // ------------------- FIT WORKFLOW TO WINDOW ----------------------
      // -----------------------------------------------------------------
      var overlayOnDblclick = function () {
        fitWfToWindow(1000);
      };

      // -----------------------------------------------------------------
      // ------------------- CLICK DBLCLICK SEPARATION -------------------
      // -----------------------------------------------------------------
      var firing = false;
      var timer; // eslint-disable-line no-unused-vars
      var overlayAction = overlayOnClick;	// default action

      d3.select('.overlay').on('click', function () {
        // suppress after dragend
        if (d3.event.defaultPrevented) return;

        // if dblclick, break
        if (firing) {
          return;
        }

        firing = true;
        // function overlayAction is called after a certain amount of time
        timer = setTimeout(function () {
          overlayAction();	// called always

          overlayAction = overlayOnClick; // set back click action to
          // single
          firing = false;
        }, 150); // timeout value
      });

      // if dblclick, the single click action is overwritten
      d3.select('.overlay').on('dblclick', function () {
        overlayAction = overlayOnDblclick;
      });

      // -----------------------------------------------------------------
      // ------------------- TABLE AND PATH HIGHLIGHTING -----------------
      // -----------------------------------------------------------------
      // update table data with properties of selected node
      node.select('.nodeG').on('click', function (x) {
        // suppress after dragend
        if (d3.event.defaultPrevented) return;

        // -----------------------------------------------------------------
        // ------------------- PATH HIGHLIGHTING ---------------------------
        // -----------------------------------------------------------------
        // get selected node
        var selPath = [];
        var selNodeRect = d3.select(this).select('.nodeRect');
        var selPathRect = d3.select(this.parentNode).selectAll('.inputConRect');

        x.subgraph.forEach(function (d, j) {
          selPath = selPath.concat.apply(selPath, x.subgraph[j]);
        });

        // clear previous highlighting
        overlayOnClick();

        if (typeof selPath[0] !== 'undefined') {
          // when path beginning with this node is not highlighted yet
          if (selPath[0].highlighted === false) {
            dyePath(selPath, selNodeRect, selPathRect, 'orange', 5, 'orange', true);
          } else {
            dyePath(selPath, selNodeRect, selPathRect, 'gray', 1.5, 'lightsteelblue', false);
          }
        }

        // -----------------------------------------------------------------
        // ------------------- TABLE ---------------------------------------
        // -----------------------------------------------------------------
        createTable(x);
      });


      // -----------------------------------------------------------------
      // ------------------- INPUT CON FILES -----------------------------
      // -----------------------------------------------------------------
      nodeInputConCircle.on('mouseover', function () {
        d3.select(this).select('.fileIconInputConCircle')
          .attr('stroke', 'steelblue').attr('stroke-width', 2);
      });

      nodeInputConCircle.on('mouseout', function () {
        d3.select(this).select('.fileIconInputConCircle')
          .attr('stroke', 'gray').attr('stroke-width', 1.5);
      });

      nodeInputConCircle.on('click', nodeInputConCircleEvent);

      // -----------------------------------------------------------------
      // ------------------- INPUT CON FILES REMOVE EVENT ----------------
      // -----------------------------------------------------------------
      d3.selectAll('.nodeInputCon').on('click', function (x) {
        x.expanded_in_con = false;
        dataset.columns[x.column].inputs -= 1;

        if (dataset.columns[x.column].inputs === 0 && (
          layout === layoutKind.REFINERY || layout === layoutKind.GALAXY
          )) {
          updateColumnTranslation(x.column, layoutTranslation.COLLAPSE_LEFT);
        }

        // show input con circle again
        var curNodeId = this.parentNode.__data__.id;
        var nodeCircle = d3.select('#node_' + curNodeId).select('.nodeInputConCircle');

        nodeCircle.attr('opacity', 1);

        // remove expanded files
        removeGlobalTooltip('#tt_id-' + curNodeId);
        d3.select(this.parentNode).selectAll('.inputConRect').remove();
        d3.select(this.parentNode).selectAll('.inputConRectTitle').remove();
        d3.select(this.parentNode).selectAll('.inputConRectCircle').remove();
        d3.select(this.parentNode).selectAll('.inputConRectCircleG').remove();

        force.resume();
        update();
      });

      // -----------------------------------------------------------------
      // ------------------- OUTPUT FILES --------------------------------
      // -----------------------------------------------------------------
      nodeOutputCircle.on('mouseover', function () {
        d3.select(this).select('.fileIconOutputCircle')
          .attr('stroke', 'steelblue')
          .attr('stroke-width', 2);
      });

      nodeOutputCircle.on('mouseout', function () {
        d3.select(this).select('.fileIconOutputCircle')
          .attr('stroke', 'gray')
          .attr('stroke-width', 1.5);
      });

      nodeOutputCircle.on('click', nodeOutputCircleEvent);

      // -----------------------------------------------------------------
      // ------------------- OUTPUT FILES REMOVE EVENT -------------------
      // -----------------------------------------------------------------
      d3.selectAll('.nodeOutput').on('click', function (x) {
        x.expanded_out = false;
        dataset.columns[x.column].outputs -= 1;

        if (dataset.columns[x.column].outputs === 0 && (
          layout === layoutKind.REFINERY || layout === layoutKind.GALAXY)
        ) {
          updateColumnTranslation(x.column, layoutTranslation.COLLAPSE_RIGHT);
        }

        // show output circle again
        var curNodeId = this.parentNode.__data__.id;
        var nodeCircle = d3.select('#node_' + curNodeId).select('.nodeOutputCircle');
        nodeCircle.attr('opacity', 1);

        // remove expanded files
        removeGlobalTooltip('#tt_id-' + curNodeId);
        d3.select(this.parentNode).selectAll('.outputRect').remove();
        d3.select(this.parentNode).selectAll('.outRectTitle').remove();
        d3.select(this.parentNode).selectAll('.outRectCircle').remove();
        d3.select(this.parentNode).selectAll('.outRectCircleG').remove();

        force.resume();
        update();
      });

      // -----------------------------------------------------------------
      // ------------------- INPUT FILES ---------------------------------
      // -----------------------------------------------------------------
      nodeInputCircle.on('mouseover', function () {
        d3.select(this).select('.fileIconInputCircle')
          .attr('stroke', 'steelblue').attr('stroke-width', 2);
      });

      nodeInputCircle.on('mouseout', function () {
        d3.select(this).select('.fileIconInputCircle')
          .attr('stroke', 'gray').attr('stroke-width', 1.5);
      });

      nodeInputCircle.on('click', nodeInputCircleEvent);

        // -----------------------------------------------------------------
        // ------------------- INPUT FILES REMOVE EVENT -------------------
        // -----------------------------------------------------------------
      d3.selectAll('.nodeInput').on('click', function (x) {
        x.expanded_out = false;
        dataset.columns[x.column].outputs -= 1;

        if (dataset.columns[x.column].outputs === 0 && (
          layout === layoutKind.REFINERY || layout === layoutKind.GALAXY)
        ) {
          updateColumnTranslation(x.column, layoutTranslation.COLLAPSE_RIGHT);
        }

        // show input circle again
        var curNodeId = this.parentNode.__data__.id;
        var nodeCircle = d3.select('#node_' + curNodeId).select('.nodeInputCircle');
        nodeCircle.attr('opacity', 1);

        // remove expanded files
        removeGlobalTooltip('#tt_id-' + curNodeId);
        d3.select(this.parentNode).selectAll('.inputRect').remove();
        d3.select(this.parentNode).selectAll('.inputRectTitle').remove();
        d3.select(this.parentNode).selectAll('.inRectCircle').remove();
        d3.select(this.parentNode).selectAll('.inRectCircleG').remove();

        force.resume();
        update();
      });

      // -----------------------------------------------------------------
      // ------------------- WINDOW RESIZE -------------------------------
      // -----------------------------------------------------------------
      d3.select(window).on('resize', resize);
    }
  }
})();
