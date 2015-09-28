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
          // Fortunately `owl:Thing` the mandatory root for any ontology.
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

    if (!(currentChild.name in childIndex[currentParent.name])) {
      nodes[currentParent.name].children.push(nodes[currentChild.name]);
      childIndex[currentParent.name][currentChild.name] = true;
    }
  }

  // Deep clone object to be usable by D3
  return JSON.parse(JSON.stringify(nodes['owl:Thing']));
}

function Neo4jToD3 ($q, neo4j, settings) {
  this.$q = $q;
  this.neo4j = neo4j;
}

Neo4jToD3.prototype.get = function () {
  // Private
  var d3Deferred = this.$q.defer();

  this.neo4j.query({
      res: 'dataset-annotations'
    })
    .$promise
    .then(function (response) {
      if (response.errors.length === 0) {
        try {
          var start = performance.now();
          var d3Data = buildTree(response.results[0]);
          var end = performance.now();
          d3Deferred.resolve(d3Data);
          var time = (end - start).toFixed(3);
          console.log('Neo4J to D3 conversion took ' + time + ' ms.');
        } catch (error) {
          d3Deferred.reject(error);
          console.error(error);
        }
      }
      this.neo4jResponse = response;
    }.bind(this))
    .catch(function (error) {
      d3Deferred.reject(error);
      console.error(error);
    });

  return d3Deferred.promise;
};

Object.defineProperty(
  Neo4jToD3.prototype,
  'neo4jResponse', {
    configurable: false,
    enumerable: true,
    writable: true
});

angular
  .module('refineryApp')
  .service('neo4jToD3', [
    '$q',
    'neo4j',
    'settings',
    Neo4jToD3
  ]);
