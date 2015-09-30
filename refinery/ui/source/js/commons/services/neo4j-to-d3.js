function buildTree (results) {
  var child,
      // Stores the children of each node..
      // The only difference to `nodes` is that the `children` is an object
      // holding the name of the child node.
      childIndex = {
        'owl:Thing': {}
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
        'owl:Thing': {
          // Fortunately `owl:Thing` is the mandatory root for any ontology.
          name: 'owl:Thing',
          children: []
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

    if (!(currentParent.name in nodes)) {
      nodes[currentParent.name] = {
        children: [],
        dataSets: [],
        name: currentParent.name,
        numDataSets: 0,
        ontID: currentParent.name
      };
    }

    if (!(currentChild.name in nodes)) {
      nodes[currentChild.name] = {
        children: [],
        dataSets: [],
        name: currentChild.name,
        numDataSets: 0,
        ontID: currentChild.name
      };
    }

    if ('rdfs:label' in currentChild) {
      nodes[currentChild.name].name = currentChild['rdfs:label'];
    }

    if ('uri' in currentChild) {
      nodes[currentChild.name].uri = currentChild.uri;
    }

    if (currentDataSet !== null) {
      nodes[currentChild.name].numDataSets++;
      nodes[currentChild.name].dataSets.push(currentDataSet.uuid);
    }

    if (!(currentParent.name in childIndex)) {
      childIndex[currentParent.name] = {};
    }

    // According to https://jsperf.com/key-or-array-search/9
    // void 0 (which is _undefined_) scales best.
    if (childIndex[currentParent.name][currentChild.name] === void 0) {
      nodes[currentParent.name].children.push(nodes[currentChild.name]);
      childIndex[currentParent.name][currentChild.name] = true;
    }
  }

  // Deep clone object to be usable by D3
  return JSON.parse(JSON.stringify(nodes['owl:Thing']));
}

function Neo4jToD3 ($q, neo4j, Webworker) {
  this.$q = $q;
  this.neo4j = neo4j;

  this.treeWorker = Webworker.create(buildTree);
}

Neo4jToD3.prototype.get = function () {
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
    return this.treeWorker.run(data);
  }.bind(this));
};

angular
  .module('refineryApp')
  .service('neo4jToD3', [
    '$q',
    'neo4j',
    'Webworker',
    Neo4jToD3
  ]);
