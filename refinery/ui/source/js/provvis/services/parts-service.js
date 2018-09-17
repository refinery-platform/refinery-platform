/**
 * Provvis Parts Service
 * @namespace provvisPartsService
 * @desc Service for maintaining provvis parts
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisPartsService', provvisPartsService);

  provvisPartsService.$inject = [];

  function provvisPartsService (
  ) {
    var colorHighlight = '#ed7407';
    var colorStrokes = '#136382';
    var nodeLinkTransitionTime = 1000;
    var doiAutoUpdate = false;
    var scaleFactor = 0.75;

    var vis = Object.create(null);
    var cell = Object.create(null);

    /* Initialize dom elements. */
    var lNode = Object.create(null);
    var aNode = Object.create(null);
    var saNode = Object.create(null);
    var node = Object.create(null);
    var domNodeset = []; // should be updated with selected nodes
    var selectedNodeSet = d3.map();
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

    var filterAction = Object.create(null);

    var aNodesBAK = [];
    var saNodesBAK = [];
    var nodesBAK = [];
    var aLinksBAK = [];
    var lLinksBAK = d3.map();
    var lNodesBAK = d3.map();

    var layoutCols = d3.map();
    var linkStyle = 'bezier1';
    var fitToWindow = true;

    var draggingActive = false;
    var timeColorScale = Object.create(null);
    var filterMethod = 'timeline';
    var timeLineGradientScale = Object.create(null);

    var doiDiffScale = Object.create(null);
    var lastSolrResponse = {};

       /* Simple tooltips by NG. */
    var tooltip = d3.select('body')
      .append('div')
      .attr('class', 'refinery-tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('visibility', 'hidden');

    var service = {
      aBBox: aBBox,
      aLink: aLink,
      aLinksBAK: aLinksBAK,
      analysis: analysis,
      aNode: aNode,
      aNodesBAK: aNodesBAK,
      cell: cell,
      colorHighlight: colorHighlight,
      colorStrokes: colorStrokes,
      doiAutoUpdate: doiAutoUpdate,
      doiDiffScale: doiDiffScale,
      domNodeset: domNodeset, // should be updated with selected nodes
      draggingActive: draggingActive,
      filterAction: filterAction,
      filterMethod: filterMethod,
      fitToWindow: fitToWindow,
      hLink: hLink,
      lastSolrResponse: lastSolrResponse,
      layer: layer,
      layoutCols: layoutCols,
      lBBox: lBBox,
      link: link,
      lLink: lLink,
      lLinksBAK: lLinksBAK,
      lNode: lNode,
      lNodesBAK: lNodesBAK,
      linkStyle: linkStyle,
      node: node,
      nodesBAK: nodesBAK,
      nodeLinkTransitionTime: nodeLinkTransitionTime,
      saBBox: saBBox,
      saLink: saLink,
      saNode: saNode,
      saNodesBAK: saNodesBAK,
      scaleFactor: scaleFactor,
      selectedNodeSet: selectedNodeSet,
      subanalysis: subanalysis,
      timeColorScale: timeColorScale,
      timeLineGradientScale: timeLineGradientScale,
      tooltip: tooltip,
      vis: vis
    };

    return service;
  }
})();
