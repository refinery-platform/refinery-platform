angular.module("refineryProvvis", [])

    .controller("provvisNavbarController", function ($scope, $http) {
    $scope.name = "Navbar";

    /* TODO: */
    })

    .controller("provvisCanvasController", function ($scope, $http) {
    $scope.name = "Canvas";

    /* TODO: */
    })

    .directive("provvisNavBar", function () {
    return {
        templateUrl: "/static/partials/provvis_navbar.tpls.html",
        restrict: "A"
    };
    })

    .directive("provvisCanvas", function () {
    return {
        templateUrl: "/static/partials/provvis_canvas.tpls.html",
        restrict: "A"
    };
});

/**
 * The refinery provenance graph visualization.
 *
 * @author sluger Stefan Luger https://github.com/sluger
 * @exports runProvVis The published function to run the visualization.
 */
var provvis = function () {
    var vis = Object.create(null);

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
     * Timeline view only showing analysis within a time-gradient background.
     * @param parentId Parent div id for the floating table div.
     * @param divId Div id.
     * @returns {*} The timeline view div container.
     */
    var createTimelineView = function (parentId, divId) {
        /* New timeline view enclosing div. */
        $('<div/>', {
            "id": divId
        }).appendTo("#" + parentId);

        /* New timeline view content. */
        var timelineContainer = d3.select("#" + divId);

        $("<p/>", {
            "id": "tlTitle",
            "html": "Analysis Timeline"
        }).appendTo(timelineContainer);

        $("<p/>", {
            "id": "tlCanvas"
        }).appendTo(timelineContainer);

        d3.select("#tlCanvas").append("svg")
            .attr("height", 60)
            .attr("width", 310)
            .style({"margin-top": "0px", "margin-bottom": "0px", "padding": "0px"})
            .attr("pointer-events", "all");

        /* Toolbar items. */
        $("<p/>", {
            "id": "tlThreshold"
        }).appendTo(timelineContainer);

        return timelineContainer;
    };

    /* TODO: Rewrite in angular template. */
    /**
     * DOI view.
     * @param parentId Parent div id for the floating table div.
     * @param divId Div id.
     * @returns {*} The DOI view div container.
     */
    var createDOIView = function (parentId, divId) {
        /* New DOI view enclosing div. */
        $('<div/>', {
            "id": divId,
            "style": "margin-top: 30px; width: 100%;"
        }).appendTo("#" + parentId);

        /* New DOI view content. */
        var doiContainer = d3.select("#" + divId);

        $("<p/>", {
            "id": "doiTitle",
            "html": "DOI components"
        }).appendTo(doiContainer);

        $("<div/>", {
            "id": "doiVis",
            "style": "width: 100%; height: 300px;"
        }).appendTo(doiContainer);

        $("<div/>", {
            "id": "doiCanvas",
            "style": "width: 70px; float: left;"
        }).appendTo("#doiVis");

        d3.select("#doiCanvas").append("svg")
            .attr("height", 300)
            .attr("width", 100)
            .style({"margin-top": "0px", "margin-left": "0px", "padding": "0px"})
            .attr("pointer-events", "all").append("g").append("g").attr("transform", function () {
                return "translate(0,0)";
            }).append("g");

        /* Toolbar items. */
        $("<div/>", {
            "id": "doiButtonGroup",
            "class": "btn-group",
            "style": "width: 100%"
        }).appendTo(doiContainer);

        $("<button/>", {
            "id": "prov-doi-view-apply",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Apply",
            "data-html": "true",
            "title": "Apply"
        }).appendTo("#" + "doiButtonGroup");

        $("<button/>", {
            "id": "prov-doi-view-reset",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Reset",
            "data-html": "true",
            "title": "Reset"
        }).appendTo("#" + "doiButtonGroup");

        $("<button/>", {
            "id": "prov-doi-view-show",
            "class": "btn btn-mini",
            "type": "button",
            "rel": "tooltip",
            "data-placement": "bottom",
            "html": "Show",
            "data-html": "true",
            "title": "Show"
        }).appendTo("#" + "doiButtonGroup");

        return doiContainer;
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
     * Sidebar.
     * @param parentId Parent div id for the floating sidebar div.
     * @param divId Container div id.
     * @returns {*} The sidebar div container.
     */
    var createSidebar = function (parentId, divId) {
        /* New sidebar view enclosing div. */
        $('<div/>', {
            "id": divId
        }).appendTo("#" + parentId);

        /* New sidebar view content. */
        var sideBarContainer = d3.select("#" + divId);

        return sideBarContainer;
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

                /* Set drawing constants. */
                var r = 7,
                    color = d3.scale.category20();

                /* Declare graph. */
                var graph = Object.create(null);

                /* Render glyph legend. */
                renderGlyphLegend();

                /* Left floated and docked sidebar. */
                createSidebar("provenance-canvas", "provenance-sidebar");

                /* On-top docked table. */
                var nodeTable = createNodeTable("provenance-canvas", "provenance-table");

                /* Timeline view div. */
                var timelineView = createTimelineView("provenance-sidebar", "provenance-timeline-view");

                /* DOI view div. */
                var doiView = createDOIView("provenance-sidebar", "provenance-doi-view");

                /* Init node cell dimensions. */
                var cell = {width: r * 5, height: r * 5};

                /* Initialize canvas dimensions. */
                var width = $("div#provenance-canvas").width() - margin.left - margin.right,
                    height = 700/*window.innerHeight*/ - margin.top - margin.bottom;

                var scaleFactor = 0.75;

                /* Create vis and add graph. */
                vis = new provvisDecl.ProvVis("provenance-graph", zoom, data, url, canvas, nodeTable, rect, margin, width,
                    height, r, color, graph, timelineView, cell);

                /* Geometric zoom. */
                var redraw = function () {
                    /* Translation and scaling. */
                    vis.canvas.attr("transform", "translate(" + d3.event.translate + ")" +
                        " scale(" + d3.event.scale + ")");

                    /* Hide and show labels at specific threshold. */
                    if (d3.event.scale < 1) {
                        vis.canvas.selectAll(".labels").classed("hiddenLabel", true);
                        d3.selectAll(".glAnchor").classed("hiddenNode", true);
                        d3.selectAll(".grAnchor").classed("hiddenNode", true);
                    } else {
                        vis.canvas.selectAll(".labels").classed("hiddenLabel", false);
                        d3.selectAll(".glAnchor").classed("hiddenNode", false);
                        d3.selectAll(".grAnchor").classed("hiddenNode", false);
                    }

                    /* Fix for rectangle getting translated too - doesn't work after window resize. */
                    vis.rect.attr("transform", "translate(" +
                        (-(d3.event.translate[0] + vis.margin.left) / d3.event.scale) + "," +
                        (-(d3.event.translate[1] + vis.margin.top) / d3.event.scale) + ")" +
                        " scale(" + (+1 / d3.event.scale) + ")");

                    /* Fix to exclude zoom scale from text labels. */
                    vis.canvas.selectAll(".aBBoxLabel").attr("transform", "translate(" + 2 +
                        "," + (0.5 * scaleFactor * vis.radius) + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".saBBoxLabel").attr("transform", "translate(" + 0 +
                        "," + 0 + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".nodeDoiLabel").attr("transform", "translate(" + 0 +
                        "," + (2 * scaleFactor * vis.radius) + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".nodeAttrLabel").attr("transform", "translate(" +
                        (-cell.width / 2 + 5) + "," + (-vis.radius) + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".subanalysisLabel").attr("transform", "translate(" + 0 +
                        "," + 0 + ")" + "scale(" + (+1 / d3.event.scale) + ")");
                    vis.canvas.selectAll(".analysisLabel").attr("transform", "translate(" + 0 + "," +
                        (scaleFactor * vis.radius) + ")" + "scale(" + (+1 / d3.event.scale) + ")");
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
                vis.graph = provvisInit.run(data, analysesData, solrResponse);

                /* Compute layout. */
                vis.graph.bclgNodes = provvisLayout.run(vis.graph, vis.cell);

                /* Discover and and inject motifs. */
                provvisMotifs.run(vis.graph, vis.cell);

                /* Render graph. */
                provvisRender.run(vis);
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
        run: function (studyUuid, studyAnalyses, solrResponse) {
            runProvVisPrivate(studyUuid, studyAnalyses, solrResponse);
        }, update: function (solrResponse) {
            runProvVisUpdatePrivate(solrResponse);
        }, get: function () {
            return getProvVisPrivate();
        }
    };
}();