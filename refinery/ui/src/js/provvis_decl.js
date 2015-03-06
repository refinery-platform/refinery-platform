/**
 * Module for constructor function declaration.
 */
var provvisDecl = function () {

    /**
     * Constructor function representing the degree-of-interest (DOI) components for BaseNode.
     * @param node The encapsulating node.
     * @constructor
     */
    var DoiComponents = function (node) {

        this.node = node;

        /* API: General interest. */
        /**************************/

        /* The latest execution time of a node is more important than earlier executions.*/
        this.doiTime = 0;

        /* For layered nodes: Workflow parameters, files or topology changes over time.*/
        this.change = {wfParams: d3.map(), files: d3.map(), topology: d3.map()};

        /* Corresponds to the node type: Node, subanalysis, analysis.*/
        this.relationship = 0;

        /* The overall graph width and height influences node appearances.*/
        this.graphMetrics = {width: -1, height: -1};


        /* UI: Interest derived from user actions. */
        /*******************************************/

        /* A node is in the result set of filter actions. */
        this.doiFiltered = 0;

        /* A node is selected by user actions. */
        this.doiSelected = 0;

        /* A node is part of a node-link path highlighted. */
        this.doiHighlighted = 0;

        /* A node's attribute is matched during a search task. */
        this.searched = 0;

        /* A node is separated through alignment from its surrounding nodes. */
        this.aligned = 0;

        /* Multiple nodes are manually merged into a stratified node. */
        this.stratified = 0;


        /* Distance. */
        /*************/

        /* A node's neighborhood directly influences it's DOI value through link weight and fallout function. */
        this.neighborhoodDoiFactor = 1;


        /* Computation. */
        /****************/

        /* A node's dominant component is represented by the minimum or maximum value throughout all components. */
        this.doiMinMax = -1;

        /* A node's average DOI value is calculated by the sum of all weighted single DOI component values. */
        this.doiWeightedSum = -1;
    };

    /**
     * Look up filtered attribute for encapsulating node.
     * A node is within the filter results.
     */
    DoiComponents.prototype.filteredChanged = function () {
        this.doiFiltered = this.node.filtered ? 1 : 0.5;
        this.computeWeightedSum();
    };

    /**
     * A node can be selected for further actions or detailed information.
     */
    DoiComponents.prototype.selectedChanged = function () {
        this.doiSelected = this.node.selected ? 1 : 0;
        this.computeWeightedSum();
    };

    /**
     * A path containing nodes may be highlighted.
     */
    DoiComponents.prototype.highlightedChanged = function () {
        this.doiHighlighted = this.node.highlighted ? 1 : 0;
        this.computeWeightedSum();
    };

    /**
     * Based on the time frame, calculate component weight.
     * @param factor The analysis start time scaled between 0 and 1.
     */
    DoiComponents.prototype.initTimeComponent = function (factor) {
        this.doiTime = factor;
        this.computeWeightedSum();
    };

    /**
     * Calculates the dominant doi component.
     */
    DoiComponents.prototype.computeMinMax = function () {
        /* TODO: Based on heuristics, find dominant component.*/
        this.doiMinMax = -1;
    };

    /**
     * Calculates a weighted doi value among all doi components considering component weights.
     */
    DoiComponents.prototype.computeWeightedSum = function () {
        /* TODO: Specify component weights within method params and compute a mean among all components. */

        this.doiWeightedSum = (this.doiFiltered / 4 + this.doiSelected / 4 + this.doiHighlighted / 4 + this.doiTime / 4).toFixed(2);
    };

    /**
     * Constructor function of the super node inherited by Node, Analysis and Subanalysis.
     *
     * @param id
     * @param nodeType
     * @param parent
     * @param hidden
     * @constructor
     */
    var BaseNode = function (id, nodeType, parent, hidden) {
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
            ts: {removed: false},

            /* Graph attributes. */
            width: 0,
            depth: 0,

            bcOrder: -1
        };

        BaseNode.numInstances = (BaseNode.numInstances || 0) + 1;
        this.autoId = BaseNode.numInstances;

        this.doi = new DoiComponents(this);
        this.selected = false;
        this.filtered = true;
    };

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
    var Node = function (id, nodeType, parent, hidden, name, fileType, study, assay, parents, analysis, subanalysis, uuid, fileUrl) {
        BaseNode.call(this, id, nodeType, parent, hidden);

        this.name = name;
        this.fileType = fileType;
        this.study = study;
        this.assay = assay;
        this.parents = parents;
        this.analysis = analysis;
        this.subanalysis = subanalysis;
        this.uuid = uuid;
        this.fileUrl = fileUrl;

        this.attributes = d3.map();
    };

    Node.prototype = Object.create(BaseNode.prototype);
    Node.prototype.constructor = Node;

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
    var Analysis = function (id, parent, hidden, uuid, wfUuid, analysis, start, end, created) {
        BaseNode.call(this, id, "analysis", parent, hidden);

        this.uuid = uuid;
        this.wfUuid = wfUuid;
        this.analysis = analysis;
        this.start = start;
        this.end = end;
        this.created = created;

        this.inputs = d3.map();
        this.outputs = d3.map();
        this.links = d3.map();

        this.wfName = "";

        this.macro = Object.create(null);
    };

    Analysis.prototype = Object.create(BaseNode.prototype);
    Analysis.prototype.constructor = Analysis;

    /**
     * Constructor function for the subanalysis node data structure.
     *
     * @param id
     * @param parent
     * @param hidden
     * @param subanalysis
     * @constructor
     */
    var Subanalysis = function (id, parent, hidden, subanalysis) {
        BaseNode.call(this, id, "subanalysis", parent, hidden);

        this.subanalysis = subanalysis;

        this.wfUuid = "";
        this.inputs = d3.map();
        this.outputs = d3.map();
        this.links = d3.map();
    };

    Subanalysis.prototype = Object.create(BaseNode.prototype);
    Subanalysis.prototype.constructor = Subanalysis;

    /**
     * Constructor function for the aggregated macro node data structure.
     *
     * @param id
     * @param parent
     * @param hidden
     * @constructor
     */
    var Macro = function (id, parent, hidden) {
        BaseNode.call(this, id, "macro", parent, hidden);

        this.inputs = d3.map();
        this.outputs = d3.map();
        this.links = d3.map();
    };

    Macro.prototype = Object.create(BaseNode.prototype);
    Macro.prototype.constructor = Macro;

    /**
     * Constructor function for the provenance layered node data structure.
     *
     * @param id
     * @param parent
     * @param hidden
     * @constructor
     */
    var Layer = function (id, parent, hidden) {
        Macro.call(this, id, "layer", parent, hidden);

    };

    Layer.prototype = Object.create(Macro.prototype);
    Layer.prototype.constructor = Layer;


    /**
     * Constructor function for the motif data structure.
     *
     * @constructor
     */
    var Motif = function () {

        this.inputs = d3.map();
        this.outputs = d3.map();

        this.nodes = d3.map();
        this.links = d3.map();

        Motif.numInstances = (Motif.numInstances || 0) + 1;
        this.autoId = Motif.numInstances;
    };

    /**
     * Constructor function for the link data structure.
     *
     * @param id
     * @param source
     * @param target
     * @param hidden
     * @constructor
     */
    var Link = function (id, source, target, hidden) {
        this.id = id;
        this.source = source;
        this.target = target;
        this.hidden = hidden;
        this.highlighted = false;

        /* Layout computation specific flags. */
        this.l = {

            /* Top sort markings [Kahn 1962]. */
            ts: {removed: false}
        };

        Link.numInstances = (Link.numInstances || 0) + 1;
        this.autoId = Link.numInstances;
    };

    /**
     * Constructor function for the provenance visualization.
     *
     * @param parentDiv
     * @param zoom
     * @param data
     * @param url
     * @param canvas
     * @param nodeTable
     * @param rect
     * @param margin
     * @param width
     * @param height
     * @param radius
     * @param color
     * @param graph
     * @param supportView
     * @param cell
     * @constructor
     */
    var ProvVis = function (parentDiv, zoom, data, url, canvas, nodeTable, rect, margin, width, height, radius, color, graph, supportView, cell) {
        this._parentDiv = parentDiv;
        this.zoom = zoom;
        this._data = data;
        this._url = url;

        this.canvas = canvas;
        this.nodeTable = nodeTable;
        this.rect = rect;
        this.margin = margin;
        this.width = width;
        this.height = height;
        this.radius = radius;
        this.color = color;
        this.graph = graph;
        this.supportView = supportView;
        this.cell = cell;
    };

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
    var ProvGraph = function (dataset, nodes, links, aLinks, iNodes, oNodes, aNodes, saNodes, analysisWorkflowMap, nodeMap, analysisData, workflowData, nodeData) {
        this.dataset = dataset;
        this.nodes = nodes;
        this.links = links;
        this.aLinks = aLinks;
        this.iNodes = iNodes;
        this.oNodes = oNodes;
        this.aNodes = aNodes;
        this.saNodes = saNodes;

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
    };

    /**
     * Publish constructor function declarations.
     */
    return {
        DoiComponents: DoiComponents,
        BaseNode: BaseNode,
        Node: Node,
        Analysis: Analysis,
        Subanalysis: Subanalysis,
        Macro: Macro,
        Layer: Layer,
        Motif: Motif,
        Link: Link,
        ProvVis: ProvVis,
        ProvGraph: ProvGraph
    };
}();