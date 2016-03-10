function dataCartFactory (_$q_, _$resource_, _settings_) {
  var Q = _$q_;
  var RESOURCE = _$resource_;
  var SETTINGS = _settings_;

  var card = {};
  var stack = [];

  function DataCart () {}

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
    if (!card[dataSet.uuid]) {
      card[dataSet.uuid] = {
        index: undefined,
        reference: dataSet
      };
      card[dataSet.uuid].index = stack.push(card[dataSet.uuid].reference) - 1;
    }
    return this;
  };

  DataCart.prototype.added = function (dataSet) {
    return !!card[dataSet.uuid];
  };

  DataCart.prototype.get = function (offset, limit, success) {
    success(stack.slice(Math.max(offset--, 0), limit));
  };

  DataCart.prototype.remove = function (dataSet) {
    if (card[dataSet.uuid]) {
      // Update indices of downstream items
      for (
        var i = card[dataSet.uuid].index + 1,
            len = stack.length;
        i < len;
        i++
      ) {
        card[stack[i].uuid].index--;
      }

      // Remove item.
      stack.splice(card[dataSet.uuid].index, 1);
      card[dataSet.uuid] = undefined;
      delete card[dataSet.uuid];
    }
    return this;
  };

  DataCart.prototype.toDataCollection = function () {

  };

  return new DataCart();
}

angular
  .module('refineryApp')
  .factory('dataCart', ['$q', '$resource', 'settings', dataCartFactory]);
