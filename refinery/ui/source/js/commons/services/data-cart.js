'use strict';

function dataCartFactory () {
  var card = {};
  var stack = [];

  function add (dataSet) {
    if (!card[dataSet.id]) {
      card[dataSet.id] = {
        index: undefined,
        reference: dataSet
      };
      card[dataSet.id].index = stack.push(card[dataSet.id].reference) - 1;
    }
  }

  function remove (dataSetId) {
    if (card[dataSetId]) {
      // Update indices of downstream items
      for (
        var i = card[dataSetId].index + 1,
            len = stack.length;
        i < len;
        i++
      ) {
        card[stack[i].id].index--;
      }

      // Remove item.
      stack.splice(card[dataSetId].index, 1);
      card[dataSetId] = undefined;
      delete card[dataSetId];
    }
  }

  function DataCart () {
  }

  Object.defineProperty(
    DataCart.prototype,
    'length',
    {
      enumerable: true,
      get: function () {
        return Object.keys(card).length;
      }
    }
  );

  Object.defineProperty(
    DataCart.prototype,
    'dataSets',
    {
      enumerable: true,
      get: function () {
        return stack;
      }
    }
  );

  DataCart.prototype.add = function (dataSet) {
    if (dataSet.constructor === Array) {
      for (var i = dataSet.length; i--;) {
        add(dataSet[i]);
      }
    } else {
      add(dataSet);
    }
    return this;
  };

  DataCart.prototype.added = function (dataSet) {
    if (dataSet.constructor === Array) {
      var numDataSets = dataSet.length;
      var found = 0;

      // Go over all data sets to be able to detect whether:
      // 1. none (output: 0 or falsy)
      // 2. some (output: 1)
      // 3. all (output: 2)
      // data sets have been added.
      for (var i = numDataSets; i--;) {
        if (card[dataSet[i]]) {
          found++;
        }
      }

      if (found === 0) {
        return 0;
      }
      return numDataSets === found ? 2 : 1;
    }
    return !!card[dataSet.id];
  };

  DataCart.prototype.clear = function () {
    var ids = Object.keys(card);
    for (var i = ids.length; i--;) {
      remove(ids[i], true);
    }
  };

  DataCart.prototype.get = function (offset, limit, success) {
    success(stack.slice(Math.max(offset - 1, 0), limit));
  };

  DataCart.prototype.remove = function (dataSets, idOnly) {
    function getId (dataSet) {
      if (idOnly) {
        return dataSet;
      }
      return dataSet.id;
    }

    if (dataSets.constructor === Array) {
      for (var i = dataSets.length; i--;) {
        remove(getId(dataSets[i]));
      }
    } else {
      remove(getId(dataSets));
    }
    return this;
  };

  DataCart.prototype.toDataCollection = function () {};

  return new DataCart();
}

angular
  .module('refineryApp')
  .factory('dataCart', [dataCartFactory]);
