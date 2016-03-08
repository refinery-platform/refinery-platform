function dataCardFactory (_$q_, _$resource_, _settings_) {
  var Q = _$q_;
  var RESOURCE = _$resource_;
  var SETTINGS = _settings_;

  var card = {};
  var stack = [];

  function DataCard () {}

  Object.defineProperty(
    DataCard.prototype,
    'length',
    {
      enumerable: true,
      get: function () {
        return Object.keys(card).length;
      }
    }
  );

  DataCard.prototype.add = function (dataSet) {
    if (!card[dataSet.uuid]) {
      card[dataSet.uuid] = {
        index: undefined,
        reference: dataSet
      };
      card[dataSet.uuid].index = stack.push(card[dataSet.uuid]) - 1;
    }
    console.log('dataCard added: ', card);
    return this;
  };

  DataCard.prototype.added = function (dataSet) {
    return !!card[dataSet.uuid];
  };

  DataCard.prototype.get = function (offset, limit) {
    return stack.slice(Math.max(offset, 0), limit);
  };

  DataCard.prototype.remove = function (dataSet) {
    if (card[dataSet.uuid]) {
      // Update indices of downstream items
      for (var i = card[dataSet.uuid].index, len = stack.length; i < len; i++) {
        stack[i].index--;
      }

      // Remove item.
      stack.splice(card[dataSet.uuid].index, 1);
      card[dataSet.uuid] = undefined;
      delete card[dataSet.uuid];
    }
    console.log('dataCard added: ', card);
    return this;
  };

  DataCard.prototype.toDataCollection = function () {

  };

  return new DataCard();
}

angular
  .module('refineryApp')
  .factory('dataCard', ['$q', '$resource', 'settings', dataCardFactory]);
