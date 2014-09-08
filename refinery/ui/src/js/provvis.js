/**
 * The refinery provenance graph visualization.
 *
 * @author sluger Stefan Luger https://github.com/sluger
 * @exports runProvVis The published function to run the visualization.
 */

var provvis = function () {
    var vis = Object.create(null);

    /**
     * Creates a simple toolbar containing actions for global visualization interaction.
     * @param parentId Parent div id for the toolbar.
     * @param divId Toolbar div id.
     */
    var createToolbar = function (parentId, divId) {
        /* Toolbar. */
        $('<div/>', {
            "id": divId,
            "class": ""
        }).appendTo("#" + parentId);
    };

    /**
     * Creates a simple toolbar items for global visualization interaction.
     * @param parentId Parent div id for the toolbar items.
     */
    var createToolbarItems = function (parentId) {

        /* Toolbar items. */
        $("<button/>", {
            "id": "prov-ctrl-collapse-click",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Collapse",
            "data-html": "true",
            "title": "Collapse"
        }).appendTo("#" + parentId);

        $("<button/>", {
            "id": "prov-ctrl-expand-click",
            "class": 'btn btn-mini',
            "type": "button",
            "style": "margin-left: 2px",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Expand",
            "data-html": "true",
            "title": "Expand"
        }).appendTo("#" + parentId);

        $("<button/>", {
            "id": "prov-ctrl-show-grid",
            "class": 'btn btn-mini',
            "type": "button",
            "style": "margin-left: 2px",
            "data-toggle": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Grid",
            "data-html": "true",
            "title": "Grid"
        }).appendTo("#" + parentId);

        $("<button/>", {
            "id": "prov-ctrl-show-table",
            "class": 'btn btn-mini',
            "type": "button",
            "style": "margin-left: 2px",
            "data-toggle": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Node Info",
            "data-html": "true",
            "title": "Node Info"
        }).appendTo("#" + parentId);

        $("<button/>", {
            "id": "prov-ctrl-show-support-view",
            "class": 'btn btn-mini',
            "type": "button",
            "style": "margin-left: 2px",
            "data-toggle": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Support View",
            "data-html": "true",
            "title": "Support View"
        }).appendTo("#" + parentId);

        $("<span/>", {
            "class": "prov-ctrl-label",
            "style": "margin-left: 10px",
            "html": "Links"
        }).appendTo("#" + parentId);

        $("<select/>", {
            "id": "prov-ctrl-link-style",
            "class": "combobox",
            "style": "margin-left: 2px",
            "width": "auto",
            "html":
                "<option value=\"bezier\">Bezier</option>" +
                "<option value=\"edge\">Edge</option>"
        }).appendTo("#" + parentId);

        $("<span/>", {
            "class": "prov-ctrl-label",
            "style": "margin-left: 10px",
            "html": "Time-encoding"
        }).appendTo("#" + parentId);

        $("<select/>", {
            "id": "prov-ctrl-color-scheme",
            "class": "combobox",
            "style": "margin-left: 2px",
            "width": "auto",
            "html":
                "<option value=\"grayscale\">Grayscale</option>" +
                "<option value=\"color\">Color</option>"
        }).appendTo("#" + parentId);

        $("<span/>", {
            "class": "prov-ctrl-label",
            "style": "margin-left: 10px",
            "html": "Filter"
        }).appendTo("#" + parentId);

        $("<select/>", {
            "id": "prov-ctrl-filter-action",
            "class": "combobox",
            "style": "margin-left: 2px",
            "width": "auto",
            "html":
                "<option value=\"hide\">Hide unselected</option>" +
                "<option value=\"blend\">Blend unselected</option>"
        }).appendTo("#" + parentId);
    };

    /**
     * Creates the hierarchical provenance visualization div layout.
     * @param rootId Visualization root element.
     * @param divId Visualization canvas.
     * @param parentId Provenance graph tab element.
     */
    var createVisualizationContainer = function (rootId, divId, parentId) {
        $('<div/>', {
            "id": rootId
        }).appendTo("#" + parentId);

        $('<div/>', {
            "id": divId
        }).appendTo("#" + rootId);
    };

    /* TODO: Prototype implementation. */
    /**
     * Floating table properties div.
     * @param parentId Parent div id for the floating table div.
     * @param divId Table div id.
     * @returns {*} The table div container.
     */
    var createNodeTable = function (parentId, divId) {
        /* New table enclosing div. */
        $('<div/>', {
            "id": divId
        }).appendTo("#" + parentId);

        /* New table. */
        var tableContainer = d3.select("#" + divId);

        tableContainer.append("g").attr("id", "nodeTitle").html("<b>" + "Node: " + "<b>" + " - ");

        return tableContainer;
    };

    /**
     * Support view only showing analysis within a time-gradient background.
     * @param parentId Parent div id for the floating table div.
     * @param divId Table div id.
     * @returns {*} The support view div container.
     */
    var createSupportView = function (parentId, divId) {
        /* New support view enclosing div. */
        $('<div/>', {
            "id": divId
        }).appendTo("#" + parentId);

        /* New support view content. */
        var supportViewContainer = d3.select("#" + divId);

        supportViewContainer.append("g").attr("id", "viewTitle").html("<b>" + "Visible Analyses" + "<b>");

        supportViewContainer
            .append("svg")
            .attr("height", 100)
            .attr("width", 100)
            .style({"margin-top": "0px", "margin-bottom": "0px", "padding": "0px"});

        supportViewContainer.append("g").attr("id", "curTime").html("<b>" + "Date Threshold" + "<b>");

        return supportViewContainer;
    };

    /**
     * Refinery injection for the provenance visualization.
     * @param studyUuid The serialized unique identifier referencing a study.
     * @param studyAnalyses Analyses objects from the refinery scope.
     * @param solrResponse Facet filter information on node attributes.
     */
    var runProvVisPrivate = function (studyUuid, studyAnalyses, solrResponse) {

        /* Only allow one instance of ProvVis. */
        if (vis instanceof provvisDecl.ProvVis === false) {

            var url = "/api/v1/node?study__uuid=" + studyUuid + "&format=json&limit=0",
                analysesData = studyAnalyses.filter(function (a) {
                    return a.status === "SUCCESS";
                });

            /* Parse json. */
            d3.json(url, function (error, data) {

                /* Declare d3 specific properties. */
                var zoom = Object.create(null),
                    canvas = Object.create(null),
                    rect = Object.create(null);

                /* Initialize margin conventions */
                var margin = {top: 20, right: 10, bottom: 20, left: 10};

                /* Initialize canvas dimensions. */
                var width = window.innerWidth - margin.left - margin.right,
                    height = window.innerHeight - margin.top - margin.bottom;

                /* Set drawing constants. */
                var r = 7,
                    color = d3.scale.category20();

                /* Declare graph. */
                var graph = Object.create(null);

                /* Toolbar. */
                createToolbar("provenance-graph", "provenance-controls");

                /* Toolbar items. */
                createToolbarItems("provenance-controls");

                /* Hierarchical div layout. */
                createVisualizationContainer("provenance-vis", "provenance-canvas", "provenance-graph");

                /* On-top docked table. */
                var nodeTable = createNodeTable("provenance-canvas", "provenance-table");

                /* Support view div. */
                var supportView = createSupportView("provenance-canvas", "provenance-support-view");

                /* Create vis and add graph. */
                vis = new provvisDecl.ProvVis("provenance-graph", zoom, data, url, canvas, nodeTable, rect, margin, width,
                    height, r, color, graph, supportView);

                /* Geometric zoom. */
                var redraw = function () {
                    /* Translation and scaling. */
                    vis.canvas.attr("transform", "translate(" + d3.event.translate + ")" +
                        " scale(" + d3.event.scale + ")");

                    /* Fix for rectangle getting translated too - doesn't work after window resize. */
                    vis.rect.attr("transform", "translate(" +
                        (-(d3.event.translate[0] + vis.margin.left) / d3.event.scale) + "," +
                        (-(d3.event.translate[1] + vis.margin.top) / d3.event.scale) + ")" +
                        " scale(" + (+1 / d3.event.scale) + ")");
                };

                /* Main canvas drawing area. */
                vis.canvas = d3.select("#provenance-canvas")
                    .append("svg")
                    .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
                    .attr("viewBox", "0 0 " + (width) + " " + (height))
                    .attr("preserveAspectRatio", "xMinYMin meet")
                    .attr("pointer-events", "all")
                    .classed("canvas", true)
                    .append("g")
                    .call(vis.zoom = d3.behavior.zoom().on("zoom", redraw)).on("dblclick.zoom", null)
                    .append("g");

                /* Helper rectangle to support pan and zoom. */
                vis.rect = vis.canvas.append("svg:rect")
                    .attr("width", width)
                    .attr("height", height)
                    .classed("brect", true);

                /* Extract graph data. */
                vis.graph = provvisInit.runInit(data, analysesData, solrResponse);

                /* Compute layout. */
                provvisLayout.runLayout(vis.graph);

                /* Render graph. */
                provvisRender.runRender(vis);
            });
        }
    };

    /**
     * On attribute filter change, the provenance visualization will be updated.
     * @param solrResponse Query response object holding information about attribute filter changed.
     */
    var runProvVisUpdatePrivate = function (solrResponse) {
        provvisRender.runRenderUpdate(vis, solrResponse);
    };

    var getProvVisPrivate = function () {
        return vis;
    };

    /**
     * Publish module function.
     */
    return{
        runProvVis: function (studyUuid, studyAnalyses, solrResponse) {
            runProvVisPrivate(studyUuid, studyAnalyses, solrResponse);
        }, runProvVisUpdate: function (solrResponse) {
            runProvVisUpdatePrivate(solrResponse);
        }, getProvVis: function () {
            return getProvVisPrivate();
        }
    };
}();