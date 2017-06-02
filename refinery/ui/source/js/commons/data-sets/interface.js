'use strict';

/* eslint no-use-before-define:0 */

function DataSetFactory (
  $q, $sce, _, settings, DataSetDataApi, DataSetDataDetailsApi, DataSetSearchApi,
  DataSetStore, DataSetAnnotations) {
  /*
   * ------------------------------- Private -----------------------------------
   */

  /* ------------------------------ Variables ------------------------------- */

  var _allDsIds = $q.defer();

  /**
   * Indicates whether the total number of data objects is just an
   * approximation.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-29
   *
   * @type  {Boolean}
   */
  var _approximateTotal = false;

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
   * Stores all dataset IDs corresponding to the current base selection.
   *
   * @author  Fritz Lekschas
   * @date    2015-12-10
   *
   * @type  {Array}
   */
  var _currentDsIds = $q.defer();

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
   * Store data set annotations.
   *
   * @type  {Object}
   */
  var _annotations = new DataSetAnnotations(_dataStore);

  /**
   * Caches the current order of returned data objects.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Array}
   */
  var _orderCache = [];

  var _search;

  /**
   * Promise that resolves to the distinct search result annotations and their
   * abundance.
   *
   * @description
   * The object will look like so:
   * ```
   * {
   *   'http://www.w3.org/2002/07/owl#Thing': 10
   * }
   * ```
   *
   * @type  {Object}
   */
  var _searchResultAnnotations;

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

  var _sourceDetails = new DataSetDataDetailsApi();

  /**
   * Total number of currently returned data objects.
   *
   * @description
   * The total number of returned data objects depends on the intersection of
   * source items and selected items. These can be different and one can be
   * bigger than the other, plus the intersection size is NOT the same as the
   * minimum of both. Imaging the user selects a certain ontology term, e.g.
   * liver, and afterwards performs a search, e.g. `Chip-Seq`. There are most
   * likely some datasets related to Chip-Seq, which have nothing to do with
   * liver. In this case we actually don't know the total number of returned
   * objects until we processed them all.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Number}
   */
  var _total = Infinity;

  /**
   * Total number of currently selected data objects.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-14
   *
   * @type  {Number}
   */
  var _totalSelection = Infinity;

  /**
   * Total number of currently available data objects.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Number}
   */
  var _totalSource = Infinity;

  /**
   * Upper bound of total number of available data objects.
   *
   * @description
   * The upper bound is used to give the user a idea of how many data objects
   * might be available. Right now Solr doesn't know of any selection which is
   * why the total number of found docs does not necessarily reflect the actual
   * number of available docs.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-29
   *
   * @type  {Number}
   */
  var _totalUpperBound = Infinity;

  /* ------------------------------- Methods -------------------------------- */

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
    if (!!_getLastBrowseStep(step.type)) {
      _browsePath[_browsePath.length - 1].query = step.query;
    } else {
      _browsePath.push(step);
    }
  }

  /**
   * Recursively builds up the selection based on promises.
   *
   * @method  _buildSelection
   * @author  Fritz Lekschas
   * @date    2015-10-14
   *
   * @param   {Number}  limit      Total number of requested objects.
   * @param   {Number}  offset     Starting point for retrieving data objects.
   * @param   {Array}   selection  Array of references of selected data objects.
   * @return  {Object}             Promise of `selection`.
   */
  function _buildSelection (limit, offset, selection) {
    // Initially building the selection can be extremely tedious. Building the
    // selection for CL:0008001 requires to load almost 300 datasets before all
    // enough datasets that fall within the selection. For that reason it makes
    // sense to increase the limit.
    var realLimit = Math.max(limit, settings.treemap.singleRequestLimit);
    return _fetchDataFromOrderCache(realLimit, _selectionCacheLastIndex)
      .then(function (data) {
        var dataLen = data.length;
        var selectionCacheLen;
        for (var i = 0; i < dataLen; i++) {
          if (!!_selection[data[i].id]) {
            selectionCacheLen = _selectionCache.push(data[i]);
            if (selectionCacheLen > offset) {
              selection.push(data[i]);
            }
          }
          _selectionCacheLastIndex++;
        }
        if (_approximateTotal) {
          _total = selection.length;
          _totalUpperBound = _total + Math.max(0, Math.min(
            _totalSource - (_selectionCacheLastIndex + realLimit),
            _totalSelection - _total
          ));
        }
        // Stop looping when no more data is available.
        if (dataLen === 0) {
          return selection;
        }
        // Recursively call itself when not enough data has been found.
        if (selection.length < limit) {
          return _buildSelection(limit, offset, selection);
        }
        return selection;
      });
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
   * Clear the cache of ordered data objects.
   *
   * @method  _clearOrderCache
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Boolean}  search  Indicates that this function was triggered by
   *   `search()`.
   */
  function _clearOrderCache (search) {
    if (_totalSelection < Infinity && search) {
      _approximateTotal = true;
    } else {
      _approximateTotal = false;
    }
    _totalSource = Infinity;
    _orderCache = [];
    _clearSelectionCache();
  }

  /**
   * Clear the cache of selected data objects.
   *
   * @method  _clearSelectionCache
   * @author  Fritz Lekschas
   * @date    2015-10-15
   *
   * @param   {Boolean}  deselection  `true` if triggered by deselection event.
   */
  function _clearSelectionCache (deselection) {
    if (deselection) {
      _approximateTotal = false;
      _total = _totalSource;
      _totalSelection = Infinity;
    }
    if (!_selectionLen()) {
      _total = _totalSource;
    }
    _selectionCache = [];
    _selectionCacheLastIndex = 0;
  }

  /**
   * Request a set of data objects.
   *
   * @method  _fetch
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise with data objects.
   */
  function _fetch (limit, offset) {
    var data;

    if (_selectionLen()) {
      data = _selectionCache.slice(offset, limit + offset);
      if (
        data.length !== Math.min(limit, Math.min(_totalSelection, _totalSource)) &&
        _selectionCacheLastIndex !== _totalSource
      ) {
        data = _getSelection(limit, offset);
      }
    } else {
      data = _fetchDataFromOrderCache(limit, offset);
    }

    return $q.when(data);
  }

  /**
   * Get cached data from `_orderCache`.
   *
   * @method  _fetchDataFromOrderCache
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise of list of references to the data.
   */
  function _fetchDataFromOrderCache (limit, offset) {
    var data = _orderCache.slice(offset, limit + offset);
    if (data.length < limit && data.length < (_totalSelection || _totalSource)) {
      data = _fetchDataFromSource(limit, offset);
    }

    return $q.when(data);
  }

  /*
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
   * @method  _fetchDataFromSource
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise of list of references to the data.
   *   objects.
   */
  function _fetchDataFromSource (limit, offset) {
    return _source(limit, offset).then(function (response) {
      for (var i = response.data.length; i--;) {
        _initHtmlTitleDesc(response.data[i]);
        _dataStore.add(response.data[i].id, response.data[i], true);
        _cacheOrder(offset + i, _dataStore.get(response.data[i].id));
      }

      // The first time a search is issued all dataset IDs will be returned
      if (response.allIds && response.allIds.length) {
        if (_search) {
          _currentDsIds.resolve(response.allIds);
          _calculatePrecisionRecall();
        } else {
          _allDsIds.resolve(response.allIds);
        }
      }

      if (_totalSource === Infinity) {
        _totalSource = response.meta.total;
      }

      if (_total === Infinity) {
        _total = _totalSource;
      }

      return _orderCache.slice(offset, limit + offset);
    });
  }

  /**
   * Return the last step of browsing depending on the type if specified.
   *
   * @method  _getLastBrowseStep
   * @author  Fritz Lekschas
   * @date    2015-10-22
   *
   * @param   {String|Undefined}  type  Name of the type to filter for.
   * @return  {Object}                  Returns the last browse step.
   */
  function _getLastBrowseStep (type) {
    var last = _browsePath.length - 1;

    if (type) {
      return (last >= 0 && _browsePath[last].type === type) ?
        _browsePath[last] : undefined;
    }
    return _browsePath[last];
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

    if (_approximateTotal) {
      _total = 0;
      _totalUpperBound = Math.min(_totalSource, _totalSelection);
    }

    return _buildSelection(limit, offset, []).then(function (selection) {
      // Need to slice off items that are out of the range due to looping
      return selection.slice(0, limit);
    }).catch(function (e) {
      deferred.reject(e);
    });
  }

  /**
   * Get or load a single data set
   *
   * @method  _get
   * @author  Fritz Lekschas
   * @date    2016-03-10
   * @param   {String}   id     Data set identifier.
   * @return  {Object}          Promise resolving to the data set.
   */
  function _get (id) {
    var ds = _dataStore.get(id);

    if (ds && ds.id === parseInt(id, 10)) {
      return $q.when(_dataStore.get(id));
    }
    return _sourceDetails(id).then(function (dataSets) {
      _initHtmlTitleDesc(dataSets[id]);
      _dataStore.add(id, dataSets[id], true);

      return _dataStore.get(id);
    });
  }

  /**
   * Hepler method which will trigger the calculation of precision and recall.
   *
   * @method  _calculatePrecisionRecall
   * @author  Fritz Lekschas
   * @date    2015-12-18
   */
  function _calculatePrecisionRecall () {
    var annotations;
    var dataSet;
    var uniqueSearchResAnno = {};

    _annotations.load().then(function () {
      // Get annotations used and the total number of their usage in relation to
      // the current search results.
      for (var i = _currentDsIds.length; i--;) {
        dataSet = _dataStore.get(_currentDsIds[i]);

        if (dataSet) {
          annotations = dataSet.annotations;

          if (annotations) {
            for (var j = annotations.length; j--;) {
              if (!!!uniqueSearchResAnno[annotations[j].term]) {
                uniqueSearchResAnno[annotations[j].term] = 1;
              } else {
                uniqueSearchResAnno[annotations[j].term]++;
              }
            }
          }
        }
      }

      // Trigger the actual calculation of precision and recall
      _annotations.calcPR(
        uniqueSearchResAnno,
        _currentDsIds.length
      );

      _searchResultAnnotations.resolve(uniqueSearchResAnno);
    }).catch(function (e) {
      _searchResultAnnotations.reject(e);
    });
  }

  /**
   * Return `true` if some data objects are currently selected.
   *
   * @method  _selectionLen
   * @author  Fritz Lekschas
   * @date    2015-10-14
   *
   * @return  {Boolean}
   */
  function _selectionLen () {
    return Object.keys(_selection).length;
  }

  /**
   * Store selection
   *
   * @method  _setSelection
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Object|Array}  set  Set of data objects to be selected.
   */
  function _setSelection (set) {
    var selection = {};

    if (_.isObject(set) && !_.isArray(set)) {
      selection = set;
    }

    if (_.isArray(set)) {
      for (var i = set.length; i--;) {
        selection[set[i]] = true;
      }
    }

    _clearSelectionCache();

    _selection = selection;
    _totalSelection = _selectionLen();
    _total = _totalSelection;
  }

  /**
   * Convert an object-based list into an array
   *
   * @method  _objListToArray
   * @author  Fritz Lekschas
   * @date    2017-01-13
   * @param   {Object}  objList  Object-based list
   * @return  {Array}            Array
   */
  function _objListToArray (objList) {
    var arr = [];
    var ids = Object.keys(objList);
    for (var i = ids.length; i--;) {
      arr.push(ids[i]);
    }
    return arr;
  }

  /**
   * Reset the title and description HTML.
   *
   * @description
   * The HTML version of the title and description might change depending on the
   * search as different parts can be highlighted. For that reason we need to
   * explicitely update it everytime a search as been cleared.
   *
   * @method  _resetHtmlTitleDesc
   * @author  Fritz Lekschas
   * @date    2017-01-13
   */
  function _resetHtmlTitleDesc () {
    _dataStore.each(function (ds) {
      ds.titleHtml = $sce.trustAsHtml(ds.title);
      ds.descriptionHtml = $sce.trustAsHtml(ds.description);
    });
  }

  /**
   * Initialize the title and description HTML.
   *
   * @method  _initHtmlTitleDesc
   * @author  Fritz Lekschas
   * @date    2017-01-13
   * @param   {Object}  dataSet  Object to be initialized.
   */
  function _initHtmlTitleDesc (dataSet) {
    dataSet.titleHtml = dataSet.titleHtml ?
      dataSet.titleHtml : $sce.trustAsHtml(dataSet.title);
    dataSet.descriptionHtml = dataSet.descriptionHtml ?
      dataSet.descriptionHtml : $sce.trustAsHtml(dataSet.description);
  }

  /*
   * ------------------------------- Public ------------------------------------
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

  /* ------------------------------ Variables ------------------------------- */

  /**
   * Promise resolving to all IDs.
   *
   * @author  Fritz Lekschas
   * @date    2016-02-11
   *
   * @type    {Array}
   */
  Object.defineProperty(
    DataSet.prototype,
    'allIds',
    {
      enumerable: true,
      get: function () {
        if (_search) {
          return _currentDsIds.promise;
        }
        return _allDsIds.promise;
      }
    }
  );

  /**
   * Promise resolving to all currently available data set IDs.
   *
   * @description
   * In contrast to `allIds` this can either be all IDs when `DataSet.all()` has
   * been selected or all data set IDs of the current base selection, i.e.
   * filter or search. Selections based on `select` are not included.
   *
   * @author  Fritz Lekschas
   * @date    2016-02-11
   *
   * @type    {Object}
   */
  Object.defineProperty(
    DataSet.prototype,
    'ids',
    {
      enumerable: true,
      get: function () {
        if (_search) {
          return _currentDsIds.promise;
        }

        if (_selectionLen()) {
          return $q.when(_objListToArray(_selection));
        }

        return _allDsIds.promise;
      }
    }
  );

  /**
   * Promise resolving to all selected IDs.
   *
   * @author  Fritz Lekschas
   * @date    2017-01-29
   *
   * @type    {Array}
   */
  Object.defineProperty(
    DataSet.prototype,
    'selectedIds',
    {
      enumerable: true,
      get: function () {
        if (_selectionLen()) {
          return $q.when(_objListToArray(_selection));
        }

        return $q.when([]);
      }
    }
  );

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
      get: function () {
        return !!_selectionLen();
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
      get: function () {
        return _total;
      }
    }
  );

  /* ------------------------------- Methods -------------------------------- */

  /**
   * Set the data source to the general unrestricted data API.
   *
   * @method  all
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @return  {Object}  Instance itself to enable chaining.
   */
  DataSet.prototype.all = function () {
    _search = false;

    _allDsIds = $q.defer();

    if (_browsePath.length &&
      _browsePath[_browsePath.length - 1].type === 'search') {
      _browsePath.pop();
      _resetHtmlTitleDesc();
    }

    _clearOrderCache();
    _source = new DataSetDataApi(undefined, true);

    return this;
  };

  /**
   * Helper method to load all data set IDs that the user has access to
   *
   * @method  loadAllIds
   * @author  Fritz Lekschas
   * @date    2016-02-11
   *
   * @return  {Object}  Promise of the HTTP call made.
   */
  DataSet.prototype.loadAllIds = function () {
    var allDsApiCall = new DataSetDataApi(undefined, true, true);

    allDsApiCall.then(function (allDs) {
      _allDsIds.resolve(allDs.ids);
    });

    return allDsApiCall;
  };

  /**
   * Deselect currently selected data objects.
   *
   * @method  deselect
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @return  {Object}  Instance itself to enable chaining.
   */
  DataSet.prototype.deselect = function () {
    if (_browsePath.length &&
      _browsePath[_browsePath.length - 1].type === 'select') {
      _browsePath.pop();
    }

    _selection = {};
    _clearSelectionCache(true);

    return this;
  };

  /**
   * Set the data source to the general data API and add a filter option.
   *
   * @method  filter
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Object}  filter  Key value pairs of filters.
   *   E.g. `{'is_owner': true}`
   * @return  {Object}          Instance itself to enable chaining.
   */
  DataSet.prototype.filter = function (filter) {
    _search = false;

    // _browsePath = [];
    _clearOrderCache();
    _source = new DataSetDataApi(filter);

    return this;
  };

  /**
   * Fetch a set of data objects.
   *
   * @method  fetch
   * @author  Fritz Lekschas
   * @date    2016-03-10
   */
  DataSet.prototype.fetch = _fetch;

  /**
   * Get a single data set.
   *
   * @method  get
   * @author  Fritz Lekschas
   * @date    2015-10-08
   */
  DataSet.prototype.get = _get;

  /**
   * Get the currently relevant annotations depending on the selected dataset.
   *
   * @description
   * Either all datasets are selected or a subset depending on searching
   * and filter.
   *
   * @method  getCurrentAnnotations
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @return  {Array}  Set of annotation terms.
   */
  DataSet.prototype.getCurrentAnnotations = function () {
    if (_search) {
      return _searchResultAnnotations.promise.then(function (annotations) {
        return _annotations.get(annotations);
      });
    }
    return _annotations.get();
  };

  /**
   * Get the current browse state
   *
   * @method  getCurrentBrowseState
   * @author  Fritz Lekschas
   * @date    2015-10-15
   *
   * @return  {Object}  State object.
   */
  DataSet.prototype.getCurrentBrowseState = function () {
    return _browsePath.length ? _browsePath[_browsePath.length - 1] : void 0;
  };

  /**
   * Get data objects including meta data.
   *
   * @description
   * This is needed for some services like `UiScollSource`.
   *
   * @method  fetchInclMeta
   * @author  Fritz Lekschas
   * @date    2015-10-09
   *
   * @param   {Number}  limit   Number of data objects to be fetched.
   * @param   {Number}  offset  Starting point for retrieving data objects.
   * @return  {Object}          Promise with data objects.
   */
  DataSet.prototype.fetchInclMeta = function (limit, offset) {
    return _fetch(limit, offset).then(function (data) {
      return {
        meta: {
          total: _total,
          totalUpperBound: (_approximateTotal && _total < _totalUpperBound) ?
            _totalUpperBound : undefined
        },
        data: data
      };
    });
  };

  /**
   * Mark a set of data objects as highlighted.
   *
   * @method  highlight
   * @author  Fritz Lekschas
   * @date    2015-11-02
   *
   * @param   {Object}   dataSetIds  Object of with dataset IDs as attributes.
   * @param   {Boolean}  reset       If `true` then highlight will be `false`.
   * @param   {String}   mode        Determines the highlight mode, e.g. `hover`
   *   or `lock`.
   * @return  {Object}               Instance itself to enable chaining.
   */
  DataSet.prototype.highlight = function (dataSetIds, reset, mode) {
    var keys = Object.keys(dataSetIds || {});

    // Invert boolean representation so that the default behavior is
    // highlighting.
    for (var i = keys.length; i--;) {
      if (mode === 'hover') {
        _dataStore.set(keys[i], {
          hovered: !!!reset
        });
      }
      if (mode === 'lock') {
        _dataStore.set(keys[i], {
          locked: !!!reset
        });
      }
    }

    return this;
  };

  /**
   * Load all dataset annotations.
   *
   * @method  loadAnnotations
   * @author  Fritz Lekschas
   * @date    2015-12-09
   *
   * @return  {Object}  Promise resolving to an object holding all annotations.
   */
  DataSet.prototype.loadAnnotations = function () {
    return _annotations.load();
  };

  /**
   * Set the data source to the general data API and add a order option.
   *
   * @method  order
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {String}  order  String that determines the order.
   * @return  {Object}         Instance itself to enable chaining.
   */
  DataSet.prototype.order = function (order) {
    _search = false;
    _browsePath = [];
    _clearOrderCache();
    _source = new DataSetDataApi({
      order_by: order
    });

    return this;
  };

  /**
   * Reset the cached order of data sets.
   *
   * @description
   * Call this method whenever the retrieved data sets differ but the request
   * method is still the same. E.g., after a search for 'cancen' and deletion of
   * one of the data sets returned.
   *
   * @method  clearCache
   * @author  Fritz Lekschas
   * @date    2016-09-23
   */
  DataSet.prototype.clearCache = function () {
    _clearOrderCache();
  };

  /**
   * Set the data source to the search endpoint.
   *
   * @method  search
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {String}  query  Keywords for searching.
   * @return  {Object}         Instance itself to enable chaining.
   */
  DataSet.prototype.search = function (query) {
    _search = true;

    _source = new DataSetSearchApi(query, true);

    // Reset search result annotation promise.
    _searchResultAnnotations = $q.defer();

    _currentDsIds = $q.defer();

    if (!!_getLastBrowseStep('select')) {
      _clearOrderCache(true);
    } else {
      _clearOrderCache();
    }

    _addBrowsePath({
      type: 'search',
      query: query
    });

    return this;
  };

  /**
   * [select description]
   *
   * @method  select
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Object|Array}  set    Selected data objects.
   * @param   {String}        query  Unique identifier of the selection. E.g.
   *   an ontology term.
   * @return  {Object}               Instance itself to enable chaining.
   */
  DataSet.prototype.select = function (set, query) {
    _setSelection(set);
    _addBrowsePath({
      type: 'select',
      query: query || set
    });

    return this;
  };

  return new DataSet();
}

angular
  .module('dataSet')
  .factory('dataSet', [
    '$q',
    '$sce',
    '_',
    'settings',
    'DataSetDataApi',
    'DataSetDataDetailsApi',
    'DataSetSearchApi',
    'DataSetStore',
    'DataSetAnnotations',
    DataSetFactory
  ]);
