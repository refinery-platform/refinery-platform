function buildGraph (nodes) {
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

function Neo4jToGraph ($q, neo4j) {
  this.$q = $q;
  this.neo4j = neo4j;
}

Neo4jToGraph.prototype.get = function () {
  // Intermediate promise. We can't use the promise returned by ngResource
  // because Neo4J doesn't report errors via HTTP codes but as part of the
  // returned body.
  var neo4jData = this.$q.defer();

  this.neo4j.query({
      res: 'annotations'
    })
    .$promise
    .then(function (response) {
      neo4jData.resolve(response.nodes);
    }.bind(this))
    .catch(function (error) {
      neo4jData.reject(error);
      console.error(error);
    });

  return neo4jData.promise.then(function (data) {
    return buildGraph(data);
  }.bind(this));
};

angular
  .module('refineryApp')
  .service('neo4jToGraph', [
    '$q',
    'neo4j',
    Neo4jToGraph
  ]);
