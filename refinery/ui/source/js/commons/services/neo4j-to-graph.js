'use strict';

var Neo4jToGraphService = (function () {
  /* -------------------------------- Private ------------------------------- */

  /**
   * Prepared the node list returned by Neo4J to reflect a complete graph.
   *
   * @description
   * This methods enhance the nodes by given information. For example, `name` is
   * assigned depending on `label` and `ontId`. `children` are collected given
   * `parents`. Etc.
   *
   * @method  prepareGraph
   * @author  Fritz Lekschas
   * @date    2016-02-11
   * @private
   * @param   {Object}  nodes  Object list of all graph nodes.
   * @return  {Object}         Object list of fully prepared graph nodes.
   */
  function prepareGraph (nodes) {
    var j;
    var node;
    var parentsIds;
    var uris = Object.keys(nodes);

    for (var i = uris.length; i--;) {
      node = nodes[uris[i]];

      node.name = node.label || node.ontId;
      node.numDataSets = 0;

      if (!node.children) {
        node.children = [];
      }

      parentsIds = Object.keys(node.parents);
      for (j = parentsIds.length; j--;) {
        // Push children
        if (!nodes[parentsIds[j]].children) {
          nodes[parentsIds[j]].children = [node.uri];
        } else {
          nodes[parentsIds[j]].children.push(node.uri);
        }
        // Set parent reference
        node.parents[parentsIds[j]] = nodes[parentsIds[j]];
      }

      // Store assorted data sets seperately to be able to distinguish them from
      // infered data sets.
      node.assertedDataSets = {};
      var dsIds = Object.keys(node.dataSets);
      for (j = dsIds.length; j--;) {
        node.assertedDataSets[dsIds[j]] = true;
      }
    }

    return nodes;
  }

  /* -------------------------------- Public -------------------------------- */

  /**
   * Service class.
   *
   * @method  Neo4jToGraph
   * @author  Fritz Lekschas
   * @date    2016-02-11
   * @param   {Object}  $q     Angular's promise.
   * @param   {Object}  neo4j  Neo4J HTTP service.
   */
  function Neo4jToGraph ($q, neo4j) {
    this.$q = $q;
    this.neo4j = neo4j;
  }

  /**
   * Get annotation graph.
   *
   * @method  get
   * @author  Fritz Lekschas
   * @date    2016-02-11
   * @return  {Object}  Promise resolving to the prepared annotation graph.
   */
  Neo4jToGraph.prototype.get = function () {
    // Intermediate promise. We can't use the promise returned by ngResource
    // because Neo4J doesn't report errors via HTTP codes but as part of the
    // returned body.
    var neo4jData = this.$q.defer();

    function rejectNoData () {
      neo4jData.reject({
        number: 1,
        message: 'No data'
      });
    }

    this.neo4j.query({
      res: 'annotations'
    })
      .$promise
      .then(function (response) {
        var numNodes = 0;
        try {
          numNodes = Object.keys(response.nodes);
        } catch (e) {
          rejectNoData();
        }
        if (numNodes) {
          neo4jData.resolve(response.nodes);
        } else {
          rejectNoData();
        }
      })
      .catch(function (error) {
        neo4jData.reject({
          number: 1,
          originalError: error
        });
      });

    return neo4jData.promise.then(function (data) {
      return prepareGraph(data);
    });
  };

  return Neo4jToGraph;
}());

angular
  .module('refineryApp')
  .service('neo4jToGraph', [
    '$q',
    'neo4j',
    Neo4jToGraphService
  ]);
