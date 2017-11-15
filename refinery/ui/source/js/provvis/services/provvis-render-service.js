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
    'provvisAnalysisTimelineService',
    'provvisDagreLayoutService',
    'provvisDeclService',
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
    'provvisUpdateRenderService',
    'd3',
    '$log'
  ];

  function provvisRenderService (
    provvisAnalysisTimelineService,
    provvisDagreLayoutService,
    provvisDeclService,
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
    provvisUpdateRenderService,
    d3,
    $log
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
    var provvisDecl = provvisDeclService;
    var timelineService = provvisAnalysisTimelineService;
    var toolbarService = provvisToolbarService;
    var tooltipService = provvisTooltipService;
    var updateAnalysis = provvisUpdateAnalysisService;
    var updateService = provvisUpdateRenderService;

    var analysisWorkflowMap = d3.map();
    var width = 0;
    var depth = 0;

    var timeColorScale = Object.create(null);
    var filterMethod = 'timeline';
    var timeLineGradientScale = Object.create(null);

    var lastSolrResponse = {};

    var selectedNodeSet = d3.map();

    var draggingActive = false;

    var scaleFactor = 0.75;

    var layoutCols = d3.map();

    var linkStyle = 'bezier1';

    var colorStrokes = '#136382';
    var colorHighlight = '#ed7407';

    var fitToWindow = true;

    var doiDiffScale = Object.create(null);

    var doiAutoUpdate = partsService.doiAutoUpdate;

    /* Simple tooltips by NG. */
    var tooltip = d3.select('body')
      .append('div')
      .attr('class', 'refinery-tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('visibility', 'hidden');

    var service = {
      analysisWorflowMap: analysisWorkflowMap,
      width: width,
      depth: depth,
      timeColorScale: timeColorScale,
      filterMethod: filterMethod,
      timeLineGradientScale: timeLineGradientScale,
      lastSolrResponse: lastSolrResponse,
      selectedNodeSet: selectedNodeSet,
      layoutCols: layoutCols,
      colorStrokes: colorStrokes,
      colorHighlight: colorHighlight,
      fitToWindow: fitToWindow,
      doiDiffScale: doiDiffScale,
      tooltip: tooltip,
      getWfNameByNode: getWfNameByNode,
      runRender: runRender
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function runRender (provVis) {
      partsService.initializeDomObj();
      /* Save vis object to module scope. */
      angular.copy(provVis, partsService.vis);
      angular.copy(provVis.cell, partsService.cell);

      var vis = partsService.vis;
      var cell = partsService.cell;

      angular.copy(vis.graph.lNodes, partsService.lNodesBAK);
      angular.copy(vis.graph.aNodes, partsService.aNodesBAK);
      angular.copy(vis.graph.saNodes, partsService.saNodesBAK);
      angular.copy(vis.graph.nodes, partsService.nodesBAK);
      angular.copy(vis.graph.lLinks, partsService.lLinksBAK);
      angular.copy(vis.graph.aLinks, partsService.lLinksBAK);

      analysisWorkflowMap = vis.graph.analysisWorkflowMap;

      width = vis.graph.l.width;
      depth = vis.graph.l.depth;

      timeColorScale = timelineService.createAnalysistimeColorScale(
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
      updateService.updateLayerLinks(vis.graph.lLinks);
      updateService.updateLayerNodes(vis.graph.lNodes);

      /* Draw analysis nodes. */
      vis.canvas.append('g').classed({
        analyses: true
      });
      updateAnalysis.updateAnalysisNodes(
        vis,
        scaleFactor,
        cell,
        timeColorScale
      );

      /* Draw subanalysis nodes. */
      drawService.drawSubanalysisNodes();

      /* Draw nodes. */
      drawService.drawNodes();

      /* Concat aNode, saNode and node. */
      angular.copy(
        provvisHelpers
          .concatDomClassElements(['lNode', 'aNode', 'saNode', 'node']),
        partsService.domNodeSet
      );
    //  domNodeset = provvisHelpers.concatDomClassElements(['lNode',
      // 'aNode', 'saNode', 'node']);

      /* Add dragging behavior to nodes. */
      dragService.applyDragBehavior(partsService.layer);
      dragService.applyDragBehavior(partsService.analysis);

      /* Initiate doi. */
      vis.graph.aNodes.forEach(function (an) {
        collapseService.handleCollapseExpandNode(an, 'c', 'auto');
      });
      updateService.updateNodeFilter();
      updateService.updateLinkFilter();
      updateService.updateNodeDoi();

      /* Draw timeline view. */
      drawTimelineService.drawTimelineView(vis);

      /* Draw doi view. */
      drawDOI.drawDoiView();

      /* Draw colorcoding view. */
      drawColorService.drawColorcodingView();

      /* Event listeners. */
      handleEvents(vis.graph);

      /* Set initial graph position. */
      provvisHelpers.fitGraphToWindow(0);
      /* console.log(vis.graph); */
      $log(
        'Graph has ' + vis.graph.nodes.length + ' files and tools, '
        + vis.graph.links.length + ' Links, ' + vis.graph.saNodes.length +
        ' Analysis Groups, ' + vis.graph.aNodes.length + ' analyses, and '
        + vis.graph.lNodes.size() + ' layers.'
      );
    }


      /**
   * Get workflow name string.
   * @param n Node of type BaseNode.
   * @returns {string} The name string.
   */
    function getWfNameByNode (n) {
      var vis = partsService.vis;
      var wfName = 'dataset';
      var an = n;
      while (!(an instanceof provvisDecl.Analysis)) {
        an = an.parent;
      }
      if (typeof vis.graph.workflowData.get(an.wfUuid) !== 'undefined') {
        wfName = vis.graph.workflowData.get(an.wfUuid).name;
      }
      return wfName.toString();
    }

      /* TODO: Recompute layout only after all nodes were collapsed/expanded. */

    /**
     * Handle events.
     * @param graph Provenance graph object.
     */
    function handleEvents (graph) {
      var saBBox = partsService.saBBox;
      var aBBox = partsService.aBBox;
      var lBBox = partsService.lBBox;

      toolbarService.handleToolbar(graph);

      /* Handle click separation on nodes. */
      var domNodesetClickTimeout;
      partsService.domNodeset.on('mousedown', function (d) {
        if (d3.event.defaultPrevented) {
          return;
        }
        clearTimeout(domNodesetClickTimeout);


        /* Click event is executed after 100ms unless the double click event
         below clears the click event timeout.*/
        domNodesetClickTimeout = setTimeout(function () {
          if (!draggingActive) {
            nodeSelectionService.handleNodeSelection(d);
            updateService.updateNodeInfoTab(d);
          }
        }, 200);
      });

      partsService.domNodeset.on('dblclick', function (d) {
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
