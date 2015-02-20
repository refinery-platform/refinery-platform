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
            "class": "btn-group"
        }).appendTo("#" + parentId);


        /* Analyses. */
        $("<button/>", {
            "id": "prov-ctrl-analyses-click",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-documents": "Analyses",
            "html": "Analyses",
            "data-html": "true",
            "title": "Analyses"
        }).appendTo("#prov-ctrl-node-btn-group");

        /* Subanalyses. */
        $("<button/>", {
            "id": "prov-ctrl-subanalyses-click",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-documents": "Subanalyses",
            "html": "Subanalyses",
            "data-html": "true",
            "title": "Subanalyses"
        }).appendTo("#prov-ctrl-node-btn-group");

        /* Files and Tools. */
        $("<button/>", {
            "id": "prov-ctrl-files-click",
            "class": 'btn btn-mini',
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-documents": "Files/Tools",
            "html": "Files/Tools",
            "data-html": "true",
            "title": "Files/Tools"
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
            "id": "prov-ctrl-filter-list-blend",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\" checked>Blend" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-filter-list");
        $("<li/>", {
            "id": "prov-ctrl-filter-list-hide",
            "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\">Hide" + "</label>" + "</a>"
        }).appendTo("#prov-ctrl-filter-list");


        /* Help. */
        $("<div>", {
            "id": "help-modal",
            "class": "modal hide fade bs-example-modal-sm-help",
            "tabindex": "-1",
            "role": "dialog",
            "aria-hidden": "true"
        }).appendTo("body");

        $("<div>", {
            "id": "help-dialog",
            "class": "modal-dialog modal-sm"
        }).appendTo("#help-modal");

        $("<div>", {
            "id": "help-content",
            "class": "modal-content"
        }).appendTo("#help-dialog");

        $("<div>", {
            "class": "modal-body",
            "html": "<h3>Command Shortcut List</h3>" +
                "<ul><li><div class=\"refinery-subheader\"><h4>Node and path specific:</h4></div></li>" +
                "<ul><li>(Un)Select: Left click</li>" +
                "<li>Highlight predecessors: 'p'</li>" +
                "<li>Highlight successors: 's'</li>" +
                "<li>Collapse Node: 'c'</li>" +
                "<li>Expand Node: 'e' or double click</li></ul><br>" +
                "<li><div class=\"refinery-subheader\"><h4>Global:</h4></div></li>" +
                "<ul><li>Clear highlighting: Left click on background</li>" +
                "<li>Fit graph to screen: Left double click on background</li></ul></ul>"
        }).appendTo("#help-content");

        $("<div>", {
            "id": "help-footer",
            "class": "modal-footer"
        }).appendTo("#help-content");

        $("<button>", {
            "class": "btn btn-primary",
            "data-dismiss": "modal",
            "html": "OK"
        }).appendTo("#help-footer");

        $("<button/>", {
            "id": "prov-ctrl-help",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-toggle": "modal",
            "data-target": "#help-modal",
            "html": "<i class=icon-question-sign></i>" +
                "&nbsp;" + "Command List",
            "data-html": "true",
            "title": "Command List",
            "style": "margin-left: 15px"
        }).appendTo("#" + parentId);


        /* Glyph Legend. */
        $("<div>", {
            "id": "legend-modal",
            "class": "modal hide fade bs-example-modal-sm-legend",
            "tabindex": "-1",
            "role": "dialog",
            "aria-hidden": "true"
        }).appendTo("body");

        $("<div>", {
            "id": "legend-dialog",
            "class": "modal-dialog modal-sm"
        }).appendTo("#legend-modal");

        $("<div>", {
            "id": "legend-content",
            "class": "modal-content"
        }).appendTo("#legend-dialog");

        $("<div>", {
            "id": "legend-body",
            "class": "modal-body",
            "html": "<h3>Glyph Legend</h3>" +
                "<div class=\"refinery-subheader\"><h4>Node Types:</h4></div>" +
                "<div class=\"provvis-legend-cell\" id=\"prov-ctrl-legend-types\"></div>" +
                "<div class=\"refinery-subheader\"><h4>Time Encoding:</h4></div>" +
                "<div class=\"provvis-legend-cell\" id=\"prov-ctrl-legend-time\"></div>" +
                "<div class=\"refinery-subheader\"><h4>Layering:</h4></div>" +
                "<div class=\"provvis-legend-cell\" id=\"prov-ctrl-legend-layering\"></div>" +
                "<div class=\"refinery-subheader\"><h4>Aggregation:</h4></div>" +
                "<div class=\"provvis-legend-cell\" id=\"prov-ctrl-legend-aggregation\"></div>" +
                "<div class=\"refinery-subheader\"><h4>Stratification:</h4></div>" +
                "<div class=\"provvis-legend-cell\" id=\"prov-ctrl-legend-stratification\"></div>"
        }).appendTo("#legend-content");

        $("<div>", {
            "id": "legend-footer",
            "class": "modal-footer"
        }).appendTo("#legend-content");

        $("<button>", {
            "class": "btn btn-primary",
            "data-dismiss": "modal",
            "html": "OK"
        }).appendTo("#legend-footer");

        $("<button/>", {
            "id": "prov-ctrl-legend",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "data-toggle": "modal",
            "data-target": "#legend-modal",
            "html": "<i class=icon-question-sign></i>" +
                "&nbsp;" + "Glyph Legend",
            "data-html": "true",
            "title": "Glyph Legend",
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
     * Analysis path generator.
     * @returns {string} A polygon.
     */
    var drawAnalysisPolygon = function () {
        return (-15) + "," + "0" + " " +
            (-10) + "," + (-10) + " " +
            10 + "," + (-10) + " " +
            15 + "," + 0 + " " +
            10 + "," + 10 + " " +
            (-10) + "," + 10;
    };

    /**
     * Subanalysis path generator.
     * @returns {string} A polygon.
     */
    var drawSubanalysisPolygon = function () {
        return "0," + (-10) + " " +
            10 + "," + (-5) + " " +
            10 + "," + 5 + " " +
            "0" + "," + 10 + " " +
            (-10) + "," + 5 + " " +
            (-10) + "," + (-5);
    };

    /**
     * Render glyph legend elements.
     */
    var renderGlyphLegend = function () {

        /* Node types. */
        var lTypesCanvas = d3.select("#prov-ctrl-legend-types").append("svg")
            .classed("provvis-legend-cell-canvas", true);

        /* Draw analysis node. */
        var typesAn = lTypesCanvas.append("g").attr("transform", "translate(15,15)");
        typesAn.append("polygon")
            .attr("points", function () {
                return drawAnalysisPolygon();
            }).style({"fill": "none", "stroke": "black", "stroke-width": "1px"});
        typesAn.append("text").attr("transform", "translate(19,5)").text(function () {
            return "Analysis";
        });

        /* Draw subanalysis node. */
        var typesSan = lTypesCanvas.append("g").attr("transform", "translate(105,15)");
        typesSan.append("polygon")
            .attr("points", function () {
                return drawSubanalysisPolygon();
            }).style({"fill": "none", "stroke": "black", "stroke-width": "1px"});
        typesSan.append("text").attr("transform", "translate(17,5)").text(function () {
            return "Sub-Analysis";
        });

        /* Draw file node. */
        var typesFn = lTypesCanvas.append("g").attr("transform", "translate(230,15)");
        typesFn.append("circle")
            .attr("r", 10).style({"fill": "none", "stroke": "black", "stroke-width": "1px"});
        typesFn.append("text").attr("transform", "translate(15,5)").text(function () {
            return "File";
        });

        /* Draw tool node. */
        var typesTn = lTypesCanvas.append("g").attr("transform", "translate(285,15)");
        typesTn.append("rect")
            .attr("transform", function () {
                return "translate(" + (-5) + "," + (-5) + ")" +
                    "rotate(45 " + 5 + "," + 5 + ")";
            })
            .attr("width", 10)
            .attr("height", 10)
            .style({"fill": "none", "stroke": "black", "stroke-width": "1px"});
        typesTn.append("text").attr("transform", "translate(15,5)").text(function () {
            return "Tool";
        });

        /* Draw sample node. */
        var typesSn = lTypesCanvas.append("g").attr("transform", "translate(350,15)");
        typesSn.append("rect")
            .attr("transform", "translate(" + ( -3 * 10 / 4) + "," + (-3 * 10 / 4) + ")")
            .attr("width", 6 * 10 / 4)
            .attr("height", 6 * 10 / 4)
            .style({"fill": "none", "stroke": "black", "stroke-width": "1px"});
        typesSn.append("text").attr("transform", "translate(15,5)").text(function () {
            return "Source/Sample/Assay";
        });


        /* Time encoding. */
        var lTimeCanvas = d3.select("#prov-ctrl-legend-time").append("svg").classed("provvis-legend-cell-canvas", true);

        var timeGradient = lTimeCanvas.append("g")
            .append("defs")
            .append("linearGradient")
            .attr("id", "legendGrayscale");

        timeGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 1);

        timeGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#000")
            .attr("stop-opacity", 1);

        lTimeCanvas.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 530)
            .attr("height", 30)
            .style({"fill": "url(#legendGrayscale)", "stroke": "white", "stroke-width": "1px"});

        lTimeCanvas.append("text").attr("transform", "translate(0,25)").text(function () {
            return "Earliest analysis execution";
        });
        lTimeCanvas.append("text").attr("transform", "translate(350,25)").text(function () {
            return "Latest analysis execution";
        })
            .style({"fill": "white"});


        /* Layering. */
        var lLayer = d3.select("#prov-ctrl-legend-layering").append("svg").classed("provvis-legend-cell-canvas", true);
        var layerExampleNodes = [0, 1, 2, 3, 4];

        var gradientScale = d3.scale.linear()
            .domain([0, 4])
            .range(["lightgray", "black"]);

        var layerLinks = lLayer.append("g").attr("transform", "translate(15,15)");
        layerLinks.selectAll(".lLinks")
            .data(layerExampleNodes)
            .enter().append("g").attr("transform", function (n, i) {
                return "translate(" + 0 + "," + (i * 5) + ")";
            }).append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 300)
            .attr("y2", 0)
            .style({"stroke": function (d, i) {
                return gradientScale(i);
            }, "fill": "none", "stroke-width": "5px"});

        var layerNodeset1 = lLayer.append("g").attr("transform", "translate(15,15)");
        layerNodeset1.selectAll(".lan")
            .data(layerExampleNodes)
            .enter().append("g").attr("transform", function (n, i) {
                return "translate(" + 0 + "," + (i * 5) + ")";
            }).append("polygon")
            .attr("points", function () {
                return drawAnalysisPolygon();
            }).style({"fill": function (d, i) {
                return gradientScale(i);
            }, "stroke": "none", "stroke-width": "1px"});
        layerNodeset1.append("text").attr("transform", "translate(20,16)").text(function () {
            return "{5}";
        });

        var layerNodeset2 = lLayer.append("g").attr("transform", "translate(300,15)");
        layerNodeset2.selectAll(".lan")
            .data(layerExampleNodes)
            .enter().append("g").attr("transform", function (n, i) {
                return "translate(" + 0 + "," + (i * 5) + ")";
            }).append("polygon")
            .attr("points", function () {
                return drawAnalysisPolygon();
            }).style({"fill": function (d, i) {
                return gradientScale(i);
            }, "stroke": "none", "stroke-width": "1px"});
        layerNodeset2.append("text").attr("transform", "translate(20,16)").text(function () {
            return "{5}";
        });


        /* Aggregation. */
        var lAggregation = d3.select("#prov-ctrl-legend-aggregation").append("svg").classed("provvis-legend-cell-canvas", true);
        var aggrNodeset = lAggregation.append("g").attr("transform", "translate(15,15)");
        aggrNodeset.selectAll(".lan")
            .data(layerExampleNodes)
            .enter().append("g").attr("transform", function (n, i) {
                return "translate(" + (i * 5) + "," + 0 + ")";
            }).append("polygon")
            .attr("points", function () {
                return drawAnalysisPolygon();
            }).style({"fill": function () {
                return gradientScale(2);
            }, "stroke": "none", "stroke-width": "1px"});
        aggrNodeset.append("text").attr("transform", "translate(40,4)").text(function () {
            return "{5}";
        });


        /* Stratification. */
        var lStratification = d3.select("#prov-ctrl-legend-stratification").append("svg").classed("provvis-legend-cell-canvas", true);
        var stratNodeset = lStratification.append("g").attr("transform", "translate(15,15)");
        stratNodeset.selectAll(".lan")
            .data(layerExampleNodes)
            .enter().append("g").attr("transform", function (n, i) {
                return "translate(" + 0 + "," + (i * 5) + ")";
            }).append("polygon")
            .attr("points", function () {
                return drawSubanalysisPolygon();
            }).style({"fill": function () {
                return gradientScale(3);
            }, "stroke": "none", "stroke-width": "1px"});
        stratNodeset.append("text").attr("transform", "translate(17,12)").text(function () {
            return "{5}";
        });
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

                /* Render glyph legend. */
                renderGlyphLegend();

                /* Hierarchical div layout. */
                createVisualizationContainer("provenance-vis", "provenance-canvas", "provenance-graph");

                /* On-top docked table. */
                var nodeTable = createNodeTable("provenance-canvas", "provenance-table");

                /* Support view div. */
                var supportView = createSupportView("provenance-canvas", "provenance-support-view");

                /* Init grid cell dimensions. */
                var cell = {width: r * 5, height: r * 5};

                /* Create vis and add graph. */
                vis = new provvisDecl.ProvVis("provenance-graph", zoom, data, url, canvas, nodeTable, rect, margin, width,
                    height, r, color, graph, supportView, cell);

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

                    /* Fix to exclude zoom scale from text labels. */
                    vis.canvas.selectAll(".aBBoxLabel").attr("transform", "translate(" + 4 +
                        "," + (vis.radius) + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".saBBoxLabel").attr("transform", "translate(" + 10 +
                        "," + (vis.radius) + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".nodeDoiLabel").attr("transform", "translate(" + (-cell.width / 2 + 2) +
                        "," + vis.radius * 1.5 + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".nodeAttrLabel").attr("transform", "translate(" + (-cell.width / 2 + 5) +
                        "," + vis.radius * 1.5 + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".subanalysisLabel").attr("transform", "translate(" + (-cell.width / 2 + 5) +
                        "," + vis.radius * 1.5 + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".analysisLabel").attr("transform", "translate(" + (-cell.width / 2 + 4) +
                        "," + vis.radius * 1.5 + ")" + "scale(" + (+1 / d3.event.scale) + ")");
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

                /* Create layout grid dom group. */
                vis.grid = vis.canvas.append("g").classed({"grid": true}).style("display", "none");

                /* Extract graph data. */
                vis.graph = provvisInit.runInit(data, analysesData, solrResponse);

                /* Compute layout. */
                var bclgNodes = provvisLayout.runLayout(vis.graph);

                /* Discover and and inject motifs. */
                provvisMotifs.runMotifs(vis.graph, bclgNodes);

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

    /**
     * Visualization instance getter.
     * @returns {null} The provvis instance.
     */
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