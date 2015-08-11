angular
  .module('refineryApp')
  .factory('UiScrollSource', [
    '$cacheFactory',
    '$q',
    function ($cacheFactory, $q) {

      function UiScrollSourceException(message) {
        this.message = message;
        this.name = 'UiScrollSourceException';
      }

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
                if (this.getItems(offset, limit, success)) {
                  return true;
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

              return true;
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
              this.cache.get(offset, limit, success);
            } else {
              this.queryEndpoint(offset, limit, success);
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
            var query = this.dataSource(limit, offset);

            query
              // Success
              .then(function (response) {
                success(response.objects);
                if (!this.initializedWithData) {
                  this.initializedWithData = true;
                  this.total = response.meta.total_count;
                  this.totalReadable = response.meta.total_count;
                }
              }.bind(this))
              // Error
              .catch(function (error) {
                success([]);
              });
          },

          /**
           * Reset the cache
           *
           * @method  resetCache
           * @author  Fritz Lekschas
           * @date    2015-08-11
           *
           * @param   {String}  id         Identifier for the data source.
           * @param   {[type]}  hardReset  If `true` resets the while cache.
           */
          resetCache: function (id, hardReset) {
            id = id || this.cache.defaultId;
            if (hardReset) {
              cacheStore.removeAll();
            } else {
              // Cache current cache store.
              // (Yes we cache the cache!)
              cacheStore.put(this.cache.id, {
                initializedWithData: this.initializedWithData,
                items: this.cache.items,
                total: this.total,
                totalReadable: this.totalReadable
              });
            }
            // Get cached data or initialize data
            var cached = cacheStore.get(id) || {
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
           *   accepts two parameters, offset and limit, and returns a promise.
           * @param   {String}  id          Identifier for the data source.
           */
          set: function (dataSource, id) {
            console.log(dataSource);
            if (dataSource &&
              typeof dataSource === 'function' &&
              dataSource.length === 2) {
              /**
               * The actual data source.
               *
               * @example
               * function (limit, offset) {
               *   return $q.defer().promise;
               * }
               *
               * @type  {Object}
               */
              this.dataSource = dataSource;
              this.resetCache(id);
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

        // Init the cache to get started.
        return source.initialize();
      }

      return UiScrollSource;
    }
  ]);
