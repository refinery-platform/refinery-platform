/**
 * The refinery provenance graph visualization.
 *
 * @author sluger Stefan Luger https://github.com/sluger
 * @exports runProvVis The published function to run the visualization.
 */
var provvis = function () {

    /**
     * Refinery injection for the provenance visualization.
     * @param studyUuid The serialized unique identifier referencing a study.
     */
    var runProvVisPrivate = function (studyUuid) {
        var url = "/api/v1/node?study__uuid=" + studyUuid + "&format=json&limit=0";

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

            /* Create vis and add graph. */
            var vis = new provvisDecl.ProvVis("#provenance-graph", zoom, data, url, canvas, rect, margin, width,
                height, r, color, graph);

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
            vis.canvas = d3.select("#provenance-graph")
                .append("svg:svg")
                .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
                .attr("viewBox", "0 0 " + (width) + " " + (height))
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("pointer-events", "all")
                .append("svg:g")
                .call(vis.zoom = d3.behavior.zoom().on("zoom", redraw)).on("dblclick.zoom", null)
                .append("svg:g");

            /* Helper rectangle to support pan and zoom. */
            vis.rect = vis.canvas.append("svg:rect")
                .attr("width", width)
                .attr("height", height)
                .classed("brect", true);

            /* Extract graph data. */
            vis.graph = provvisInit.runInit(data);

            /* Compute layout. */
            provvisLayout.runLayout(vis.graph);

            /* Render graph. */
            provvisRender.runRender(vis);
        });
    };

    /**
     * Publish module function.
     */
    return{
        runProvVis: function (studyUuid) {
            runProvVisPrivate(studyUuid);
        }
    };
}();