function DataSetFactory (_, dataSetDataApi, dataSetSearchApi, dataSetStore) {

  var _selection = [];
  var _selectionPath = [];
  var _source;

  function DataSet () {

  }

  DataSet.prototype.all = function () {
    _selectionPath = [];
    _source = dataSetDataApi;

    return DataSet;
  };

  DataSet.prototype.get = function (limit, offset, extra) {
    return _source(limit, offset, extra).then(function (data) {
      if (_selection.length > 0) {
        for (var i = data.objects.length; i--;) {
          if (!!!_selection[data.objects[i].id]) {
            data.objects.splice(i, 1);
          }
        }
      }
      return data;
    });
  };

  DataSet.prototype.search = function (query) {
    if (_selectionPath.length &&
        _selectionPath[_selectionPath.length - 1].type !== 'search') {
      _selectionPath[_selectionPath.length - 1].query = query;
    } else {
      _selectionPath.push({
        type: 'search',
        query: query
      });
    }

    _selectionPath = [];
    _source = dataSetSearchApi;

    return DataSet;
  };

  DataSet.prototype.select = function (set) {
    if (!_.isArray(set)) {
      return DataSet;
    }

    if (_selectionPath.length &&
        _selectionPath[_selectionPath.length - 1].type !== 'select') {
      _selectionPath[_selectionPath.length - 1].set = set;
    } else {
      _selectionPath.push({
        type: 'select',
        set: set
      });
    }

    _selection = set;
    _source = dataSetDataApi;

    return DataSet;
  };

  Object.defineProperty(
    DataSet.prototype,
    'selectionPath', {
      enumerable: true,
      configurable: false,
      get: function () {
        return _selectionPath;
      }
  });

  return DataSet;
}

angular
  .module('dataset')
  .factory('dataSet', [
    '_',
    'dataSetStore',
    DataSetFactory
  ]);
