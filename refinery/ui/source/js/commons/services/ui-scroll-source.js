/**
 * AngularJS factory wrapper
 *
 * @method  UiScrollSourceFactory
 * @author  Fritz Lekschas
 * @date    2015-09-30
 *
 * @param   {[type]}  $cacheFactory  Angular's cache factory.
 * @param   {[type]}  $q             Angular's promise library.
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
   * @example <caption>Invoke the service</caption>
   * ```
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
   * ```
   *
   * @method  UiScrollSource
   * @author  Fritz Lekschas
   * @date    2015-08-14
   *
   * @class
   * @param   {String}    id             Source identification used for
   *   identifying the cache object.
   * @param   {Number}    cacheCapacity  Number of sources to be cached.
   * @param   {Function}  dataSource     Method for retrieving the actual.
   *   data.
   */
  function UiScrollSource (id, cacheCapacity, dataSource) {
    if (!id) {
      throw new UiScrollSourceException('No or empty `id` given.');
    }

    cacheCapacity = parseInt(cacheCapacity) || 0;

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
     */
    var cacheStore = $cacheFactory('uiScrollSource/' + id, {
      capacity: cacheCapacity
    });

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
              return;
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
         * @param   {String}  id  Identifier for the current data source.
         * @return  {Object}      Self.
         */
        initialize: function (id) {
          this.id = id || this.defaultId;
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
       * Actual data source object that will be queried.
       *
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @type  {Object}
       */
      dataSource: {
        get: function (limit, offset) {
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
        offset--;

        if (offset < 0) {
          // Avoid negative offset API calls.
          if (offset + limit <= 0) {
            success([]);
            return;
          }
          // We start from zero if the total call includes positive items.
          offset = 0;
        }

        // Avoid API calls when the total is reached.
        if (offset >= this.total) {
          success([]);
          return;
        }

        if (this.cache.isEnabled) {
          return this.cache.get(offset, limit, success);
        } else {
          return this.queryEndpoint(offset, limit, success);
        }
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
       * @param   {String}   id     Identifier for the data source.
       * @param   {Boolean}  reset  If `true` re-initializes the cache with
       *   id `id`.
       */
      newOrCachedCache: function (id, reset) {
        // Reset the error to false to re-evaluate once a new search is
        // being triggered.
        if (!id) {
          this.error = false;
        }

        id = id || this.cache.defaultId;

        // Cache current cache store.
        // (Yes we cache the cache!)
        cacheStore.put(this.cache.id, {
          firstData: this.firstData,
          initializedWithData: this.initializedWithData,
          items: this.cache.items,
          total: this.total,
          totalReadable: this.totalReadable
        });

        // Reset cached instance
        if (reset) {
          cacheStore.remove(id);
        }

        // Get cached data or initialize data
        var cached = cacheStore.get(id) || {
          firstData: false,
          initializedWithData: false,
          items: {},
          total: Number.POSITIVE_INFINITY,
          totalReadable: 0
        };

        // Restore former cache or reset cache.
        this.cache.items = cached.items;
        // Set new id
        this.cache.id = id;
        // Reset init
        this.initializedWithData = cached.initializedWithData;
        // Reset total
        this.total = cached.total;
        this.totalReadable = this.initializedWithData ? cached.totalReadable : this.totalReadable;
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
            success(response.objects);
            if (!this.initializedWithData) {
              this.initializedWithData = true;
              this.total = response.meta.total_count;
              this.totalReadable = response.meta.total_count;
            }
            return response.objects;
          }.bind(this))
          // Error
          .catch(function (error) {
            this.error = true;
            success([]);
          }.bind(this));
      },

      /**
       * Remove all cached caches and initialize a new clean cache or re-
       * initialize `id` cache.
       *
       * @method  resetCache
       * @author  Fritz Lekschas
       * @date    2015-08-12
       *
       * @return  {String}  Cache identifier
       */
      resetCache: function (id) {
        id = id || this.cache.defaultId;

        if (!id) {
          // Remove all cached caches
          cacheStore.removeAll();
        }

        // Initialize a cache again
        this.cache.initialize();
      },

      /**
       * Set the actual data source.
       *
       * @description
       * Switching the data source is useful when integrating a search. Each
       * result list if the original data source will turn into a new data
       * source that we can scroll through.
       *
       * @method  set
       * @author  Fritz Lekschas
       * @date    2015-08-11
       *
       * @param   {Object}  dataSource  Object with a `get` function, which
       *   accepts at least two parameters, offset and limit, and returns a
       *   promise.
       * @param   {String}  id          Identifier for the data source.
       */
      set: function (dataSource, id) {
        if (dataSource &&
          typeof dataSource === 'function' &&
          dataSource.length >= 2) {
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
          this.dataSource = dataSource;
          this.newOrCachedCache(id);
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
       */
      total: Number.POSITIVE_INFINITY,

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
