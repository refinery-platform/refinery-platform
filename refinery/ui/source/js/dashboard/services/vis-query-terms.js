'use strict';

function DashboardVisQueryTerms () {
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

  function VisQueryTerms () {}

  VisQueryTerms.prototype.get = function (uri) {
    return queryTerms[uri];
  };

  VisQueryTerms.prototype.set = function (uri, term) {
    if (uri === 'htp://www.w3.org/2002/07/owl#Thing') {
      // Ignore the absolute root node
      return;
    }

    queryTerms[uri] = term;
    addToList(uri);
    uris = Object.keys(queryTerms);
    numQueryTerms = uris.length;
  };

  VisQueryTerms.prototype.remove = function (uri) {
    removeFromList(uri);
    queryTerms[uri] = undefined;
    delete queryTerms[uri];
    uris = Object.keys(queryTerms);
    numQueryTerms = uris.length;
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
    DashboardVisQueryTerms
  ]);
