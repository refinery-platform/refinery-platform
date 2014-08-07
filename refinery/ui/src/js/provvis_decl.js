/**
 * Module for constructor function declaration.
 */
var provvisDecl = function () {

    /**
     * Constructor function of the super node inherited by Node, Analysis and Subanalysis.
     *
     * @param id
     * @param nodeType
     * @param preds
     * @param succs
     * @param parent
     * @param children
     * @param doi
     * @param hidden
     * @param col
     * @param row
     * @param x
     * @param y
     * @constructor
     */
    var BaseNode = function (id, nodeType, preds, succs, parent, children, doi, hidden, col, row, x, y) {
        this._id = id;
        this._nodeType = nodeType;
        this._preds = preds;
        this._succs = succs;
        this._parent = parent;
        this._children = children;

        this.doi = doi;
        this.hidden = hidden;
        this.col = col;
        this.row = row;
        this.x = x;
        this.y = y;

        BaseNode.numInstances = (BaseNode.numInstances || 0) + 1;

        this.autoId = BaseNode.numInstances;

        /* TODO: Add previous and next SNode references. */

        /* TODO: Add auto instance counter for id. */
    };

    /**
     * Constructor function for the node data structure.
     *
     * @param id
     * @param nodeType
     * @param preds
     * @param succs
     * @param parent
     * @param children
     * @param doi
     * @param hidden
     * @param col
     * @param row
     * @param x
     * @param y
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
    var Node = function (id, nodeType, preds, succs, parent, children, doi, hidden, col, row, x, y, name, fileType, study, assay, parents, analysis, subanalysis, uuid, rowBK, bcOrder, isBlockRoot) {
        BaseNode.call(this, id, nodeType, preds, succs, parent, children, doi, hidden, col, row, x, y);

        this._name = name;
        this._fileType = fileType;
        this._study = study;
        this._assay = assay;
        this._parents = parents;
        this._analysis = analysis;
        this._subanalysis = subanalysis;

        this.uuid = uuid;
        this.rowBK = rowBK;
        this.bcOrder = bcOrder;
        this.isBlockRoot = isBlockRoot;

        /* TODO: Group layout specific properties into sub-property. */
    };

    Node.prototype = Object.create(BaseNode.prototype);
    Node.prototype.constructor = Node;

    /**
     * Constructor function for the analysis node data structure.
     *
     * @param id
     * @param nodeType
     * @param preds
     * @param succs
     * @param parent
     * @param children
     * @param doi
     * @param hidden
     * @param col
     * @param row
     * @param x
     * @param y
     * @param uuid
     * @param analysis
     * @param start
     * @param end
     * @param created
     * @param inputs
     * @param outputs
     * @param links
     * @constructor
     */
    var Analysis = function (id, nodeType, preds, succs, parent, children, doi, hidden, col, row, x, y, uuid, analysis, start, end, created, inputs, outputs, links) {
        BaseNode.call(this, id, nodeType, preds, succs, parent, children, doi, hidden, col, row, x, y);

        this.uuid = uuid;
        this.analysis = analysis;
        this.start = start;
        this.end = end;
        this.created = created;
        this.inputs = inputs;
        this.outputs = outputs;
        this.links = links;
    };

    Analysis.prototype = Object.create(BaseNode.prototype);
    Analysis.prototype.constructor = Analysis;

    /**
     * Constructor function for the sub-analysis node data structure.
     *
     * @param id
     * @param nodeType
     * @param doi
     * @param hidden
     * @param preds
     * @param succs
     * @param parent
     * @param children
     * @param col
     * @param row
     * @param x
     * @param y
     * @param sanId
     * @param subanalysis
     * @param inputs
     * @param outputs
     * @param isOutputAnalysis
     * @constructor
     */
    var Subanalysis = function (id, nodeType, doi, hidden, preds, succs, parent, children, col, row, x, y, sanId, subanalysis, inputs, outputs, isOutputAnalysis) {
        BaseNode.call(this, id, nodeType, preds, succs, parent, children, doi, hidden, col, row, x, y);

        this.sanId = sanId;
        this.subanalysis = subanalysis;
        this.inputs = inputs;
        this.outputs = outputs;

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
     * @param neighbor
     * @param type0
     * @param type1
     * @constructor
     */
    var Link = function (id, source, target, hidden, neighbor, type0, type1) {
        this.id = id;
        this.source = source;
        this.target = target;
        this.hidden = hidden;
        this.neighbor = neighbor;
        this.type0 = type0;
        this.type1 = type1;
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
     * @param nodeMap
     * @param nodePredMap
     * @param nodeSuccMap
     * @param nodeLinkPredMap
     * @param nodeLinkSuccMap
     * @param analysisWorkflowMap
     * @param width
     * @param depth
     * @param grid
     * @constructor
     */
    var ProvGraph = function (nodes, links, iNodes, oNodes, aNodes, saNodes, nodeMap, nodePredMap, nodeSuccMap, nodeLinkPredMap, nodeLinkSuccMap, analysisWorkflowMap, width, depth, grid) {
        this.nodes = nodes;
        this.links = links;
        this.iNodes = iNodes;
        this.oNodes = oNodes;
        this.aNodes = aNodes;
        this.saNodes = saNodes;

        this.nodeMap = nodeMap;
        this.nodePredMap = nodePredMap;
        this.nodeSuccMap = nodeSuccMap;
        this.nodeLinkPredMap = nodeLinkPredMap;
        this.nodeLinkSuccMap = nodeLinkSuccMap;
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