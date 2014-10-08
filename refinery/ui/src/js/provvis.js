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
            "class": "",
            "style": "margin-bottom: 5px"
        }).appendTo("#" + parentId);
    };

    /**
     * Creates a simple toolbar items for global visualization interaction.
     * @param parentId Parent div id for the toolbar items.
     */
    var createToolbarItems = function (parentId) {

        /* Toolbar items. */

        /* Node centric items. */
        $("<span/>", {
            "id": "prov-ctrl-node-btn-group",
            "class": "btn-group",
            "data-toggle": "buttons-radio"
        }).appendTo("#" + parentId);

        /* Collapse. */
        $("<button/>", {
            "id": "prov-ctrl-collapse-click",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-documents": "Collapse",
            "html": "Collapse",
            "data-html": "true",
            "title": "Collapse"
        }).appendTo("#prov-ctrl-node-btn-group");

        /* Expand. */
        $("<button/>", {
            "id": "prov-ctrl-expand-click",
            "class": 'btn btn-mini',
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-documents": "Expand",
            "html": "Expand",
            "data-html": "true",
            "title": "Expand"
        }).appendTo("#prov-ctrl-node-btn-group");


        /* Attribute labeling. */
        $("<div/>", {
            "id": "prov-ctrl-node-labeling-btn-group",
            "class": "btn-group",
            "style": "margin-left: 15px"
        }).appendTo("#" + parentId);

        $("<div/>", {
            "id": "prov-ctrl-visible-attribute",
            "class": "btn btn-mini btn-group"
        }).appendTo("#prov-ctrl-node-labeling-btn-group");

        $("<a/>", {
            "class": "btn btn-mini dropdown-toggle",
            "data-toggle": "dropdown",
            "href": "#",
            "html": "<i class=icon-wrench></i>" +
                "&nbsp;" + "Attributes" + "&nbsp;" +
                "<i class=icon-caret-down></i>" + "&nbsp;"
        }).appendTo("#prov-ctrl-visible-attribute");

        $("<ul/>", {
            "id": "prov-ctrl-visible-attribute-list",
            "class": "dropdown-menu scrollable-menu"
        }).appendTo("#prov-ctrl-visible-attribute");


        /* Global items. */
        $("<div/>", {
            "id": "prov-ctrl-global-btn-group",
            "class": "btn-group",
            "style": "margin-left: 15px"
        }).appendTo("#" + parentId);

        /* Views. */
        $("<div/>", {
            "id": "prov-ctrl-visible-views",
            "class": "btn btn-mini btn-group"
        }).appendTo("#prov-ctrl-global-btn-group");

        $("<a/>", {
            "class": "btn btn-mini dropdown-toggle",
            "data-toggle": "dropdown",
            "href": "#",
            "html": "<i class=icon-eye-open></i>" +
                "&nbsp;" + "Views" + "&nbsp;" +
                "<i class=icon-caret-down></i>" + "&nbsp;"
        }).appendTo("#prov-ctrl-visible-views");

        $("<ul/>", {
            "id": "prov-ctrl-visible-views-list",
            "class": "dropdown-menu"
        }).appendTo("#prov-ctrl-visible-views");

        $("<li/>", {
            "id": "prov-ctrl-show-grid",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"checkbox\">" + "<input type=\"checkbox\">Grid" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-visible-views-list");
        $("<li/>", {
            "id": "prov-ctrl-show-doi",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"checkbox\">" + "<input type=\"checkbox\">Doi" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-visible-views-list");
        $("<li/>", {
            "id": "prov-ctrl-show-table",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"checkbox\">" + "<input type=\"checkbox\">Node Info" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-visible-views-list");
        $("<li/>", {
            "id": "prov-ctrl-show-support-view",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"checkbox\">" + "<input type=\"checkbox\">Analyses-Time View" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-visible-views-list");

        /* Stop dropdown menu from closing on click. */
        $("#prov-ctrl-visible-views-list").bind("click", function (e) {
            e.stopPropagation();
        });


        /* Links. */
        $("<div/>", {
            "id": "prov-ctrl-links",
            "class": "btn btn-mini btn-group"
        }).appendTo("#prov-ctrl-global-btn-group");

        $("<a/>", {
            "class": "btn btn-mini dropdown-toggle",
            "data-toggle": "dropdown",
            "href": "#",
            "html": "&nbsp;" + "Link style" + "&nbsp;" +
                "<i class=icon-caret-down></i>" + "&nbsp;"
        }).appendTo("#prov-ctrl-links");

        $("<ul/>", {
            "id": "prov-ctrl-links-list",
            "class": "dropdown-menu"
        }).appendTo("#prov-ctrl-links");

        $("<li/>", {
            "id": "prov-ctrl-links-list-bezier",
            "html": "<a href=\"#\"class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\" checked>Bezier" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-links-list");
        $("<li/>", {
            "id": "prov-ctrl-links-list-straight",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\">Straight" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-links-list");


        /* Time color-gradient. */
        $("<div/>", {
            "id": "prov-ctrl-time-enc",
            "class": "btn btn-mini btn-group"
        }).appendTo("#prov-ctrl-global-btn-group");

        $("<a/>", {
            "class": "btn btn-mini dropdown-toggle",
            "data-toggle": "dropdown",
            "href": "#",
            "html": "&nbsp;" + "Time enc." + "&nbsp;" +
                "<i class=icon-caret-down></i>" + "&nbsp;"
        }).appendTo("#prov-ctrl-time-enc");

        $("<ul/>", {
            "id": "prov-ctrl-time-enc-list",
            "class": "dropdown-menu"
        }).appendTo("#prov-ctrl-time-enc");

        $("<li/>", {
            "id": "prov-ctrl-time-enc-list-gs",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\" checked>Grayscale" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-time-enc-list");
        $("<li/>", {
            "id": "prov-ctrl-time-enc-list-blue",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\">Blue" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-time-enc-list");


        /* Filter action. */
        $("<div/>", {
            "id": "prov-ctrl-filter",
            "class": "btn btn-mini btn-group"
        }).appendTo("#prov-ctrl-global-btn-group");

        $("<a/>", {
            "class": "btn btn-mini dropdown-toggle",
            "data-toggle": "dropdown",
            "href": "#",
            "html": "&nbsp;" + "Filter" + "&nbsp;" +
                "<i class=icon-caret-down></i>" + "&nbsp;"
        }).appendTo("#prov-ctrl-filter");

        $("<ul/>", {
            "id": "prov-ctrl-filter-list",
            "class": "dropdown-menu"
        }).appendTo("#prov-ctrl-filter");

        $("<li/>", {
            "id": "prov-ctrl-filter-list-hide",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\" checked>Hide" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-filter-list");
        $("<li/>", {
            "id": "prov-ctrl-filter-list-blend",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\">Blend" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-filter-list");


        /* Help. */
        $("<div>", {
            "class": "modal fade bs-example-modal-sm",
            "tabindex": "-1",
            "role": "dialog",
            "aria-labelledby": "mySmallModalLabel",
            "aria-hidden": "true"
        }).appendTo("body");

        $("<div>", {
            "class": "modal-dialog modal-sm"
        }).appendTo(".bs-example-modal-sm");

        $("<div>", {
            "class": "modal-content"
        }).appendTo(".modal-dialog");

        $("<div>", {
            "class": "modal-header"
        }).appendTo(".modal-content");

        $("<button>", {
            "type": "button",
            "class": "close",
            "data-dismiss": "modal",
            "html": "<span aria-hidden=\"true\">" + "&times;" + "</span><span class=\"sr-only\"></span>"
        }).appendTo(".modal-header");

        $("<h4>", {
            "class": "modal-title",
            "id": "myModalLabel",
            "html": "Visualization Interaction Command List"
        }).appendTo(".modal-header");

        $("<div>", {
            "class": "modal-body",
            "html": "<ul><li><b>Node controls:</b></li>" +
                "<ul><li>(Un)Select: Left click</li>" +
                "<li>Highlight predecessors: SHIFT + Left click</li>" +
                "<li>Highlight successors: CTRL + Left click</li>" +
                "<li>Collapse Node: SHIFT + Left double click</li>" +
                "<li>Expand Node: CTRL + Left double click</li></ul>" +
                "<li><b>Global controls:</b></li>" +
                "<ul><li>Clear highlighting: Left click on background</li>" +
                "<li>Fit graph to screen: Left double click on background</li></ul></ul>"
        }).appendTo(".modal-content");

        $("<div>", {
            "class": "modal-footer"
        }).appendTo(".modal-content");

        $("<button/>", {
            "id": "prov-ctrl-help",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-toggle": "modal",
            "data-target": ".bs-example-modal-sm",
            "html": "<i class=icon-question-sign></i>" +
                "&nbsp;" + "Command List",
            "data-html": "true",
            "title": "Command List",
            "style": "margin-left: 15px"
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

        supportViewContainer.append("g").attr("id", "curTime").html("<b>" + "Date Threshold" + "<b>" + "<br>");

        /* Toolbar items. */
        $("<button/>", {
            "id": "prov-support-view-reset-time",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Reset",
            "data-html": "true",
            "title": "Reset"
        }).appendTo(supportViewContainer);

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