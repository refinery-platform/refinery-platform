'use strict';

/**
 * AngularJS factory wrapper
 *
 * @method  UiScrollSourceFactory
 * @author  Fritz Lekschas
 * @date    2015-09-30
 *
 * @class
 * @param   {Object}  $cacheFactory  Angular's cache factory.
 * @param   {Object}  $q             Angular's promise library.
 */
function UiScrollSourceFactory ($cacheFactory, $q) {
  /**
   * Exception handler
   *
   * @method  UiScrollSourceException
   * @author  Fritz Lekschas
   * @date    2015-08-12
   *
   * @class
   * @param   {String}  message  Error message.
   */
  function UiScrollSourceException (message) {
    this.message = message;
    this.name = 'UiScrollSourceException';
  }

  /**
   * Creates a source object, which can be used by `uiScroll`
   *
   * @description
   * Ui-Scroll expects a source object with a _get_ function, which accepts
   * two parameters, `limit` and `offset`, in order to construct and
   * deconstruct the scrollable list diynamically. In order to reduce the
   * amount of DNS queries and increase performance, we cache each retrieved
   * data entries. Moreover, we cache caches to speeds up performance
   * when changing the data source function often, which is the case when
   * user reformulate their search query often as every list of results is
   * a new data source.
   *
   * @example
   * function Dashboard (News, _) {
   *   this.News = News;
   *   this._ = _;
   *
   *   this.news = new UiScrollSource(
   *      'app/news',
   *      5,
   *      function (limit, offset, extra) {
   *        var params = this._.merge(this._.cloneDeep(extra) || {}, {
   *              limit: limit,
   *              offset: offset
   *            });
   *        return this.News.query(params).$promise;
   *      }.bind(this)
   *    );
   *  }
   *
   * @method  UiScrollSource
   * @author  Fritz Lekschas
   * @date    2015-10-09
   *
   * @class
   * @param   {String}         id             Source identification used for
   *   identifying the cache object.
   * @param   {Number}         cacheCapacity  Number of sources to be cached.
   * @param   {Function}       dataSource     Method for retrieving the actual.
   *   data.
   * @param   {Number|String}  dataProperty   Name of the property holding an
   *   array of the actual data objects.
   * @param   {Number}         totalProperty  Number of UI caches.
   */
  function UiScrollSource (
    id,
    cacheCapacity,
    dataSource,
    dataProperty,
    totalProperty) {
    if (!id) {
      throw new UiScrollSourceException('No or empty `id` given.');
    }

    /**
     * Angular's cache object, which we use to cache data sources.
     *
     * @description
     * Caching data sources is mostly useful for searching when the data
     * source represents the results for a certain search query. Users often
     * reformulate their query and go back and forth.
     *
     * @author  Fritz Lekschas
     * @date    2015-08-11
     *
     * @type    {Object}
     * @private
     */
    var cacheStore = $cacheFactory('uiScrollSource/' + id, {
      capacity: parseInt(cacheCapacity, 10) || 0
    });

    /**
     * Source object
     *
     * @type  {Object}
     * @public
     */
    var source = {
      /**
       * Data set cache.
       *
       * @description
       * Since uiScroll dynamically creates and destroys entries in the
       * list, we don't want to re-query the API for the same items we
       * already got earlier. This won't affect desktop users too much but
       * on mobile networks sending a DNS lookup can be expensive.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @type    {Object}
       */
      cache: {
        /**
         * Default cache identifier.
         *
         * @author  Fritz Lekschas
         * @date    2015-08-11
         *
         * @type    {number}
         */
        defaultId: 'default',

        /**
         * Get cached items wrapper.
         *
         * @method  get
         * @author  Fritz Lekschas
         * @date    2015-08-11
         *
         * @param   {Number}    offset   First item returned by the API.
         * @param   {Number}    limit    Number of items returned by the
         *   API.
         * @param   {Function}  success  Callback on success.
         * @return  {(Boolean|Function)}
         */
        get: function (offset, limit, success) {
          if (this.isEnabled) {
            var cachedItems = this.getItems(offset, limit, success);

            if (cachedItems) {
              return $q.when(cachedItems);
            }

            return source.queryEndpoint(offset, limit, function (results) {
              this.saveItems(offset, limit, results);
              success(results);
            }.bind(this));
          }

          return source.queryEndpoint(offset, limit, success);
        },

        /**
         * Get cached items.
         *
         * @method  getItems
         * @author  Fritz Lekschas
         * @date    2015-08-11
         *
         * @param   {Number}    offset   First item returned by the API.
         * @param   {Number}    limit    Number of items returned by the
         *   API.
         * @param   {Function}  success  Callback on success.
         * @return  {Boolean}            Got cached items?
         */
        getItems: function (offset, limit, success) {
          var results = [];

          for (var i = offset, end = offset + limit; i < end; i++) {
            if (!this.items.hasOwnProperty(i)) {
              return undefined;
            }
            results.push(this.items[i]);
          }

          success(results);

          return results;
        },

        /**
         * Initialize cache.
         *
         * @method  initialize
         * @author  Fritz Lekschas
         * @date    2015-08-11
         *
         * @param   {String}  currentId  Identifier for the current data source.
         * @return  {Object}             Self.
         */
        initialize: function (currentId) {
          this.id = currentId || this.defaultId;
          this.isEnabled = true;
          this.items = {};
          this.firstData = false;
        },

        /**
         * Defines whether caching of entries is enabled or not.
         *
         * @author  Fritz Lekschas
         * @date    2015-08-11
         *
         * @type    {Boolean}
         */
        isEnabled: false,

        /**
         * Store results in the cache.
         *
         * @method  saveItems
         * @author  Fritz Lekschas
         * @date    2015-08-11
         *
         * @param   {Number}  offset   First item returned by the API.
         * @param   {Number}  limit    Number of items returned by the API.
         * @param   {Array}   results  Array of results.
         */
        saveItems: function (offset, limit, results) {
          for (var i = 0, len = results.length; i < len; i++) {
            this.items[offset + i] = results[i];
          }
          if (!source.firstData) {
            source.firstData = true;
          }
        }
      },

      /**
       * Property of the response object holding an array of data objects.
       *
       * @description
       * Example response where `...` could be anything, default property name
       * is assumed to be `data`.
       * ```
       * {
       *   "meta": {...},
       *   "data": [
       *     {...},
       *     {...},
       *     ...
       *   ]
       * }
       * ```
       *
       * @type  {Number|String}
       */
      dataProperty: dataProperty || 'data',

      /**
       * Actual data source object that will be queried.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @type  {Object}
       */
      dataSource: {
        get: function () {
          return $q.defer().promise;
        }
      },

      /**
       * Used to indicate some internal server error, which usually happens
       * when Solr is down.
       *
       * @author  Fritz Lekschas
       * @date    2015-09-11
       *
       * @type  {Boolean}
       */
      error: false,

      /**
       * Object holding a set of extra parameters for querying the data
       * source.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-12
       *
       * @type  {Object}
       */
      extraParameters: {},

      /**
       * After the first batch of data has been loaded this will be true.
       *
       * @description
       * This property can be used to determine the time when to access an
       * example object of the list.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-12
       *
       * @type  {Boolean}
       */
      firstData: false,

      /**
       * Wrapper function that adjusts the offset and redirects the request
       * either to the cache or du the function querying the endpoint.
       *
       * @method  get
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @param   {Number}    offset   First item returned by the API.
       * @param   {Number}    limit    Number of items returned by the API.
       * @param   {Function}  success  Callback on success.
       * @return  {Boolean}
       */
      get: function (offset, limit, success) {
        var _offset = offset - 1;

        if (_offset < 0) {
          // Avoid negative offset API calls.
          if (_offset + limit <= 0) {
            success([]);
            return undefined;
          }
          // We start from zero if the total call includes positive items.
          _offset = 0;
        }

        // Avoid API calls when the total is reached.
        if (_offset >= this.total) {
          success([]);
          return undefined;
        }

        if (this.cache.isEnabled) {
          return this.cache.get(_offset, limit, success);
        }
        return this.queryEndpoint(_offset, limit, success);
      },

      /**
       * Initialize the actual source object for `uiScroll`.
       *
       * @method  initialize
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @return  {Object}  `this.source`, i.e. the object itself.
       */
      initialize: function () {
        this.set(dataSource);
        this.cache.initialize();

        return this;
      },

      /**
       * Sets up a new or cached cache.
       *
       * @method  newOrCachedCache
       * @author  Fritz Lekschas
       * @date    2015-08-12
       *
       * @param   {String}   srcId  Identifier for the data source.
       * @param   {Boolean}  reset  If `true` re-initializes the cache with
       *   id `id`.
       */
      newOrCachedCache: function (srcId, reset) {
        // Reset the error to false to re-evaluate once a new search is
        // being triggered.
        if (!srcId) {
          this.error = false;
        }

        var _srcId = srcId || this.cache.defaultId;

        // Cache current cache store.
        // (Yes we cache the cache!)
        cacheStore.put(this.cache.id, {
          firstData: this.firstData,
          initializedWithData: this.initializedWithData,
          items: this.cache.items,
          total: this.total,
          totalReadable: this.totalReadable,
          totalUpperBound: this.totalUpperBound
        });

        // Reset cached instance
        if (reset) {
          cacheStore.remove(_srcId);
        }

        // Get cached data or initialize data
        var cached = cacheStore.get(_srcId) || {
          firstData: false,
          initializedWithData: false,
          items: {},
          total: Number.POSITIVE_INFINITY,
          totalReadable: 0,
          totalUpperBound: undefined
        };

        // Restore former cache or reset cache.
        this.cache.items = cached.items;
        // Set new id
        this.cache.id = _srcId;
        // Reset init
        this.initializedWithData = cached.initializedWithData;
        // Reset total
        this.total = cached.total;
        this.totalReadable = this.initializedWithData ?
          cached.totalReadable : this.totalReadable;
      },

      /**
       * Query the actualy service for data.
       *
       * @method  queryEndpoint
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @param   {Number}    offset   First item returned by the API.
       * @param   {Number}    limit    Number of items returned by the API.
       * @param   {Function}  success  Callback function on success.
       */
      queryEndpoint: function (offset, limit, success) {
        var query = this.dataSource(limit, offset, this.extraParameters);

        return query
          // Success
          .then(function (response) {
            success(response[this.dataProperty]);
            if (!this.initializedWithData) {
              this.initializedWithData = true;
              this.total = response.meta[this.totalProperty];
              this.totalReadable = response.meta[this.totalProperty];
              this.totalUpperBound = response.meta.totalUpperBound;
            }
            return response[this.dataProperty];
          }.bind(this))
          // Error
          .catch(function () {
            this.error = true;
            success([]);
          }.bind(this));
      },

      /**
       * Remove all cached caches and initialize a new clean cache or re-
       * initialize `id` cache.
       * @author  Fritz Lekschas
       * @date    2015-08-12
       *
       *
       * @method  resetCache
       * @public
       * @param   {String}  cacheId  Identifier for the cache.
       * @return  {String}           Cache identifier
       */
      resetCache: function (cacheId) {
        if (!(cacheId || this.cache.defaultId)) {
          // Remove all cached caches
          cacheStore.removeAll();
        }

        // Initialize a cache again
        this.cache.initialize();

        this.initializedWithData = false;
        this.total = Number.POSITIVE_INFINITY;
        this.totalReadable = 0;
        this.totalUpperBound = undefined;
      },

      /**
       * Set the actual data source.
       *
       * @description
       * Switching the data source is useful when integrating a search. Each
       * result list if the original data source will turn into a new data
       * source that we can scroll through.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @method  set
       * @public
       * @param   {Object}  currentDataSource  Object with a `get` function,
       *   which accepts at least two parameters, offset and limit, and returns
       *   a promise.
       * @param   {String}  srcId               Identifier for the data source.
       */
      set: function (currentDataSource, srcId) {
        if (currentDataSource &&
          typeof currentDataSource === 'function' &&
          currentDataSource.length >= 2) {
          /**
           * The actual data source.
           *
           * @example
           * function (limit, offset) {
           *   return $q.defer().promise;
           * }
           *
           * @type  {Function}
           */
          this.dataSource = currentDataSource;
          this.newOrCachedCache(srcId);
        } else {
          throw new UiScrollSourceException(
            'Data source doesn\'t have a `get` function, which accepts ' +
            'two parameters.'
          );
        }
      },

      /**
       * Total number of data entries available in the current data source.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @type  {Number}
       * @public
       */
      total: Number.POSITIVE_INFINITY,

      /**
       * Property holding the total number of available data objects.
       *
       * @type  {Integer|String}
       * @public
       */
      totalProperty: totalProperty || 'total',

      /**
       * Total number of data entries available in a human readable format.
       *
       * @description
       * While `total` is initialized with infinity for internal purpose we
       * shouldn't be display this number to the user, hence we need an
       * extra variable to store a number that makes sense for humans.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @type  {Number}
       * @public
       */
      totalReadable: 0
    };

    return source.initialize();
  }

  return UiScrollSource;
}


angular
  .module('refineryApp')
  .factory('UiScrollSource', [
    '$cacheFactory',
    '$q',
    UiScrollSourceFactory
  ]);
