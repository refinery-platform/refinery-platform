// Adapted the mbostock examle (see http://bl.ocks.org/mbostock/4062045#miserables.json)
// For zoom and pan support with force layouts: http://stackoverflow.com/questions/7871425/is-there-a-way-to-zoom-into-a-d3-force-layout-graph

// canvas dimensions
var width = window.innerWidth - 50,
  height = window.innerHeight - 50;

// initializations
var dataset = null,
  nodes = [],
  links = [],
  node = null,
  link = null,
  nodeHash = [],
  studyHash = [],
  studyAssays = [],
  ddStudiesList = null,
  selStudy = "",
  selNodes = [],
  selLinks = [],
  selNodeHash = [],
  getSelLinkSourceHash = [],
  getSelLinkTargetHash = [],
  breadth = -1,
  depth = -1,
  selInputNodes = [],
  selNormalNodes = [];

// main canvas drawing area
//var canvas = d3.select(".vis")
var canvas = d3.select("#provenance-graph")
  .append("svg:svg")
  .attr("width", width)
  .attr("height", height)
  .attr("pointer-events", "all")
  .append("svg:g")
  .call(d3.behavior.zoom().on("zoom", redraw))
  .append("svg:g");

// helper rectangle to support pan & zoom
var rect = canvas.append('svg:rect')
  .attr("width", width)
  .attr("height", height)
  .classed("brect", true);

// primitive dimensions
var r = 6;


// initialize force layout
var force = d3.layout.force()
  .charge(-120)
  .linkDistance(30)
  .size([width, height]);

// drag and drop node enabled
drag = force.drag()
  .on("dragstart", dragstart)
  .on("dragend", dragend);


function traverseShift (selNodeId, shiftAmount) {
  var cur = { o: selNodes[selNodeId],
        succ: getSelLinkTargetHash[selNodeId]
      };

  cur.o.row = selNodes[selNodeId].row + shiftAmount;

  // DFS for each successor
  if (typeof cur.succ !== "undefined") {
    getSelLinkTargetHash[selNodeId].forEach( function (s) {
      traverseShift (s, shiftAmount);
    });
  }
}


function groupNodesByCol (tNodes) {
  var layer = 10,
    cgNodes = [], // column grouped nodes
    cgtNodes = [],
    rtNodes = [];

  tNodes.forEach(function (d) {
    rtNodes.push(copyNode(d));
  });

  cgtNodes.push([]);
  var i = 0;
  rtNodes.reverse().forEach( function (n) {
    if (selNodes[n.id].col === layer) {
      cgtNodes[i].push(selNodes[n.id]);
    } else {
      i++;
      layer--;
      cgtNodes.push([]);
      cgtNodes[i].push(selNodes[n.id]);
    }
  });

  return cgtNodes;
}


function copyNode (node) {
  var newNode = {name: "", type: "", uuid: "", study: "", assay: "", fixed: false, row: -1, col: -1, parents: [], id: -1};

  newNode.name = node.name;
  newNode.type = node.type;
  newNode.uuid = node.uuid;
  newNode.study = node.study;
  newNode.assay = node.assay;
  newNode.fixed = node.fixed;
  newNode.row = node.row;
  newNode.col = node.col;
  newNode.id = node.id;

  node.parents.forEach( function (p,i) {
    newNode.parents[i] = p;
  });

  return newNode;
}


function placeNodes(lgNodes) {
  var layer = 10,
    row = 0,
    curRow = 0;

  // from right to left
  lgNodes.forEach( function (lg) {
    console.log("Layer: " + layer + ", Nodes: " + lg.length);
    lg.forEach( function (n) {
      var cur = { id: selNodeHash[n.uuid], 
        o: selNodes[selNodeHash[n.uuid]],
        pred: getSelLinkSourceHash[selNodeHash[n.uuid]],
        succ: getSelLinkTargetHash[selNodeHash[n.uuid]],
        neighbors: []
      };
      console.log(cur);

      // for each successor get pred (= neighbors)
      var neighbors = [];
      if (typeof cur.succ !== "undefined") {
        cur.succ.forEach( function (s) {
          selNodes[s].parents.forEach(function (p) {
            if (selNodes[selNodeHash[p]].id !== cur.id) {
              neighbors.push(selNodeHash[p]);
            }
          });
        });
        cur.neighbors = neighbors;
      }
      
      // SUCC UNDEFINED
      if (typeof cur.succ === "undefined") {
        // PRED DEFINED
        if (typeof cur.pred !== "undefined") {
          // 1 PRED
          if (cur.pred.length === 1) {
            curRow = row;
            row++;
          } 
          // n PRED
          else {
            // TODO
          }
        } 
        // PRED UNDEFINED
        else {
          curRow = row;
        }
      } 
      // SUCC DEFINED
      else {
        var minRow;
        var maxRow;
        var visited;

        // PRED DEFINED
        if (typeof cur.pred !== "undefined") {

          // 1 PRED 1 SUCC
          if (cur.pred.length === 1 && cur.succ.length === 1) {
            // 0 NEIGHBORS
            if (cur.neighbors.length === 0) {
              curRow = selNodes[cur.succ[0]].row;
            } else {
            // n NEIGHBORS
              // check neighbors visited
              visited = 0;
              cur.neighbors.forEach( function (nb) {
                if (selNodes[nb].visited) {
                  visited++;
                }
              });
              curRow = selNodes[cur.succ[0]].row - (cur.neighbors.length / 2) + visited;
            }
          }
          // 1 PRED n SUCC
          else if (cur.pred.length === 1 && cur.succ.length > 1) {
            minRow = selNodes[cur.succ[0]].row;
            maxRow = -1;

            // get min and max row for SPLIT BRANCH
            cur.succ.forEach( function (s) {
              if (selNodes[s].row < minRow) {
                minRow = selNodes[s].row;
              }
              if (selNodes[s].row > maxRow) {
                maxRow = selNodes[s].row;
              }
            });
            if ((minRow + (maxRow - minRow) / 2) === curRow) {
              curRow += curRow;
            } else {
              curRow = minRow + (maxRow - minRow) / 2;
            }
          }
          // n PRED 1 SUCC
          else if (cur.pred.length > 1 && cur.succ.length === 1) {
            curRow = selNodes[cur.succ[0]].row + cur.pred.length/2;

            // traverse graph and shift succs by row_shift
            traverseShift(cur.succ[0], cur.pred.length/2);
          } 
          // n PRED n SUCC
          // TODO: 
          else {
            minRow = selNodes[cur.succ[0]].row;
            maxRow = -1;

            // get min and max row for SPLIT BRANCH
            cur.succ.forEach( function (s) {
              if (selNodes[s].row < minRow) {
                minRow = selNodes[s].row;
              }
              if (selNodes[s].row > maxRow) {
                maxRow = selNodes[s].row;
              }
            });

            // 0 NEIGHBORS
            if (cur.neighbors.length === 0) {
              curRow = minRow + (maxRow - minRow) / 2;
            } else {
            // n NEIGHBORS
              // check neighbors visited
              visited = 0;
              cur.neighbors.forEach( function (nb) {
                if (selNodes[nb].visited) {
                  visited++;
                }
              });
              curRow = selNodes[cur.succ[0]].row - (cur.neighbors.length / 2) + visited;
            }
          }
        }
        // PRED UNDEFINED
        else {
          // 1 SUCC
          if (cur.succ.length === 1) {
            curRow = selNodes[cur.succ[0]].row;
          }
          // n SUCC
          else {
            minRow = selNodes[cur.succ[0]].row;
            maxRow = -1;

            // get min and max row for SPLIT BRANCH
            cur.succ.forEach( function (s) {
              if (selNodes[s].row < minRow) {
                minRow = selNodes[s].row;
              }
              if (selNodes[s].row > maxRow) {
                maxRow = selNodes[s].row;
              }
            });

            curRow = minRow + (maxRow - minRow) / 2;
          }
        }
      }
      selNodes[n.id].row = curRow;
      cur.o.visited = true;
    });
    layer--;
    row = 0;
  });
}


function coffmanGrahamLayering (tNodes) {
  var layer = 10,
    succ = [],
    rtNodes = [];

  
  tNodes.forEach( function (d) {
    rtNodes.push(copyNode(d));
  });

  rtNodes.reverse().forEach( function (n) {
    // get outgoing neighbor
    succ = getSelLinkTargetHash[selNodeHash[n.uuid]];
    if (typeof succ === "undefined") {
      /* 
      console.log(selNodeHash[n.uuid])
      console.log(n)
      console.log("type: output")
      */

      selNodes[n.id].col = 10;
      n.col = 10;
    } else {

      //console.log(selNodeHash[n.uuid])
      var maxSuccLayer = 10; 
      succ.forEach (function (s) {
        /*
        console.log("@succs:");
        console.log(s);
        console.log("layer: " + selNodes[s].col);
        */
        if (selNodes[s].col < maxSuccLayer) {
          maxSuccLayer = selNodes[s].col;
        }
      });
      selNodes[n.id].col = maxSuccLayer - 1;
      n.col = maxSuccLayer -1;
    }
    //console.log("====");
  });
}


// http://en.wikipedia.org/wiki/Topological_sorting
function topSort (inputs) {
  var s = [],
    l = [],
    cnodes = [],
    n = null,
    succ = [];
  
  // deep copy arrays by value
  inputs.forEach( function (inNode) {
    s.push(copyNode(inNode));
  });
  selNodes.forEach( function (selNode) {
    cnodes.push(copyNode(selNode));
  });

  // to avoid definition of function in while loop below (added by NG)
  var handleUndefined = function (m) {
    // delete parent with p.uuid == n.uuid
    var index = -1;
    cnodes[m].parents.forEach( function (p,i) {
      if (p == n.uuid) {
        index = i;
      }
    });
    if (index > -1) {
      cnodes[m].parents.splice(index, 1);
    }
    if (cnodes[m].parents.length === 0) {
      s.push(cnodes[m]);
    }
  };  

  while(s.length > 0) {
    n = s.shift();
    l.push(n);

    // n (src) -> m (tar)
    succ = getSelLinkTargetHash[selNodeHash[n.uuid]];

    if (typeof succ !== "undefined") {
      succ.forEach( handleUndefined );
    }
  }
  
  return l;
  }

function traverseLayout (d) {
  var cur = { id: selNodeHash[d.uuid], 
        o: selNodes[selNodeHash[d.uuid]],
        pred: getSelLinkSourceHash[selNodeHash[d.uuid]],
        succ: getSelLinkTargetHash[selNodeHash[d.uuid]]
      };
}

function ddClick (index, val) {
  var selStudy = val;

  // fade out
  d3.selectAll(".link").transition().duration(500).style("opacity", 0.0);
  d3.selectAll(".node").transition().duration(500).style("opacity", 0.0);
  d3.selectAll(".inputNode").transition().duration(500).style("opacity", 0.0);

  //document.getElementById("activeStudyLabel").innerHTML = index.toString() + " <span class=\"caret\"></span>";

  setTimeout(function() {

    d3.selectAll(".link").remove();
    d3.selectAll(".node").remove();
    d3.selectAll(".inputNode").remove();

    // reset 
    selNodes = [];
    selLinks = [];
    getSelLinkSourceHash = [];
    getSelLinkTargetHash = [];
    breadth = -1;
    depth = -1;
    selInputNodes = [];
    selNormalNodes = [];
    topNodes = [];

    if (val != "All") {
      selNodeHash = [];

      // filter by study

      // extract nodes
      var j = 0,
        k = 0;
      nodes.forEach(function(n, i) {
        if (studyHash[i] == selStudy) {
          n.id = k;
          selNodes.push(n);
          selNodeHash[n.uuid] = j;
          if (n.type == "input") {
            selInputNodes.push(n);
          } else {
            selNormalNodes.push(n);
          }

          j++; 
          k++;
        }
      });

      // console.log("******selNodes")
      // console.log(selNodes)
      // extract links
      selNodes.forEach(function(n, i) {
        if (typeof n.uuid !== "undefined" && typeof n.parents !== "undefined" && n.parents.length > 0) {
          
          var sourceIds = [],
            targetIds = [];
          // for each parent entry
          n.parents.forEach(function(z) {
            selLinks.push({
              source: selNodeHash[z],
              target: i
            });
            sourceIds.push(selNodeHash[z]);
            if (getSelLinkTargetHash.hasOwnProperty(selNodeHash[z])) {
              getSelLinkTargetHash[selNodeHash[z]] = getSelLinkTargetHash[selNodeHash[z]].concat([i]);
            } else {
              getSelLinkTargetHash[selNodeHash[z]] = [i];
            }
          });

          getSelLinkSourceHash[i] = sourceIds;  
        }
      });
    } else {
      selNodes = nodes;
      selLinks = links;
    }

    /* console.log();
    console.log("DEBUG");
    console.log("###########");
    console.log("selInputNodes");
    console.log(selInputNodes);

    console.log("selNormalNodes");
    console.log(selNormalNodes);

    console.log("selLinks");
    console.log(selLinks);
    console.log(selLinks.length);


    console.log("getSelLinkSourceHash");
    console.log(getSelLinkSourceHash);

    console.log("getSelLinkTargetHash");
    console.log(getSelLinkTargetHash);
    console.log(getSelLinkTargetHash.length);*/



    // set columns for nodes
    selInputNodes.forEach( function (d) {
      d.col = 0;
      d.visited = true;
    });

    // init rows for inputs first
    selInputNodes.forEach( function (d,i) {
      d.row = i;
    });

    // get max breath and depth
    breadth = 10;
    depth = 10;


    // layout

    // set all nodes to unvisted
    selNodes.forEach( function (d) {
      d.visited = false;
    });

    // toplogical order
    topNodes = topSort(selInputNodes);
    /*console.log("topNodes")
    console.log(topNodes)*/

    // coffman-graham layering
    coffmanGrahamLayering(topNodes);

    // group nodes by layer
    cgtNodes = groupNodesByCol(topNodes);
    console.log(cgtNodes);

    // place vertices
    placeNodes(cgtNodes);



    // set coordinates for nodes
    selNodes.forEach( function (d,i) {
      d.x = d.col * 50 + 100;
      d.y = d.row * 50 + 100;
    });

    // start force layout
    force
      .nodes(selNodes)
      .links(selLinks)
      .start();

    // draw links
    link = canvas.selectAll(".link")
      .data(selLinks)
      .enter().append("line")
      .classed({
        "link": true
      })
      .style("opacity", 0.0);

    // draw nodes
    node = canvas.selectAll(".node")
      .data(selNodes)
      .enter().append("circle")
      .classed({
        "inputNode": (function(d) {
          return d.type === "input";
        }),
        "node": (function(d) {
          return d.type !== "input";
        })
      })
      .attr("r", r)
      .style("opacity", 0.0)
      .call(drag);

    // add tooltip
    node.append("title")
      .text(function(d) {
        return d.index;
      });

    // update function for node dragging
    force.on("tick", update);

    // trigger success label
    //labelSuccess = document.getElementById("success");
    //labelSuccess.innerHTML = selNodes.length + " nodes processed.";

    //labelSuccess.className = "label label-success";
    //console.log(li.innerHTML);


    // debug info
    //console.log(selNodes);
    //console.log(selLinks);
    // console.log(studyHash);
    // console.log(studyAssays);
    //console.log(selStudy);

    // fade in
    d3.selectAll(".link").transition().duration(500).style("opacity", 0.7);
    d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
    d3.selectAll(".inputNode").transition().duration(500).style("opacity", 1.0);
  }, 500);
}


// load data within callback function
//d3.json("data/example_2600.json", function(error, data) {


function runProvenanceVisualization( studyUuid ) {
  var url = "/api/v1/node?study__uuid=" + studyUuid + "&format=json";

  d3.json(url, function(error, data) {
    // parse json file; extract raw node objects
    var obj = d3.entries(data)[1];

    // extract nodes 
    d3.values(obj.value).forEach(function(x, i) {
      var type;
      if (x.parents.length === 0) {
        type = "input";
      }
      else {
        type = "normal";
      }

      nodes.push({
        name: x.name,
        type: type,
        uuid: x.uuid,
        study: (x.study !== null) ? x.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
        assay: (x.assay !== null) ? x.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
        parents: x.parents.map(function(y) {
          return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
        }),
        fixed: true,
        row: -1,
        col: -1,
        id: i
      });
      nodeHash[x.uuid] = i;
      studyHash[i] = x.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "");
      if (x.assay !== null)
        studyAssays[x.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "")] = x.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "");
    });

    console.log(nodes);

    /*
    // get html drop down element
    ddStudiesList = document.getElementById("studies");

    // fill dropdown list with studies
    Object.keys(studyAssays).forEach(function(a, i) {
      var li = document.createElement("li");
      li.innerHTML = "<a href=\"#\" onclick=\"ddClick('" + i + "','" + a + "')\" tabindex =\"-1\">" + i + ": " + a + "</a>";
      //console.log(li.innerHTML);
      ddStudiesList.appendChild(li);
    });
    */

    // extract links
    nodes.forEach(function(x) { // x may be parent of y
      if (typeof x.uuid !== "undefined" && typeof x.parents !== "undefined") {
        // for each parent entry
        x.parents.forEach(function(z, k) {
          links.push({
            source: nodeHash[x.parents[k]],
            target: nodeHash[x.uuid]
          });
        });
      }
    });

    ddClick( 0, studyUuid );
  });

}

// geometric zoom
function redraw() {
  // tranlation and scaling
  canvas.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
  // fix for rectangle getting translated too, doesn't work after window resize
  rect.attr("transform", "translate(" + (-d3.event.translate[0] * 1 / d3.event.scale) + "," + (-d3.event.translate[1] * 1 / d3.event.scale) + ")" + " scale(" + (+1 / d3.event.scale) + ")");
}

// update function for node dragging

function update() {
  link.attr("x1", function(d) {
    return d.source.x;
  })
    .attr("y1", function(d) {
      return d.source.y;
    })
    .attr("x2", function(d) {
      return d.target.x;
    })
    .attr("y2", function(d) {
      return d.target.y;
    });

  node.attr("cx", function(d) {
    return d.x;
  })
    .attr("cy", function(d) {
      return d.y;
    });
}

// drag support for nodes in force layout

function dragstart(d) {
  d3.event.sourceEvent.stopPropagation();
}

function dragend(d) {}