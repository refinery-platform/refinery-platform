'use strict';

function DashboardVisData ($q, neo4jToGraph, dataSet, graph, settings) {
  var graphData = $q.defer();
  var treemapData = $q.defer();
  var annotations = $q.defer();
  var finalRootNode = $q.defer();

  function Data () {
  }

  /**
   * Load data required by the visualization tools.
   *
   * @description
   * The method loads the complete user-accessible annotation set and triggers
   * the data preparation for the tree map and list graph.
   *
   * @method  load
   * @author  Fritz Lekschas
   * @date    2016-02-11
   * @param   {String}  root           Absolute root term used for pruning the
   *   graph.
   * @param   {String}  valueProperty  Node property that holds an object with
   *   items that account for the nodes size; e.g. `dataSets`.
   */
  Data.prototype.load = function (root, valueProperty, remixRoots, rename) {
    // Make sure that all globally user-accessible data set IDs are loaded.
    dataSet.loadAllIds();

    var _root = root || settings.ontRoot;

    var allDsIdsPromise = dataSet.allIds;
    var neo4jToGraphDataPromise = neo4jToGraph.get();

    $q.all([allDsIdsPromise, neo4jToGraphDataPromise])
      .then(function (results) {
        var allDsIds = results[0];
        var data = results[1];

        if (!Object.keys(data).length) {
          // User doesn't have access to data sets with annotations or the
          // backend is broken and returns an empty object.
          treemapData.reject({ number: 1 });
          graphData.reject({ number: 1 });
          return;
        }

        if (remixRoots) {
          // Check existance of remix roots
          var checkedRemixRoots = [];

          for (var i = remixRoots.length; i--;) {
            if (data[remixRoots[i]]) {
              checkedRemixRoots.push(remixRoots[i]);
            }
          }

          // Replace original root nodes with the existing remix roots
          data[_root].children = checkedRemixRoots;
        }

        // Prune graph and accumulate the dataset annotations
        var prunedData = graph.accumulateAndPrune(data, _root, valueProperty);

        // Add pseudo-parent and pseudo-sibling for data sets without any
        // annotation.
        graph.addPseudoSiblingToRoot(
          data, prunedData.root, allDsIds
        );

        // Rename weird labels
        for (var ii = rename.length; ii--;) {
          if (data[rename[ii].uri]) {
            data[rename[ii].uri].name = (
              data[rename[ii].uri].label = rename[ii].label
            );
          }
        }

        // Init precision and recall
        dataSet.ids.then(function (currentAllDsIds) {
          graph.calcPrecisionRecall(
            data,
            valueProperty,
            currentAllDsIds
          );

          // Make precision and recall available as bars
          graph.propertyToBar(data, ['precision', 'recall']);

          // Make precision and recall available as bars
          graph.propertyToData(data, ['name']);

          // Convert graph into hierarchy for D3
          treemapData.resolve(graph.toTree(data, _root));

          graphData.resolve(data);

          finalRootNode.resolve(_root);
        });
      })
      .catch(function (e) {
        graphData.reject(e);
      });

    dataSet.loadAnnotations()
      .then(function (data) {
        annotations.resolve(data);
      })
      .catch(function (e) {
        annotations.reject(e);
      });
  };

  /**
   * Update annotation graph.
   *
   * @method  updateGraph
   * @author  Fritz Lekschas
   * @date    2016-05-09
   * @param   {Object}  newAnnotations  Promise resolving to array of new
   *   annotations.
   */
  Data.prototype.updateGraph = function (newAnnotations) {
    $q.all([graphData.promise, newAnnotations]).then(function (results) {
      graph.updateAnnotations(results[0], results[1]);
    });
  };

  /**
   * Promise that resolved to all required data.
   *
   * @method  get
   * @author  Fritz Lekschas
   * @date    2016-02-11
   *
   * @type    {Object}
   */
  Object.defineProperty(
    Data.prototype,
    'data',
    {
      get: function () {
        return $q.all([
          graphData.promise, treemapData.promise, finalRootNode.promise
        ]).then(function (results) {
          return {
            graph: results[0],
            treemap: results[1],
            root: results[2]
          };
        });
      }
    }
  );

  return new Data();
}

angular
  .module('refineryDashboard')
  .factory('dashboardVisData', [
    '$q',
    'neo4jToGraph',
    'dataSet',
    'graph',
    'settings',
    DashboardVisData
  ]);
