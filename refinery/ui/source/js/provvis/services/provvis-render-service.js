/**
 * Provvis Render  Service
 * @namespace provvisRenderService
 * @desc Service for rendering the provvis graph
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisRenderService', provvisRenderService);

  provvisRenderService.$inject = [
    '$',
    'd3',
    '$log',
    '$timeout',
    'provvisAnalysisTimelineService',
    'provvisDagreLayoutService',
    'provvisDragService',
    'provvisDrawColorCodingService',
    'provvisDrawDOIService',
    'provvisDrawLinksService',
    'provvisDrawTimelineService',
    'provvisHandleCollapseService',
    'provvisHelpersService',
    'provvisHighlightService',
    'provvisInitDOIService',
    'provvisNodeSelectionService',
    'provvisPartsService',
    'provvisToolbarService',
    'provvisTooltipService',
    'provvisUpdateAnalysisService',
    'provvisUpdateLayerService',
    'provvisUpdateNodeLinksService'
  ];

  function provvisRenderService (
    $,
    d3,
    $log,
    $timeout,
    provvisAnalysisTimelineService,
    provvisDagreLayoutService,
    provvisDragService,
    provvisDrawColorCodingService,
    provvisDrawDOIService,
    provvisDrawLinksService,
    provvisDrawTimelineService,
    provvisHandleCollapseService,
    provvisHelpersService,
    provvisHighlightService,
    provvisInitDOIService,
    provvisNodeSelectionService,
    provvisPartsService,
    provvisToolbarService,
    provvisTooltipService,
    provvisUpdateAnalysisService,
    provvisUpdateLayerService,
    provvisUpdateNodeLinksService
  ) {
    var collapseService = provvisHandleCollapseService;
    var dagreService = provvisDagreLayoutService;
    var doiService = provvisInitDOIService;
    var dragService = provvisDragService;
    var drawColorService = provvisDrawColorCodingService;
    var drawService = provvisDrawLinksService;
    var drawDOI = provvisDrawDOIService;
    var drawTimelineService = provvisDrawTimelineService;
    var provvisHelpers = provvisHelpersService;
    var highlightService = provvisHighlightService;
    var nodeSelectionService = provvisNodeSelectionService;
    var partsService = provvisPartsService;
    var timelineService = provvisAnalysisTimelineService;
    var toolbarService = provvisToolbarService;
    var tooltipService = provvisTooltipService;
    var updateAnalysis = provvisUpdateAnalysisService;
    var updateLayer = provvisUpdateLayerService;
    var updateNodeLink = provvisUpdateNodeLinksService;

    var analysisWorkflowMap = d3.map();
    var width = 0;
    var depth = 0;

    var filterMethod = partsService.filterMethod;
    var timeLineGradientScale = partsService.timeLineGradientScale;

    var draggingActive = partsService.draggingActive;

    var linkStyle = partsService.linkStyle;

    var doiAutoUpdate = partsService.doiAutoUpdate;

    var service = {
      analysisWorflowMap: analysisWorkflowMap,
      width: width,
      depth: depth,
      filterMethod: filterMethod,
      timeLineGradientScale: timeLineGradientScale,
      runRender: runRender
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function runRender (vis) {
      /* Save vis object to module scope. */

      var cell = vis.cell;

      partsService.lNodesBAK = vis.graph.lNodes;
      partsService.aNodesBAK = vis.graph.aNodes;
      partsService.saNodesBAK = vis.graph.saNodes;
      partsService.nodesBAK = vis.graph.nodes;
      partsService.lLinksBAK = vis.graph.lLinks;
      partsService.aLinksBAK = vis.graph.aLinks;

      analysisWorkflowMap = vis.graph.analysisWorkflowMap;

      width = vis.graph.l.width;
      depth = vis.graph.l.depth;

      partsService.timeColorScale = timelineService.createAnalysistimeColorScale(
        vis.graph.aNodes,
        ['white', 'black']
      );

      doiService.initDoiTimeComponent(vis.graph.aNodes);

      /* Init all nodes filtered. */
      doiService.initDoiFilterComponent(vis.graph.lNodes);
      partsService.filterAction = 'blend';

      /* Init all nodes with the motif diff. */
      doiService.initDoiLayerDiffComponent(vis.graph.lNodes, vis.graph.aNodes);

      /* Draw analysis links. */
      vis.canvas.append('g').classed({
        aHLinks: true
      });
      vis.canvas.append('g').classed({
        aLinks: true
      });
      updateAnalysis.updateAnalysisLinks(vis, linkStyle);

      /* Draw layer nodes and links. */
      dagreService.dagreLayerLayout(vis.graph);
      vis.canvas.append('g').classed({
        lLinks: true
      });
      vis.canvas.append('g').classed({
        layers: true
      });

      updateLayer.updateLayerLinks(vis.graph.lLinks);
      updateLayer.updateLayerNodes(vis.graph.lNodes);

      /* Draw analysis nodes. */
      vis.canvas.append('g').classed({
        analyses: true
      });
      updateAnalysis.updateAnalysisNodes(vis, cell);

      /* Draw subanalysis nodes. */
      drawService.drawSubanalysisNodes();

      /* Draw nodes. */
      partsService.node = drawService.drawNodes();

      /* Concat aNode, saNode and node. */
      partsService.domNodeset = provvisHelpers.concatDomClassElements(
        ['lNode', 'aNode', 'saNode', 'node']
      );

      /* Add dragging behavior to nodes. */
      dragService.applyDragBehavior(partsService.layer);
      dragService.applyDragBehavior(partsService.analysis);

      /* Initiate doi. */
      vis.graph.aNodes.forEach(function (an) {
        collapseService.handleCollapseExpandNode(an, 'c', 'auto');
      });
      updateNodeLink.updateNodeFilter();
      updateNodeLink.updateLinkFilter();

      collapseService.updateNodeDoi(partsService.domNodeset);

      /* Draw timeline view. */
      // timeout, JM bug fix due to dom generation
      $timeout(function () {
        drawTimelineService.drawTimelineView(vis);
      }, 0);

      /* Draw doi view. */
      drawDOI.drawDoiView();

      /* Draw colorcoding view. */
      drawColorService.drawColorcodingView();

      /* Event listeners. */
      handleEvents(vis.graph, partsService.domNodeset);

      /* Set initial graph position. */
      provvisHelpers.fitGraphToWindow(0);
      $log.info(
        'Graph has ' + vis.graph.nodes.length + ' files and tools, '
        + vis.graph.links.length + ' Links, ' + vis.graph.saNodes.length +
        ' Analysis Groups, ' + vis.graph.aNodes.length + ' analyses, and '
        + vis.graph.lNodes.size() + ' layers.'
      );
    }

      /* TODO: Recompute layout only after all nodes were collapsed/expanded. */

    /**
     * Handle events.
     * @param graph Provenance graph object.
     */
    function handleEvents (graph, domNodeset) {
      var saBBox = partsService.saBBox;
      var aBBox = partsService.aBBox;
      var lBBox = partsService.lBBox;

      toolbarService.handleToolbar(graph);

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
            nodeSelectionService.handleNodeSelection(d);
            updateNodeLink.updateNodeInfoTab(d);
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
        collapseService.handleCollapseExpandNode(d, 'e');
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
            highlightService.clearHighlighting(graph.links);
            nodeSelectionService.clearNodeSelection();

            /* TODO: Temporarily enabled. */
            if (doiAutoUpdate) {
              drawDOI.recomputeDOI();
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
          provvisHelpers.fitGraphToWindow(1000);
        });

      /* Handle tooltips. */
      tooltipService.handleTooltips();
      /* TODO: Currently disabled. */
      // handleDebugTooltips();

      /* Collapse on bounding box click.*/
      saBBox.on('click', function (d) {
        if (!draggingActive) {
          collapseService.handleCollapseExpandNode(d.children.values()[0], 'c');

          /* TODO: Temporarily disabled. */
          /* Deselect. */
          // clearNodeSelection();

        /* Update node doi. */
        // updateNodeDoi();
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
                  collapseService.handleCollapseExpandNode(san.children.values()[0], 'c');
                });
              } else {
                collapseService.handleCollapseExpandNode(d.children.values()[0], 'c');
              }
            } else {
              collapseService.handleCollapseExpandNode(d, 'c');
            }

          /* TODO: Temporarily disabled. */
          /* Deselect. */
          // clearNodeSelection();
          /* Update node doi. */
          // updateNodeDoi();
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
            collapseService.handleCollapseExpandNode(san.children.values()[0], 'c');
          });
          collapseService.handleCollapseExpandNode(d.children.values()[0], 'c');
          collapseService.handleCollapseExpandNode(d, 'c');

        /* TODO: Temporarily disabled. */
        /* Deselect. */
        // clearNodeSelection();
        /* Update node doi. */
        // updateNodeDoi();
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
              collapseService.handleCollapseExpandNode(san.children.values()[0], 'c');
            });
            collapseService.handleCollapseExpandNode(an.children.values()[0], 'c');
          });
          collapseService.handleCollapseExpandNode(d.children.values()[0], 'c');

        /* TODO: Temporarily disabled. */
        /* Deselect. */
        // clearNodeSelection();
        /* Update node doi. */
        // updateNodeDoi();
        }
      });

      /* Handle path highlighting. */
      d3.selectAll('.glAnchor').on('click', function (d) {
        highlightService.handlePathHighlighting(d, 'p');
      }).on('mousedown', function () {
        d3.event.stopPropagation();
      });

      d3.selectAll('.grAnchor').on('click', function (d) {
        highlightService.handlePathHighlighting(d, 's');
      }).on('mousedown', function () {
        d3.event.stopPropagation();
      });
    }
  }
})();
