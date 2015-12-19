function buildGraph (results) {
  var child,
      // Stores the children of each node..
      // The only difference to `nodes` is that the `children` is an object
      // holding the name of the child node.
      childIndex = {
        'http://www.w3.org/2002/07/owl#Thing': {}
      },
      currentChild,
      currentDataSet,
      currentParent,
      data = results.data,
      dataSet,
      i,
      lastNode,
      len,
      nodes = {
        // Fortunately `owl:Thing` is the mandatory root for any ontology.
        'http://www.w3.org/2002/07/owl#Thing': {
          children: [],
          dataSets: {},
          name: 'Root',
          numDataSets: 0,
          ontId: 'OWL:Thing',
          uri: 'http://www.w3.org/2002/07/owl#Thing',
        }
      },
      parent;

  // Determine which column corresponce to which node
  len = results.columns.length;
  for (i = 0; i < len; i++) {
    switch (results.columns[i]) {
      case 'sub':
        child = i;
        break;
      case 'ds':
        dataSet = i;
        break;
      case 'sup':
        parent = i;
        break;
    }
  }

  // Loop over all rows and build the tree
  len = data.length;
  for (i = 0; i < len; i++) {
    // Cache for speed:
    // Extensive object nesting is expensive;
    currentChild = data[i].row[child];
    currentDataSet = data[i].row[dataSet];
    currentParent = data[i].row[parent];

    // Add parent to nodes if not available
    if (!(currentParent.uri in nodes)) {
      nodes[currentParent.uri] = {
        children: [],
        dataSets: {},
        name: currentParent['rdfs:label'] || currentParent.name,
        numDataSets: 0,
        ontId: currentParent.name,
        uri: currentParent.uri
      };
      childIndex[currentParent.uri] = {};
    }

    // Add child to nodes if not available
    if (!(currentChild.uri in nodes)) {
      nodes[currentChild.uri] = {
        children: [],
        dataSets: {},
        name: currentChild['rdfs:label'] || currentChild.name,
        numDataSets: 0,
        ontId: currentChild.name,
        uri: currentChild.uri
      };
      childIndex[currentChild.uri] = {};
    }

    // Store parent-child relationship
    if (!childIndex[currentParent.uri][currentChild.uri]) {
      nodes[currentParent.uri].children.push(currentChild.uri);
      childIndex[currentParent.uri][currentChild.uri] = true;
    }

    // Store annotation if available
    if (currentDataSet !== null &&
        !nodes[currentChild.uri].dataSets[currentDataSet.id]) {
      nodes[currentChild.uri].numDataSets++;
      nodes[currentChild.uri].dataSets[currentDataSet.id] = true;
    }
  }

  return nodes;
}

function Neo4jToGraph ($q, neo4j, Webworker) {
  this.$q = $q;
  this.neo4j = neo4j;

  this.Webworker = Webworker;
}

Neo4jToGraph.prototype.get = function () {
  // Intermediate promise. We can't use the promise returned by ngResource
  // because Neo4J doesn't report errors via HTTP codes but as part of the
  // returned body.
  var neo4jData = this.$q.defer();

  this.neo4j.query({
      res: 'dataset-annotations'
    })
    .$promise
    .then(function (response) {
      if (response.errors.length === 0) {
        neo4jData.resolve(response.results[0]);
      } else {
        neo4jData.reject(response.errors);
      }
    }.bind(this))
    .catch(function (error) {
      neo4jData.reject(error);
      console.error(error);
    });

  return neo4jData.promise.then(function (data) {
    return this.Webworker.create(buildGraph).run(data);
  }.bind(this));
};

angular
  .module('refineryApp')
  .service('neo4jToGraph', [
    '$q',
    'neo4j',
    'Webworker',
    Neo4jToGraph
  ]);
