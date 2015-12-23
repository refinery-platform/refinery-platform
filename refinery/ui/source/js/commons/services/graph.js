function GraphFactory (_) {

  function Graph () {}

  /**
   * Update a graph's annotations
   *
   * @method  updateAnnotations
   * @author  Fritz Lekschas
   * @date    2015-12-21
   * @static
   * @return  {Graph}  Updated graph.
   */
  Graph.updateAnnotations = function (graph, annotations) {
    // Note: Looping over the large graph uncondtionally and looping again over
    // all annotations is **faster** than one conditional loop, which is
    // potentially due to the high number of comparisions.
    var nodeKeys = Object.keys(graph), i;

    for (i = nodeKeys.length; i--;) {
      graph[nodeKeys[i]].numDataSets = 0;
    }

    nodeKeys = Object.keys(annotations);
    for (i = nodeKeys.length; i--;) {
      if (graph[nodeKeys[i]]) {
        graph[nodeKeys[i]].numDataSets = annotations[nodeKeys[i]].total;
      }
    }
  };

  /**
   * Prune graph and accumulate the value property.
   *
   * @method  accumulateAndPrune
   * @author  Fritz Lekschas
   * @date    2015-12-21
   *
   * @param   {Object}  data        Original graph.
   * @param   {String}  valueProp   Name of the property holding the value to be
   *                                accumulated.
   * @return  {Object}              Pruned graph.
   */
  Graph.accumulateAndPrune = function (graph, root, valueProp) {
    var node = graph[root];
    var nodeIndex = {};
    var numChildren = node.children ? node.children.length : false;

    node.meta = node.meta || {};

    if (numChildren) {
      accumulateAndPruneChildren(node, numChildren, valueProp, 0);
      if (node.value) {
        node.value += node[valueProp];
      } else {
        node.value = node[valueProp];
      }
    }

    /**
     * Recursively accumulate `valueProp` values and prune _empty_ leafs.
     *
     * This function traverses all inner loops and stops one level BEFORE a leaf
     * to be able to splice (delete) empty leafs from the list of children
     *
     * @method  accumulateAndPruneChildren
     * @author  Fritz Lekschas
     * @date    2015-08-18
     *
     * @param   {Object}   node         D3 data object of the node.
     * @param   {Number}   numChildren  Number of children of `node.
     * @param   {String}   valueProp    Property name of the propery holding the
     *   value of the node's _size_.
     * @param   {Number}   depth        Original depth of the current node.
     * @param   {Boolean}  root         If node is the root.
     */
    function accumulateAndPruneChildren (node, numChildren, valueProp, depth) {
      // Check if node has been processed already
      if (nodeIndex[node.uri]) {
        // Skip node
        return;
      } else {
        nodeIndex[node.uri] = true;
      }

      // A reference for later
      node.meta.originalDepth = depth;
      var i = numChildren;
      var j;

      // We move in reverse order so that deleting nodes doesn't affect future
      // indices.
      while (i--) {
        var child = graph[node.children[i]];
        var numChildChildren = child.children ? child.children.length : false;

        // Store a reference to the parent
        child.parent = node;

        child.meta = child.meta || {};

        if (numChildChildren) {
          // Inner node.
          accumulateAndPruneChildren(
            child, numChildChildren, valueProp, depth + 1);
          numChildChildren = child.children.length;
        }

        // We check again the number of children of the child since it can happen
        // that all children have been deleted meanwhile and the inner node became
        // a leaf as well.
        if (numChildChildren) {
          // Inner node.
          if (child[valueProp]) {
            // Add own `numDataSets` to existing `value`.
            child.value += child[valueProp];
          } else {
            // We prune `child` because it doesn't have any direct value in
            // two cases:
            // A) `child` is the only child of `node` or
            // B) `child` only has one child.
            // This way we ensure that the out degree of `child` is two or higher.
            if (numChildren === 1 || numChildChildren === 1) {
              // We can remove the inner node since it wasn't used for any
              // annotations.
              for (j = 0, len = child.children.length; j < len; j++) {
                // We keep a reference of _pruned_ children
                if (graph[child.children[j]].meta.pruned) {
                  graph[child.children[j]].meta.pruned.unshift(child.name);
                } else {
                  graph[child.children[j]].meta.pruned = [child.name];
                }
                node.children.push(child.children[j]);
              }
              // Remove the child with the empty valueProp
              node.children.splice(i, 1);

              // Check if we've processed the parent of the child to be pruned
              // already.
              if (!nodeIndex[child.parent.uri]) {
                // Only Mark node as being pruned
                child.pruned = true;
              }
            } else {
              // From this perspective the child doesn't need to be pruned. If
              // it has been marked as such already we should revert this.
              child.pruned = false;
            }
          }
        } else {
          // Leaf.
          if (!child[valueProp]) {
            // Leaf was not used for annotation so we remove it.
            node.children.splice(i, 1);
            numChildren--;
            child.pruned = true;
            continue;
          } else {
            child.value = child[valueProp];
            child.meta.leaf = true;
            child.meta.originalDepth = depth + 1;
          }
        }

        // Increase `value` if the node by the children's `numDataSets`.
        if (typeof node.value !== 'undefined') {
          node.value += child.value;
        } else {
          node.value = child.value;
        }
      }
    }

    // Make sure that the root node has at least 2 children
    if (node.children.length === 1) {
      graph[root].pruned = true;
      root = node.children[0];
    }

    // Clear pruned nodes
    var uris = Object.keys(graph);
    for (var i = uris.length; i--;) {
      if (graph[uris[i]].pruned) {
        graph[uris[i]] = undefined;
        delete graph[uris[i]];
      }
    }

    return {
      graph: graph,
      root: root
    };
  };

  /**
   * Initialize precision and recall in-place.
   *
   * @description
   * Initially recall will always be `1` because we are expected to return all
   * datasets in the beginnging.
   *
   * @method  initPrecisionRecall
   * @author  Fritz Lekschas
   * @date    2015-12-22
   * @param   {Object}   graph        Graph to be initialized.
   * @param   {Integer}  numDataSets  Total number of datasets.
   */
  Graph.initPrecisionRecall = function (graph, numDataSets) {
    var uris = Object.keys(graph), node;

    for (var i = uris.length; i--;) {
      node = graph[uris[i]];
      node.precision = node.numDataSets / numDataSets;
      node.precisionTotal = node.precision;
      node.recall = 1;
    }
  };

  /**
   * Helper function to copy in-place properties to `data.bars` which is needed
   * by the list graph.
   *
   * @description
   * The reason for having an extra `data` property is that cloned nodes will be
   * unique in any way except for their `data` property.
   *
   * @example
   * Given the following graph:
   * ```
   * {
   *   children: [...],
   *   name: 'test',
   *   length: 10
   * }
   * ```
   * The property `length` would be copied over like so:
   * ```
   * {
   *   children: [...],
   *   name: 'test',
   *   length: 10,
   *   data: {
   *     bars:
   *   }
   * }
   * ```
   *
   *
   * @method  propertyToBar
   * @author  Fritz Lekschas
   * @date    2015-12-22
   * @param   {Object}  graph       Graph to be modified.
   * @param   {Array}   properties  List of properties to be copied.
   */
  Graph.propertyToBar = function (graph, properties) {
    var uris = Object.keys(graph), node, propLeng = properties.length;

    for (var i = uris.length; i--;) {
      node = graph[uris[i]];
      if (!node.data) {
        node.data = { bars: {} };
      } else {
        node.data.bars = {};
      }
      for (var j = propLeng; j--;) {
        if (node[properties[j]]) {
          node.data.bars[properties[j]] = node[properties[j]];
        } else {
          node.data.bars[properties[j]] = 0;
        }
      }
    }
  };

  Graph.propertyToData = function (graph, properties) {
    var uris = Object.keys(graph), node, propLeng = properties.length;

    for (var i = uris.length; i--;) {
      node = graph[uris[i]];
      if (!node.data) {
        node.data = {};
      }

      for (var j = propLeng; j--;) {
        node.data[properties[j]] = node[properties[j]];
      }
    }
  };

  Graph.toTreemap = function (graph, root) {
    var newGraph = _.cloneDeep(graph),
        nodes = Object.keys(newGraph),
        node,
        uris;

    for (var i = nodes.length; i--;) {
      node = newGraph[nodes[i]];
      // Remove parent reference
      node.parent = undefined;
      delete node.parent;
      // Copy URIs temporarly
      uris = node.children.slice();
      // Initialize new array
      node.children = [];
      // Push node references into `children`
      for (var j = uris.length; j--;) {
        node.children.push(newGraph[uris[j]]);
      }
    }

    // Deep clone object to be usable by D3's treemap layout.
    return JSON.parse(JSON.stringify(newGraph[root]));
  };

  return Graph;
}

angular
  .module('refineryApp')
  .service('graph', [
    '_',
    GraphFactory
  ]);
