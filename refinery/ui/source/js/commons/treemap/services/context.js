function TreemapContext ($timeout) {
  var dataStore = {},
      stack = {};

  function setDataStore () {

  }

  function Context () {}

  Context.prototype.constructor = Context;

  Context.prototype.get = function (key) {
    return dataStore[key];
  };

  Context.prototype.set = function (key, value) {
    var old = dataStore[key];
    if (old !== value) {
      if (!!stack[key]) {
        for (var i = stack[key].length; i--;) {
          if (typeof stack[key][i] === "function") {
            stack[key][i](value);
          }
        }
      }
      dataStore[key] = value;
    }
  };

  Context.prototype.on = function (key, callback) {
    if (key in stack) {
      return stack[key].push(callback);
    } else {
      stack[key] = [callback];
      return 0;
    }
  };

  return new Context();
}

angular
  .module('treemap')
  .factory('treemapContext', ['$timeout', TreemapContext]);
