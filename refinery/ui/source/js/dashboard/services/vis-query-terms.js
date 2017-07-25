'use strict';

function DashboardVisQueryTerms ($rootScope) {
  var queryTerms = {};
  var numQueryTerms = 0;
  var uris = [];
  var list = [];

  function addToList (uri) {
    list.push(queryTerms[uri]);
  }

  function removeFromList (uri) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] === queryTerms[uri]) {
        list.splice(i, 1);
      }
    }
  }

  var queryModes = ['or', 'and', 'not'];

  function VisQueryTerms () {}

  VisQueryTerms.prototype.get = function (uri) {
    return queryTerms[uri];
  };

  VisQueryTerms.prototype.set = function (uri, term) {
    if (uri === 'http://www.w3.org/2002/07/owl#Thing') {
      // Ignore the absolute root node
      return;
    }

    var node = this.get(uri);

    queryTerms[uri] = term;

    if (!node) {
      addToList(uri);
    }

    uris = Object.keys(queryTerms);
    numQueryTerms = uris.length;
  };

  VisQueryTerms.prototype.remove = function (uri, notify) {
    var node = this.get(uri);

    if (!node) {
      return;
    }

    if (notify) {
      if (node.root) {
        $rootScope.$emit(
          'dashboardVisNodeUnroot', {
            nodeUri: uri,
            source: 'queryTerms'
          }
        );

        $rootScope.$emit('dashboardVisNodeToggleQuery', {
          terms: [
            {
              nodeUri: 'http://www.w3.org/2002/07/owl#Thing',
              nodeLabel: 'Root',
              mode: 'or',
              query: true,
              root: true
            },
            {
              nodeUri: uri
            }
          ],
          source: 'queryTerms'
        });
      } else {
        $rootScope.$emit(
          'dashboardVisNodeUnquery', {
            nodeUri: uri,
            source: 'queryTerms'
          }
        );
      }
    }

    removeFromList(uri);
    queryTerms[uri] = undefined;
    delete queryTerms[uri];
    uris = Object.keys(queryTerms);
    numQueryTerms = uris.length;
  };

  VisQueryTerms.prototype.setProp = function (uri, key, value) {
    if (this.get(uri)) {
      this.get(uri)[key] = value;
    }
  };

  VisQueryTerms.prototype.toggleMode = function (uri, notify) {
    var node = this.get(uri);

    if (!node) {
      return;
    }

    node.mode = queryModes[
      (queryModes.indexOf(node.mode) + 1) % queryModes.length
    ];

    if (notify) {
      $rootScope.$emit(
        'dashboardVisNodeQuery', {
          nodeUri: node.uri,
          mode: node.mode,
          source: 'queryTerms'
        }
      );
    }
  };

  Object.defineProperty(
    VisQueryTerms.prototype,
    'keys', {
      enumerable: true,
      get: function () {
        return uris;
      }
    }
  );

  Object.defineProperty(
    VisQueryTerms.prototype,
    'length', {
      enumerable: true,
      get: function () {
        return numQueryTerms;
      }
    }
  );

  Object.defineProperty(
    VisQueryTerms.prototype,
    'list', {
      enumerable: true,
      get: function () {
        return list;
      }
    }
  );

  return new VisQueryTerms();
}

angular
  .module('refineryDashboard')
  .factory('dashboardVisQueryTerms', [
    '$rootScope',
    DashboardVisQueryTerms
  ]);
