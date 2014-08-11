/**
 * Module for constructor function declaration.
 */
var provvisDecl = function () {

    /**
     * Constructor function of the super node inherited by Node, Analysis and Subanalysis.
     *
     * @param id
     * @param nodeType
     * @param parent
     * @param doi
     * @param hidden
     * @constructor
     */
    var BaseNode = function (id, nodeType, parent, doi, hidden) {
        this.id = id;
        this.nodeType = nodeType;
        this.preds = d3.map();
        this.succs = d3.map();
        this.predLinks = d3.map();
        this.succLinks = d3.map();
        this.parent = parent;
        this.children = d3.map();

        this.doi = doi;
        this.hidden = hidden;
        this.col = -1;
        this.row = -1;
        this.x = -1;
        this.y = -1;

        BaseNode.numInstances = (BaseNode.numInstances || 0) + 1;
        this.autoId = BaseNode.numInstances;

        /* TODO: Group layout specific properties into sub-property. */
        /* TODO: Properties not set initially should be removed from the constructor interface. */
    };

    /**
     * Constructor function for the node data structure.
     *
     * @param id
     * @param nodeType
     * @param parent
     * @param doi
     * @param hidden
     * @param name
     * @param fileType
     * @param study
     * @param assay
     * @param parents
     * @param analysis
     * @param subanalysis
     * @param uuid
     * @param rowBK
     * @param bcOrder
     * @param isBlockRoot
     * @constructor
     */
    var Node = function (id, nodeType, parent, doi, hidden, name, fileType, study, assay, parents, analysis, subanalysis, uuid, rowBK, bcOrder, isBlockRoot) {
        BaseNode.call(this, id, nodeType, parent, doi, hidden);

        this.name = name;
        this.fileType = fileType;
        this.study = study;
        this.assay = assay;
        this.parents = parents;
        this.analysis = analysis;
        this.subanalysis = subanalysis;

        this.uuid = uuid;
        this.rowBK = rowBK;
        this.bcOrder = bcOrder;
        this.isBlockRoot = isBlockRoot;
    };

    Node.prototype = Object.create(BaseNode.prototype);
    Node.prototype.constructor = Node;

    /**
     * Constructor function for the analysis node data structure.
     *
     * @param id
     * @param nodeType
     * @param parent
     * @param doi
     * @param hidden
     * @param uuid
     * @param wfUuid
     * @param analysis
     * @param start
     * @param end
     * @param created
     * @constructor
     */
    var Analysis = function (id, nodeType, parent, doi, hidden, uuid, wfUuid, analysis, start, end, created) {
        BaseNode.call(this, id, nodeType, parent, doi, hidden);

        this.uuid = uuid;
        this.wfUuid = wfUuid;
        this.analysis = analysis;
        this.start = start;
        this.end = end;
        this.created = created;
        this.inputs = d3.map();
        this.outputs = d3.map();
        this.links = d3.map();
    };

    Analysis.prototype = Object.create(BaseNode.prototype);
    Analysis.prototype.constructor = Analysis;

    /**
     * Constructor function for the subanalysis node data structure.
     *
     * @param id
     * @param nodeType
     * @param parent
     * @param doi
     * @param hidden
     * @param sanId
     * @param subanalysis
     * @param inputs
     * @param outputs
     * @param isOutputAnalysis
     * @constructor
     */
    var Subanalysis = function (id, nodeType, parent, doi, hidden, sanId, subanalysis, inputs, outputs, isOutputAnalysis) {
        BaseNode.call(this, id, nodeType, parent, doi, hidden);

        this.sanId = sanId;
        this.subanalysis = subanalysis;
        this.inputs = inputs;
        this.outputs = outputs;
        this.links = d3.map();

        this.isOutputAnalysis = isOutputAnalysis;
    };

    Subanalysis.prototype = Object.create(BaseNode.prototype);
    Subanalysis.prototype.constructor = Subanalysis;

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
        this.l = {neighbor: false,
            type0: false,
            type1: false};

        BaseNode.numInstances = (BaseNode.numInstances || 0) + 1;
        this.autoId = BaseNode.numInstances;
    };

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
     * @constructor
     */
    var ProvVis = function (parentDiv, zoom, data, url, canvas, rect, margin, width, height, radius, color, graph) {
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
    };

    /**
     * Constructor function for the provenance graph.
     *
     * @param nodes
     * @param links
     * @param iNodes
     * @param oNodes
     * @param aNodes
     * @param saNodes
     * @param analysisWorkflowMap
     * @param width
     * @param depth
     * @param grid
     * @constructor
     */
    var ProvGraph = function (nodes, links, iNodes, oNodes, aNodes, saNodes, analysisWorkflowMap, width, depth, grid) {
        this.nodes = nodes;
        this.links = links;
        this.iNodes = iNodes;
        this.oNodes = oNodes;
        this.aNodes = aNodes;
        this.saNodes = saNodes;

        this.analysisWorkflowMap = analysisWorkflowMap;

        this.width = width;
        this.depth = depth;
        this.grid = grid;
    };

    /**
     * Publish constructor function declarations.
     */
    return {
        BaseNode: BaseNode,
        Node: Node,
        Analysis: Analysis,
        Subanalysis: Subanalysis,
        Link: Link,
        ProvVis: ProvVis,
        ProvGraph: ProvGraph
    };
}();