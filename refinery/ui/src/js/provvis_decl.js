/**
 * Module for decl.
 */
var provvisDecl = function () {

    /**
     * Constructor function for the super node inherited by Node, Analysis and Subanalysis.
     *
     * @param _id
     * @param _nodeType
     * @param _preds
     * @param _succs
     * @param _parent
     * @param _children
     * @param doi
     * @param hidden
     * @param col
     * @param row
     * @param x
     * @param y
     * @constructor
     */
    var BaseNode = function (_id, _nodeType, _preds, _succs, _parent, _children, doi, hidden, col, row, x, y) {
        this._id = _id;
        this._nodeType = _nodeType;
        this._preds = _preds;
        this._succs = _succs;
        this._parent = _parent;
        this._children = _children;

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
     * @param _id
     * @param _nodeType
     * @param _preds
     * @param _succs
     * @param _parent
     * @param _children
     * @param doi
     * @param hidden
     * @param col
     * @param row
     * @param x
     * @param y
     * @param _name
     * @param _fileType
     * @param _study
     * @param _assay
     * @param _parents
     * @param _analysis
     * @param _subanalysis
     * @param uuid
     * @param rowBK
     * @param bcOrder
     * @param isBlockRoot
     * @constructor
     */

    var Node = function (_id, _nodeType, _preds, _succs, _parent, _children, doi, hidden, col, row, x, y, _name, _fileType, _study, _assay, _parents, _analysis, _subanalysis, uuid, rowBK, bcOrder, isBlockRoot) {
        BaseNode.call(this, _id, _nodeType, _preds, _succs, _parent, _children, doi, hidden, col, row, x, y);

        this._name = _name;
        this._fileType = _fileType;
        this._study = _study;
        this._assay = _assay;
        this._parents = _parents;
        this._analysis = _analysis;
        this._subanalysis = _subanalysis;

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
     * @param _id
     * @param _nodeType
     * @param _preds
     * @param _succs
     * @param _parent
     * @param _children
     * @param doi
     * @param hidden
     * @param col
     * @param row
     * @param x
     * @param y
     * @param _uuid
     * @param _analysis
     * @param _start
     * @param _end
     * @param _created
     * @param _inputs
     * @param _outputs
     * @param _links
     * @constructor
     */
    var Analysis = function (_id, _nodeType, _preds, _succs, _parent, _children, doi, hidden, col, row, x, y, _uuid, _analysis, _start, _end, _created, _inputs, _outputs, _links) {
        BaseNode.call(this, _id, _nodeType, _preds, _succs, _parent, _children, doi, hidden, col, row, x, y);

        this._uuid = _uuid;
        this._analysis = _analysis;
        this._start = _start;
        this._end = _end;
        this._created = _created;
        this._inputs = _inputs;
        this._outputs = _outputs;
        this._links = _links;
    };

    Analysis.prototype = Object.create(BaseNode.prototype);
    Analysis.prototype.constructor = Analysis;

    /**
     * Constructor function for the analysis node data structure.
     *
     * @param _id
     * @param _nodeType
     * @param _preds
     * @param _succs
     * @param _parent
     * @param _children
     * @param doi
     * @param hidden
     * @param col
     * @param row
     * @param x
     * @param y
     * @param _sanId
     * @param _subanalysis
     * @param _inputs
     * @param _outputs
     * @param isOutputAnalysis
     * @constructor
     */
    var Subanalysis = function (_id, _nodeType, doi, hidden, _preds, _succs, _parent, _children, col, row, x, y, _sanId, _subanalysis, _inputs, _outputs, isOutputAnalysis) {
        BaseNode.call(this, _id, _nodeType, _preds, _succs, _parent, _children, doi, hidden, col, row, x, y);

        this._sanId = _sanId;
        this._subanalysis = _subanalysis;
        this._inputs = _inputs;
        this._outputs = _outputs;

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
     * @param _parentDiv
     * @param zoom
     * @param _data
     * @param _url
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
    var ProvVis = function (_parentDiv, zoom, _data, _url, canvas, rect, margin, width, height, radius, color, graph) {

        this._parentDiv = _parentDiv;
        this.zoom = zoom;
        this._data = _data;
        this._url = _url;

        this.canvas = canvas;
        this.rect = rect;
        this.margin = margin;
        this.width = width;
        this.height = height;
        this.radius = radius;
        this.color = color;

        /* TODO: Encapsulate redraw function as well as initiate modules. */

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
     * Publish module function.
     */
    return{
        BaseNode: BaseNode,
        Node: Node,
        Analysis: Analysis,
        Subanalysis: Subanalysis,
        Link: Link,
        ProvVis: ProvVis,
        ProvGraph: ProvGraph
    };
}();