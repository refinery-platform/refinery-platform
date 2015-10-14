function DataSetFactory ($q, _, DataSetDataApi, DataSetSearchApi, DataSetStore) {

  /*
   * --------------------------------- Private ---------------------------------
   */

  /**
   * Stores the individual browse steps to be able to reconstruct previous
   * selections.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Array}
   */
  var _browsePath = [];

  /**
   * Caches the data objects in a central place.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Object}
   */
  var _dataStore = new DataSetStore();

  /**
   * Caches the current order of returned data objects.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Array}
   */
  var _orderCache = [];

  /**
   * Stores IDs of the selected data objects.
   *
   * @description
   * This
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Object}
   */
  var _selection = {};

  /**
   * Caches the currently selected data objects, based on the current order.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Array}
   */
  var _selectionCache = [];

  /**
   * Stores the index of the first data objects that has **not been** cached.
   *
   * @description
   * This index is needed to resume loading selection data because the length of
   * `selectionCache` doesn't reflect the number of data objects loaded. Imagine
   * we want to lead the first 3 items of a selection [d,e,f,g,h,i]. When the
   * original source contains the objects [a,b,c,d,e,f,g,h,i] then we need to
   * load at least 6 objects in order to find the first 3. If we now want to
   * load the other missing objects of the selection we need to know where to
   * start loading, which would be 6 as 6 is the first object we haven't cached.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Number}
   */
  var _selectionCacheLastIndex = 0;

  /**
   * Reference to the actual source function, e.g. `DataSetDataApi`,
   * `DataSetSearchApi`
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Function}
   */
  var _source;

  /**
   * Total number of currently available data objects.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Number}
   */
  var _total = Infinity;

  /**
   * Clear the cache of ordered data objects.
   *
   * @method  _clearOrderCache
   * @author  Fritz Lekschas
   * @date    2015-10-08
   */
  function _clearOrderCache () {
    _total = Infinity;
    _orderCache = [];
    _clearSelectionCache();
  }

  /**
   * Clear the cache of selected data objects.
   *
   * @method  _clearSelectionCache
   * @author  Fritz Lekschas
   * @date    2015-10-08
   */
  function _clearSelectionCache () {
    _selectionCache = [];
    _selectionCacheLastIndex = 0;
  }

  /**
   * [_select description]
   *
   * @method  _setSelection
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Object|Array}  set  Set of data objects to be selected.
   */
  function _setSelection (set) {
    var selection = {};

    if (_.isObject(set)) {
      selection = set;
    }

    if (_.isArray(set)) {
      for (var i = set.length; i--;) {
        selection[i] = true;
      }
    }

    _selection = selection;
    _clearSelectionCache();
  }

  /**
   * Caches the position of a data object.
   *
   * @method  _cacheOrder
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  index  Position of the data object.
   * @param   {Object}  data   Reference to the data object.
   */
  function _cacheOrder (index, data) {
    _orderCache[index] = data;
  }

  /**
   * Get data from the source and trigger caching.
   *
   * @description
   * It is required that the source method returns an object of the following
   * structure.
   * ```
   * {
   *   "meta": {
   *     limit: 10,
   *     offset: 0,
   *     total: 100
   *   },
   *   "data": []
   * }
   * ```
   * It's okay if the object has further properties.
   *
   * @method  _getDataFromSource
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise of list of references to the data.
   *   objects.
   */
  function _getDataFromSource (limit, offset) {
    return _source(limit, offset).then(function (response) {
      for (var i = 0, len = response.data.length; i < len; i++) {
        _dataStore.add(response.data[i].id, response.data[i]);
        _cacheOrder(offset + i, _dataStore.get(response.data[i].id));
      }
      if (_total === Infinity) {
        _total = response.meta.total;
      }

      return _orderCache.slice(offset, limit + offset);
    });
  }

  /**
   * Get cached data from `_orderCache`.
   *
   * @method  _getDataFromOrderCache
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise of list of references to the data.
   */
  function _getDataFromOrderCache (limit, offset) {
    var data = _orderCache.slice(offset, limit + offset);
    if (data.length < _total - offset) {
      data = _getDataFromSource(limit, offset);
    }

    return $q.when(data);
  }

  /**
   * Recursively builds up the selection based on promises.
   *
   * @method  _buildSelection
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Array}   selection  Array of references of selected data objects.
   * @param   {Number}  limit      Total number of requested objects.
   * @return  {Object}             Promise of `selection`.
   */
  function _buildSelection (selection, limit) {
    return _getDataFromOrderCache(limit, selectionCacheLastIndex)
      .then(function (data) {
        var dataLen = data.length,
            selectionCacheLen;
        for (var i = 0; i < dataLen; i++) {
          if (!!_selection[data[i].id]) {
            selectionCacheLen = _selectionCache.push(data[i]);
            if (selectionCacheLen > offset) {
              selection.push(data[i]);
            }
          }
          selectionCacheLastIndex++;
        }
        // Stop looping when no more data is available.
        if (dataLen === 0) {
          return selection;
        }
        if (selection.length < limit) {
          return _buildSelection(selection, limit);
        }
        return selection;
      })
      .catch(function (e) {
        deferred.reject(e);
      });
  }

  /**
   * Get the data objects related to a selection.
   *
   * @method  _getSelection
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise of list of references to the data.
   */
  function _getSelection (limit, offset) {
    var deferred = $q.defer();

    return _buildSelection(selection, limit).then(function (selection) {
      // Need to slice off items that are out of the range due to looping
      return selection.slice(0, limit);
    }).catch(function (e) {
      deferred.reject(e);
    });
  }

  /**
   * Add a new step to the browsing path or modify the existing one if its the
   * same type.
   *
   * @method  _addBrowsePath
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Object}  step  Object with a type and query description.
   */
  function _addBrowsePath (step) {
    if (_browsePath.length &&
        _browsePath[_browsePath.length - 1].type !== step.type) {
      _browsePath[_browsePath.length - 1].query = step.query;
    } else {
      _browsePath.push(step);
    }
  }

  /**
   * Request a set of data objects.
   *
   * @method  _get
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise with data objects.
   */
  function _get (limit, offset) {
    var data;

    if (this.selectionActive) {
      data = _selectionCache.slice(offset, limit + offset);
      if (
        data.length !== Math.min(limit, _total) &&
        _selectionCacheLastIndex !== _total
      ) {
        data = _getSelection(limit, offset);
      }
    } else {
      data = _getDataFromOrderCache(limit, offset);
    }

    return $q.when(data);
  }

  /*
   * --------------------------------- Public ----------------------------------
   */

  /**
   * DataSet class constructor.
   *
   * @method  DataSet
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @class
   */
  function DataSet () {
    this.all();
  }

  /**
   * Set the data source to the general unrestricted data API.
   *
   * @method  all
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @return  {Object}  Return the class itself for chaining.
   */
  DataSet.prototype.all = function () {
    _browsePath = [];
    _source = new DataSetDataApi();

    return DataSet;
  };

  /**
   * Set the data source to the general data API and add a filter option.
   *
   * @method  filter
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {String}  filter  String that determines the filter.
   * @return  {Object}          Return the class itself for chaining.
   */
  DataSet.prototype.filter = function (filter) {
    _browsePath = [];
    _clearOrderCache();
    _source = new DataSetDataApi({
      'filter_by': filter
    });

    return DataSet;
  };

  /**
   * Set the data source to the general data API and add a order option.
   *
   * @method  order
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {String}  order  String that determines the order.
   * @return  {Object}         Return the class itself for chaining.
   */
  DataSet.prototype.order = function (order) {
    _browsePath = [];
    _clearOrderCache();
    _source = new DataSetDataApi({
      'order_by': order
    });

    return DataSet;
  };

  /**
   * Set the data source to the search endpoint.
   *
   * @method  search
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {String}  query  Keywords for searching.
   * @return  {Object}         Return the class itself for chaining.
   */
  DataSet.prototype.search = function (query) {
    _source = new DataSetSearchApi(query);
    _addBrowsePath({
      type: 'search',
      query: query
    });

    _clearOrderCache();

    return DataSet;
  };

  /**
   * Request a set of data objects.
   *
   * @method  get
   * @author  Fritz Lekschas
   * @date    2015-10-08
   */
  DataSet.prototype.get = _get;

  /**
   * Get data objects including meta data.
   *
   * @description
   * This is needed for some services like `UiScollSource`.
   *
   * @method  getInclMeta
   * @author  Fritz Lekschas
   * @date    2015-10-09
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise with data objects.
   */
  DataSet.prototype.getInclMeta = function (limit, offset) {
    return _get(limit, offset).then(function (data) {
      return {
        meta: {
          total: _total
        },
        data: data
      };
    });
  };

  /**
   * [select description]
   *
   * @method  select
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Object|Array}   set  Selected data objects.
   * @return  {Object}              Return the class itself for chaining.
   */
  DataSet.prototype.select = function (set) {
    _setSelection(set);
    _addBrowsePath({
      type: 'select',
      query: set
    });

    return DataSet;
  };

  /**
   * Deselect currently selected data objects.
   *
   * @method  deselect
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @return  {Object}  Return the class itself for chaining.
   */
  DataSet.prototype.deselect = function () {
    if (_browsePath.length &&
        _browsePath[_browsePath.length - 1].type === 'select') {
      _browsePath.pop();
    }

    _selection = [];

    return DataSet;
  };

  /**
   * Current selection.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type    {Object}
   */
  Object.defineProperty(
    DataSet.prototype,
    'selection',
    {
      enumerable: true,
      configurable: false,
      get: function () {
        return _selection;
      }
    }
  );

  /**
   * Boolean whether some data objects are currently selected.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type    {Boolean}
   */
  Object.defineProperty(
    DataSet.prototype,
    'selectionActive',
    {
      enumerable: true,
      configurable: false,
      get: function () {
        return !!Object.keys(_selection).length;
      }
    }
  );

  /**
   * Current path of selections.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type    {Array}
   */
  Object.defineProperty(
    DataSet.prototype,
    'selectionPath',
    {
      enumerable: true,
      configurable: false,
      get: function () {
        return _browsePath;
      }
    }
  );

  /**
   * Current total number of data objects.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type    {Number}
   */
  Object.defineProperty(
    DataSet.prototype,
    'total',
    {
      enumerable: true,
      configurable: false,
      get: function () {
        return _total;
      }
    }
  );

  return new DataSet();
}

angular
  .module('dataSet')
  .factory('dataSet', [
    '$q',
    '_',
    'DataSetDataApi',
    'DataSetSearchApi',
    'DataSetStore',
    DataSetFactory
  ]);
