/**
 * Provvis Decl Service
 * @namespace provvisDeclService
 * @desc Service for constructor function declaration.
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDeclService', provvisDeclService);

  provvisDeclService.$inject = [
    'provvisDeclDoiComponents',
    'provvisDeclDoiFactors'
  ];

  function provvisDeclService (
    provvisDeclDoiComponents,
    provvisDeclDoiFactors
  ) {
    var DoiFactors = provvisDeclDoiFactors;
    var DoiComponents = provvisDeclDoiComponents;

    var service = {
      Analysis: Analysis,
      BaseNode: BaseNode,
      DoiComponents: DoiComponents,
      DoiFactors: DoiFactors,
      Layer: Layer,
      Link: Link,
      Motif: Motif,
      Node: Node,
      ProvGraph: ProvGraph,
      ProvVis: ProvVis,
      Subanalysis: Subanalysis
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
   /**
   * Module for constructor function declaration.
   */

    /**
     * Constructor function of the super node inherited by Node, Analysis and
     * Subanalysis.
     *
     * @param id
     * @param nodeType
     * @param parent
     * @param hidden
     * @constructor
     */
    function BaseNode (id, nodeType, parent, hidden) { // eslint-disable-line new-cap
      this.id = id;
      this.nodeType = nodeType;
      this.parent = parent;
      this.hidden = hidden;

      this.preds = d3.map();
      this.succs = d3.map();
      this.predLinks = d3.map();
      this.succLinks = d3.map();
      this.children = d3.map();
      this.x = 0;
      this.y = 0;

      /* Layout specific. */
      this.l = {

        /* Top sort markings [Kahn 1962]. */
        ts: {
          removed: false
        },

        /* Graph attributes. */
        width: 0,
        depth: 0,

        bcOrder: -1
      };

      BaseNode.numInstances = (BaseNode.numInstances || 0) + 1;
      this.autoId = BaseNode.numInstances;

      this.doi = new DoiComponents.DoiComponents(this); // eslint-disable-line new-cap
      this.selected = false;
      this.filtered = true;
    }

    /**
     * Constructor function for the node data structure.
     *
     * @param id
     * @param nodeType
     * @param parent
     * @param hidden
     * @param name
     * @param fileType
     * @param study
     * @param assay
     * @param parents
     * @param analysis
     * @param subanalysis
     * @param uuid
     * @param fileUrl
     * @constructor
     */

    function Node (id, nodeType, parent, hidden, name, fileType, study,
      assay, parents, analysis, subanalysis, uuid, fileUrl) {
      BaseNode.call(this, id, nodeType, parent, hidden);

      this.name = name;
      this.label = '';
      this.fileType = fileType;
      this.study = study;
      this.assay = assay;
      this.parents = parents;
      this.analysis = analysis;
      this.subanalysis = subanalysis;
      this.uuid = uuid;
      this.fileUrl = fileUrl;

      this.attributes = d3.map();
    }

    Node.prototype = Object.create(BaseNode.prototype); // eslint-disable-line no-unreachable
    Node.prototype.constructor = Node; // eslint-disable-line no-unreachable

    /**
     * Constructor function for the analysis node data structure.
     *
     * @param id
     * @param parent
     * @param hidden
     * @param uuid
     * @param wfUuid
     * @param analysis
     * @param start
     * @param end
     * @param created
     * @constructor
     */
    function Analysis (id, parent, hidden, uuid, wfUuid, analysis, start,
      end, created) {
      BaseNode.call(this, id, 'analysis', parent, hidden);

      this.uuid = uuid;
      this.wfUuid = wfUuid;
      this.analysis = analysis;
      this.start = start;
      this.end = end;
      this.created = created;

      this.inputs = d3.map();
      this.outputs = d3.map();
      this.links = d3.map();

      this.wfName = '';
      this.wfCode = '';

      this.layer = '';
      this.motif = '';

      this.exaggerated = false;

      this.motifDiff = {
        numIns: 0,
        numOuts: 0,
        wfUuid: this.wfUuid,
        numSubanalyses: 0
      };
    }

    Analysis.prototype = Object.create(BaseNode.prototype); // eslint-disable-line no-unreachable
    Analysis.prototype.constructor = Analysis; // eslint-disable-line no-unreachable

    /**
     * Constructor function for the subanalysis node data structure.
     *
     * @param id
     * @param parent
     * @param hidden
     * @param subanalysis
     * @constructor
     */
    function Subanalysis (id, parent, hidden, subanalysis) {
      BaseNode.call(this, id, 'subanalysis', parent, hidden);

      this.subanalysis = subanalysis;

      this.wfUuid = '';
      this.inputs = d3.map();
      this.outputs = d3.map();
      this.links = d3.map();
    }

    Subanalysis.prototype = Object.create(BaseNode.prototype); // eslint-disable-line no-unreachable
    Subanalysis.prototype.constructor = Subanalysis; // eslint-disable-line no-unreachable

    /**
     * Constructor function for the motif data structure.
     *
     * @constructor
     */
    function Motif () {
      this.preds = d3.map();
      this.succs = d3.map();
      this.numIns = 0;
      this.numOuts = 0;
      this.wfUuid = '';
      this.numSubanalyses = 0;
      this.file = '';

      Motif.numInstances = (Motif.numInstances || 0) + 1;
      this.autoId = Motif.numInstances;
    }

    /**
     * Constructor function for the provenance layered node data structure.
     *
     * @param id
     * @param parent
     * @param hidden
     * @constructor
     */
    function Layer (id, motif, parent, hidden) {
      BaseNode.call(this, id, 'layer', parent, hidden);

      this.inputs = d3.map();
      this.outputs = d3.map();
      this.links = d3.map();

      this.motif = motif;
      this.wfName = '';
      this.constructor = Layer;
    }

    Layer.prototype = Object.create(BaseNode.prototype); // eslint-disable-line no-unreachable
    Layer.prototype.constructor = Layer; // eslint-disable-line no-unreachable

    /**
     * Constructor function for the link data structure.
     *
     * @param id
     * @param source
     * @param target
     * @param hidden
     * @constructor
     */
    function Link (id, source, target, hidden) {
      this.id = id;
      this.source = source;
      this.target = target;
      this.hidden = hidden;
      this.highlighted = false;
      this.filtered = true;

      /* Layout computation specific flags. */
      this.l = {

        /* Top sort markings [Kahn 1962]. */
        ts: {
          removed: false
        }
      };

      Link.numInstances = (Link.numInstances || 0) + 1;
      this.autoId = Link.numInstances;
    }

    /**
     * Constructor function for the provenance visualization.
     *
     * @param parentDiv
     * @param zoom
     * @param data
     * @param url
     * @param canvas
     * @param rect
     * @param margin
     * @param width
     * @param height
     * @param radius
     * @param color
     * @param graph
     * @param cell
     * @param layerMethod
     * @constructor
     */
    function ProvVis (parentDiv, zoom, data, url, canvas, rect, margin,
      width, height, radius, color, graph, cell,
      layerMethod) {
      this._parentDiv = parentDiv;
      this.zoom = zoom;
      this._data = data;
      this._url = url;

      this.canvas = canvas;
      this.rect = rect;
      this.margin = margin;
      this.width = width;
      this.height = height;
      this.radius = radius;
      this.color = color;
      this.graph = graph;
      this.cell = cell;
      this.layerMethod = layerMethod;
    }

    /**
     * Constructor function for the provenance graph.
     *
     * @param dataset
     * @param nodes
     * @param links
     * @param aLinks
     * @param iNodes
     * @param oNodes
     * @param aNodes
     * @param saNodes
     * @param analysisWorkflowMap
     * @param nodeMap
     * @param analysisData
     * @param workflowData
     * @param nodeData
     * @constructor
     */
    function ProvGraph (dataset, nodes, links, aLinks, iNodes, oNodes,
      aNodes, saNodes, analysisWorkflowMap, nodeMap,
      analysisData, workflowData,
      nodeData) {
      this.dataset = dataset;
      this.nodes = nodes;
      this.links = links;
      this.aLinks = aLinks;
      this.iNodes = iNodes;
      this.oNodes = oNodes;
      this.aNodes = aNodes;
      this.saNodes = saNodes;
      this.bclgNodes = [];

      this.analysisWorkflowMap = analysisWorkflowMap;
      this.nodeMap = nodeMap;
      this.analysisData = analysisData;
      this.workflowData = workflowData;
      this.nodeData = nodeData;

      /* Layout specific. */
      this.l = {
        width: 0,
        depth: 0
      };

      this.lNodes = d3.map();
      this.lLinks = d3.map();
    }
  }
})();
