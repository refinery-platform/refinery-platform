'use strict';

function GraphFactory (_) {
  function Graph () {
  }

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
    // Note: Looping over the large graph unconditionally and looping again over
    // all annotations is **faster** than one conditional loop, which is
    // potentially due to the high number of comparisons.
    var nodeKeys = Object.keys(graph);
    var i;

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

  // TODO: Finish this rewrite of `accumulateAndPrune`
  // Graph.accumulateAndPruneNew = function (graph, root) {
  //   var nodeIndex = {};

  //   function processChild (parentNode, childNode) {
  //     // Store a reference to the parent
  //     if (!childNode.parents) {
  //       childNode.parents = [];
  //     }
  //     childNode.parents.push(parentNode);
  //   }

  //   function processLeaf (node, childNo) {
  //     if (node.value) {
  //       child.meta.leaf = true;
  //     } else {
  //       if (node.parent) {
  //         // Remove node from the parent's children array if parent exist.
  //         node.parent.children.splice(childNo, 1);
  //       }
  //       node.deleted = true;
  //     }
  //   }

  //   function processInnerNode (node) {
  //     if (node.children.length === 1 && node.value === 0) {

  //     }
  //   }

  //   function processNode (node, childNo) {
  //     // Set `value` property depending on the length of the actual value
  //     node.value = Object.keys(node[valueProp]).length;

  //     if (node.children.length) {
  //       // Inner node
  //       processInnerNode(node);
  //     } else {
  //       // Leaf
  //       processLeaf(node, childNo);
  //     }
  //   }

  //   function traverseDepthFirst (node, depth, childNo) {
  //     if (nodeIndex[node.uri]) {
  //       // Skip node
  //       return;
  //     }

  //     if (!node.meta) {
  //       node.meta = {};
  //     }

  //     // Distance to `OWL:Thing`
  //     node.meta.originalDepth = depth;

  //     // Traverse over all children from the last to the first
  //     for (var i = node.children.length; i--;) {
  //       processChild(node, graph[node.children[i]]);
  //       traverseDepthFirst(graph[node.children[i]], depth + 1, i);
  //     }

  //     processNode(node, childNo);
  //   }

  //   function init () {
  //     traverseDepthFirst(graph[root], 0, 0);
  //   }

  //   init();
  // };

  /**
   * Prune graph and accumulate the value property.
   *
   * @method  accumulateAndPrune
   * @author  Fritz Lekschas
   * @date    2016-04-08
   *
   * @param   {Object}  graph       Original graph.
   * @param   {Object}  rootUri     Root's Uri.
   * @param   {String}  valueProp   Name of the property holding the value to be
   *                                accumulated.
   * @return  {Object}              Pruned graph and root node.
   */
  Graph.accumulateAndPrune = function (graph, rootUri, valueProp) {
    var rootNode = graph[rootUri];
    var nodeIndex = {};

    rootNode.meta = rootNode.meta || {};

    /**
     * Recursively accumulate `valueProp` values and prune _empty_ leafs.
     *
     * This function traverses all inner loops and stops one level BEFORE a leaf
     * to be able to splice (delete) empty leafs from the list of children
     *
     * @method  accumulateAndPruneChildren
     * @author  Fritz Lekschas
     * @date    2016-01-15
     *
     * @param   {Object}   node         D3 data object of the node.
     * @param   {Number}   numChildren  Number of children of `node.
     * @param   {Number}   depth        Original depth of the current node.
     * @param   {Boolean}  root         If node is the root.
     */
    function accumulateAndPruneChildren (node, numChildren, depth) {
      function compareValues (arrayOne, arrayTwo) {
        var lenOne = arrayOne.length;
        var lenTwo = arrayTwo.length;

        if (lenOne !== lenTwo) {
          return false;
        }

        for (var i = lenOne; i--;) {
          if (arrayOne[i] !== arrayTwo[i]) {
            return false;
          }
        }

        return true;
      }

      function removeDuplicatedChildren (children) {
        var childIndex = {};

        for (var i = children.length; i--;) {
          if (!childIndex[children[i]]) {
            childIndex[children[i]] = true;
          } else {
            children.splice(i, 1);
          }
        }
      }

      // Check if node has been processed already
      if (nodeIndex[node.uri]) {
        // Skip node
        return;
      }

      // A reference for later
      node.meta.originalDepth = depth;
      var i = numChildren;
      var j;
      var len;
      var childValue;
      var parentsUri;

      // We move in reverse order so that deleting nodes doesn't affect future
      // indices.
      while (i--) {
        var child = graph[node.children[i]];
        var numChildChildren = child.children ? child.children.length : false;

        child.meta = child.meta || {};

        if (numChildChildren) {
          // Inner node.
          accumulateAndPruneChildren(
            child, numChildChildren, valueProp, depth + 1);
          numChildChildren = child.children.length;
        }

        childValue = Object.keys(child[valueProp]);

        // We check again the number of children of the child since it can happen
        // that all children have been deleted meanwhile and the inner node became
        // a leaf as well.
        if (numChildChildren) {
          var childChildValue = [];
          var valueSame = false;
          // When the child has only one child, check whether the children
          // annotations and the child child's annotation are equal
          if (numChildChildren === 1) {
            childChildValue = Object.keys(graph[child.children[0]][valueProp]);
            valueSame = compareValues(childValue, childChildValue);
          }
          // Inner node.
          if (childValue.length && !valueSame) {
            // Add own `numDataSets` to existing `value`.
            child.value = childValue.length;
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

                // Decrease the actual depth
                graph[child.children[j]].meta.depth--;

                if (graph[child.children[j]].parents) {
                  parentsUri = Object.keys(graph[child.children[j]].parents);
                  for (var o = parentsUri.length; o--;) {
                    // Remove child as parent from child's children and add node
                    // as a parent.
                    if (graph[child.children[j]].parents[parentsUri[o]] === child) {
                      // Remove former parent
                      graph[child.children[j]].parents[parentsUri[o]] = undefined;
                      delete graph[child.children[j]].parents[parentsUri[o]];
                      // Set new parent
                      graph[child.children[j]].parents[node.uri] = node;
                    }
                  }
                }

                node.children.push(child.children[j]);
              }
              // Remove the child with the empty valueProp
              node.children.splice(i, 1);

              child.pruned = true;

              // Check if we've processed the parent of the child to be pruned
              // already and set `pruned` to false.
              parentsUri = Object.keys(child.parents);
              for (var k = parentsUri.length; k--;) {
                if (nodeIndex[child.parents[parentsUri[k]].uri]) {
                  // Revert pruning
                  child.pruned = false;
                  break;
                }
              }
            } else {
              // From this perspective the child doesn't need to be pruned. If
              // it has been marked as such already we should revert this.
              child.pruned = false;
            }
          }
        } else {
          // Leaf.
          if (childValue.length === 0) {
            // Leaf was not used for annotation so we remove it.
            node.children.splice(i, 1);
            child.pruned = true;
            continue;
          } else {
            child.value = childValue.length;
            child.meta.leaf = true;
            child.parents = {};
            child.parents[node.uri] = node;
          }
        }

        // Merge child's `valueProp` with the parent's, i.e. `node`,
        // `valueProp`.
        for (var p = childValue.length; p--;) {
          node[valueProp][childValue[p]] = true;
        }
        node.value = Object.keys(node[valueProp]).length;
      }

      removeDuplicatedChildren(node.children);

      // Mark node as being parsed
      nodeIndex[node.uri] = true;
    }

    if (rootNode.children && rootNode.children.length) {
      accumulateAndPruneChildren(
        rootNode,
        rootNode.children.length,
        valueProp,
        0
      );
    }

    // Make sure that the root node has at least 2 children
    if (rootNode.children.length === 1) {
      graph[rootUri].pruned = true;
      rootNode = graph[rootNode.children[0]];
    }

    // Clear pruned nodes
    var uris = Object.keys(graph);
    for (var i = uris.length; i--;) {
      if (graph[uris[i]].pruned) {
        graph[uris[i]] = undefined;
        delete graph[uris[i]];
      } else if (!graph[uris[i]].meta) {
        // Remove parent reference first
        for (var ii = graph[uris[i]].children.length; ii--;) {
          if (!graph[graph[uris[i]].children[ii]]) {
            continue;
          }

          graph[graph[uris[i]].children[ii]].parents[uris[i]] = undefined;
          delete graph[graph[uris[i]].children[ii]].parents[uris[i]];
        }

        // Remove reference to the node itself
        graph[uris[i]] = undefined;
        delete graph[uris[i]];
      }

      // Normalize labels
      var noUnderScore = /_/gi;
      if (graph[uris[i]]) {
        graph[uris[i]].name = (
          graph[uris[i]].label = (
          graph[uris[i]].label.charAt(0).toUpperCase() +
          graph[uris[i]].label.slice(1)
            ).replace(noUnderScore, ' ')
        );
      }
    }

    return {
      graph: graph,
      root: rootNode.uri
    };
  };

  /**
   * Initialize precision and recall in-place.
   *
   * @description
   * Initially recall will always be `1` because we are expected to return all
   * datasets in the beginning.
   *
   * @method  initPrecisionRecall
   * @author  Fritz Lekschas
   * @date    2015-12-22
   * @param   {Object}   graph      Graph to be initialized.
   * @param   {String}   valueProp  Name of the property that represents
   *   an object of unique elements. The number of unique elements accounts for
   *   the rectangle size of the tree map and length of the bar charts. The
   *   property needs to be an object to easily assess unique IDs without
   *   having to iterate over the array all the time.
   * @param   {Array}  allIds      All data set IDs
   */
  Graph.calcPrecisionRecall = function (graph, valueProperty, allIds) {
    var uris = Object.keys(graph);
    var node;
    var numAnnoDataSets = allIds.length;
    var retrievedDataSetsId;

    // Convert from an array of strings to an array of integers.
    var allIntIds = _.map(allIds, function (el) {
      return parseInt(el, 10);
    });

    for (var i = uris.length; i--;) {
      node = graph[uris[i]];

      if (!node.clone) {
        retrievedDataSetsId = Object.keys(Graph.getNodeRetrievedDataSet(
          Object.keys(node[valueProperty]), allIntIds
        )).length;
        node.precision = retrievedDataSetsId / numAnnoDataSets;
        node.recall = retrievedDataSetsId /
        Object.keys(node[valueProperty]).length;
      }
    }
  };

  /**
   * Helper method to match two arrays of IDs
   *
   * @description
   * This method is used to check how many of the IDs in `dsIds` are present in
   * `retrievedIds`.
   *
   * @method  getNodeRetrievedDataSet
   * @author  Fritz Lekschas
   * @date    2016-05-05
   * @param   {Array}   dsIds         Array of integer or string-based IDs.
   * @param   {Array}   retrievedIds  Array of integer-based IDs.
   * @return  {Object}                Object list of matched IDs.
   */
  Graph.getNodeRetrievedDataSet = function (dsIds, retrievedIds) {
    var retrievedNodeDsIds = {};

    for (var i = dsIds.length; i--;) {
      if (!!~retrievedIds.indexOf(parseInt(dsIds[i], 10))) {
        retrievedNodeDsIds[dsIds[i]] = true;
      }
    }

    return retrievedNodeDsIds;
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
    var uris = Object.keys(graph);
    var node;
    var propLeng = properties.length;

    for (var i = uris.length; i--;) {
      node = graph[uris[i]];
      if (!node.data) {
        node.data = {
          bars: {}
        };
      } else {
        if (!node.data.bars) {
          node.data.bars = {};
        }
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

  /**
   * Helper method to copy root properties onto the corresponding bar value
   * property.
   *
   * @method  updatePropertyToBar
   * @author  Fritz Lekschas
   * @date    2016-05-05
   * @param   {Object}  graph       Annotation term graph.
   * @param   {Array}   properties  Array of properties (strings).
   */
  Graph.updatePropertyToBar = function (graph, properties) {
    var uris = Object.keys(graph);
    var node;

    // For every node in the graph...
    for (var i = uris.length; i--;) {
      node = graph[uris[i]];
      for (var j = properties.length; j--;) {
        // ...if the property is actually available
        if (typeof node[properties[j]] !== 'undefined') {
          // ...we look at every bar
          for (var k = node.data.bars.length; k--;) {
            // ...and if the property name matches the bar ID
            if (node.data.bars[k].id === properties[j]) {
              // ...we copy the property from the root to the bar object.
              node.data.bars[k].value = node[properties[j]];
            }
          }
          // ...finally we update the helper bar references as well
          if (
            node.data.barRefs &&
            typeof node.data.barRefs[properties[j]] !== 'undefined'
          ) {
            node.data.barRefs[properties[j]] = node[properties[j]];
          }
        }
      }
    }
  };

  /**
   * Helper method to copy root properties of nodes onto the data property.
   *
   * @method  propertyToData
   * @author  Fritz Lekschas
   * @date    2016-05-05
   * @param   {Object}  graph       Annotation term graph.
   * @param   {Array}   properties  Array of properties (strings).
   */
  Graph.propertyToData = function (graph, properties) {
    var uris = Object.keys(graph);
    var node;
    var propLeng = properties.length;

    // For every node in the graph...
    for (var i = uris.length; i--;) {
      node = graph[uris[i]];
      // ...we initialize a data property if it does not exist
      if (!node.data) {
        node.data = {};
      }

      // ...and copy every property onto the data property object
      for (var j = propLeng; j--;) {
        node.data[properties[j]] = node[properties[j]];
      }
    }
  };

  /**
   * Transform graph into a tree.
   *
   * @method  toTree
   * @author  Fritz Lekschas
   * @date    2016-05-05
   * @param   {Object}  graph  Reference-based annotation term graph.
   * @param   {String}  root   URI of root node.
   * @return  {Object}         Tree.
   */
  Graph.toTree = function (graph, root) {
    var nodeVisited = {};
    var tree = {};

    /**
     * Duplicate a node
     *
     * @method  duplicateNode
     * @author  Fritz Lekschas
     * @date    2016-05-05
     * @param   {Object}  originalNode  Original node.
     * @return  {Object}                Cloned node.
     */
    function duplicateNode (originalNode) {
      originalNode.meta.numClones++;

      var newId = originalNode.uri + '.' + originalNode.meta.numClones;

      tree[newId] = {
        children: [],
        childrenIds: [],
        cloneId: originalNode.meta.numClones,
        dataSets: originalNode.dataSets,
        assertedDataSets: originalNode.assertedDataSets,
        uri: originalNode.uri,
        ontId: originalNode.ontId,
        meta: originalNode.meta,
        name: originalNode.name,
        value: originalNode.value
      };

      // Copy the `childrenIds` property
      // `slice` creates a shallow copy which is all we need since `childrenIds`
      // only contains URIs.
      tree[newId].childrenIds = originalNode.childrenIds.slice();

      return tree[newId];
    }

    /**
     * Traverse the graph in a depth-first-search fashion and prepare nodes.
     *
     * @method  traverse
     * @author  Fritz Lekschas
     * @date    2016-05-05
     * @param   {Object}  node  Node to be prepared and traversed.
     */
    function traverse (node) {
      var child;

      // Keep track of visited nodes
      nodeVisited[node.uri] = true;

      if (!node.meta) {
        node.meta = {};
      }

      if (!node.cloneId) {
        node.childrenIds = node.children;
        node.children = [];
        node.cloneId = 0;
        node.meta.numClones = 0;
      }

      for (var i = node.childrenIds.length; i--;) {
        if (!nodeVisited[node.childrenIds[i]]) {
          child = tree[node.childrenIds[i]];
          node.children.push(tree[node.childrenIds[i]]);
        } else {
          // Need to duplicate node
          child = duplicateNode(tree[node.childrenIds[i]]);
          // Update parent's child ID
          node.childrenIds[i] = child.uri;
          node.children.push(child);
        }

        traverse(child);
      }
    }

    /**
     * Copy / clone nodes from the original graph (i.e. `oldGraph`) to the
     * tree (i.e. `newGraph`).
     *
     * @method  copyNodes
     * @author  Fritz Lekschas
     * @date    2016-05-05
     * @param   {Object}  oldGraph  Original graph.
     * @param   {Object}  newGraph  New tree.
     */
    function copyNodes (oldGraph, newGraph) {
      var nodeIds = Object.keys(oldGraph);
      var properties;

      function deepCloneObj (sourceNode, targetNode, property) {
        targetNode[property] = _.cloneDeep(sourceNode[property]);
      }

      for (var i = nodeIds.length; i--;) {
        newGraph[nodeIds[i]] = {};
        properties = Object.keys(oldGraph[nodeIds[i]]);

        for (var j = properties.length; j--;) {
          switch (properties[j]) {
            // Skip the following properties
            case 'parents':
              continue;
            case 'children':
              // Initialize new array
              newGraph[nodeIds[i]].children =
                oldGraph[nodeIds[i]].children.slice();
              break;
            // Deep copy the following properties
            case 'data':
            case 'meta':
              deepCloneObj(
                oldGraph[nodeIds[i]],
                newGraph[nodeIds[i]],
                properties[j]
              );
              break;
            // Normal copy by default
            default:
              newGraph[nodeIds[i]][properties[j]] =
                oldGraph[nodeIds[i]][properties[j]];
              break;
          }
        }
      }
    }

    /**
     * Remove all unvisited nodes of the tree.
     *
     * @description
     * An in-line method to remove unvisited nodes of the tree
     *
     * @method  removeUnusedNodes
     * @author  Fritz Lekschas
     * @date    2016-05-05
     */
    function removeUnusedNodes () {
      var ids = Object.keys(tree);
      for (var k = ids.length; k--;) {
        if (!nodeVisited[ids[k]]) {
          delete tree[ids[k]];
          tree[ids[k]] = undefined;
        }
      }
    }

    copyNodes(graph, tree);
    traverse(tree[root]);
    removeUnusedNodes();

    return tree[root];
  };

  /**
   * Helper method to add a pseudo sibling representing _no annotations_ to the
   * root node.
   *
   * @description
   * Technically this node does not correspond to an ontology class but it is
   * needed to visually represent the collection of data set that have not been
   * annotated with any ontology term.
   *
   * @method  addPseudoSiblingToRoot
   * @author  Fritz Lekschas
   * @date    2016-05-05
   * @param   {Object}  graph     Annotation term graph.
   * @param   {String}  root      Root node URI.
   * @param   {Array}   allDsIds  Array of all data set IDs.
   */
  Graph.addPseudoSiblingToRoot = function (graph, root, allDsIds) {
    var annotatedDsIds = Object.keys(graph[root].dataSets);
    var notAnnotatedDsIds = {};
    var allDsIdsObj = {};

    for (var i = allDsIds.length; i--;) {
      allDsIdsObj[allDsIds[i]] = true;
      notAnnotatedDsIds[allDsIds[i]] = true;
    }

    for (var j = annotatedDsIds.length; j--;) {
      notAnnotatedDsIds[annotatedDsIds[j]] = undefined;
      delete notAnnotatedDsIds[annotatedDsIds[j]];
    }

    graph._no_annotations = {
      assertedDataSets: {},
      children: [],
      meta: {
        originalDepth: 1,
        leaf: true
      },
      parents: {},
      dataSets: notAnnotatedDsIds,
      name: 'No annotations',
      numDataSets: Object.keys(notAnnotatedDsIds).length,
      ontId: '_no_annotations',
      uri: '_no_annotations',
      value: Object.keys(notAnnotatedDsIds).length
    };

    graph._no_annotations.parents[root] = graph[root];
    graph[root].parents = {};
    graph[root].children.push('_no_annotations');
    graph[root].meta.originalDepth = -1;
  };

  return Graph;
}

angular
  .module('refineryApp')
  .service('graph', [
    '_',
    GraphFactory
  ]);
