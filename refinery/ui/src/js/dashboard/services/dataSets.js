angular
  .module('refineryDashboard')
  .factory('dashboardDataSetService', [
    '$cacheFactory',
    'dashboardDataSetSourceService',
    function ($cacheFactory, dashboardDataSetSourceService) {

      var cacheStore = $cacheFactory('dashboardDataSetServiceCache', {
        capacity: 10
      });

      var dataSets = {
        /**
         * Data set cache.
         * Since uiScroll dynamically creates and destroys entries in the list,
         * we don't want to re-query the API for the same items we already got
         * earlier.
         * @type {Object}
         */
        cache: {
          /**
           * Default cache identifier
           * @type {number}
           */
          defaultId: 'default',

          /**
           * Get cached items wrapper.
           * @param  {Number}   offset  First item returned by the API.
           * @param  {Number}   limit   Number of items returned by the API.
           * @param  {function} success Callback on success.
           * @return {(boolean|function)}
           */
          get: function (offset, limit, success) {
            var self = dataSets.cache;

            if (self.isEnabled) {
              if (self.getItems(offset, limit, success)) {
                return true;
              }

              return dataSets.queryEndpoint(offset, limit, function (results) {
                self.saveItems(offset, limit, results);
                success(results);
              });
            }

            return dataSets.queryEndpoint(offset, limit, success);
          },

          /**
           * Get cached items.
           * @param  {Number}   offset  First item returned by the API.
           * @param  {Number}   limit   Number of items returned by the API.
           * @param  {function} success Callback on success.
           * @return {boolean}          Got cached items?
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
           * @type {function}
           */
          initialize: function (id) {
            this.id = id;
            this.isEnabled = true;
            this.items = {};
          },

          /**
           * Defines whether dataSets should be cached or not.
           * @type {Boolean}
           */
          isEnabled: false,

          /**
           * Store results in the cache.
           * @param  {Number} offset  First item returned by the API.
           * @param  {Number} limit   Number of items returned by the API.
           * @param  {Array}  results Array of results.
           */
          saveItems: function (offset, limit, results) {
            for (var i = 0, len = results.length; i < len; i++) {
              this.items[offset + i] = results[i];
            }
          }
        },

        /**
         * Wrapper function that adjusts the offset and redirects the request
         * either to the cache or du the function querying the endpoint.
         *
         * @param  {Number}   offset  First item returned by the API.
         * @param  {Number}   limit   Number of items returned by the API.
         * @param  {function} success Callback on success.
         * @return {boolean}
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
         * Query the dataSetService service.
         * @param  {Number}   offset  First item returned by the API.
         * @param  {Number}   limit   Number of items returned by the API.
         * @param  {function} success Callback on success.
         * @return {boolean}
         */
        queryEndpoint: function (offset, limit, success) {
          var query = dashboardDataSetSourceService.get(limit, offset);

          query
            .then(
              // Success
              function (response) {
                success(response.objects);
                if (!dataSets.initializedWithData) {
                  dataSets.initializedWithData = true;
                  dataSets.total = response.meta.total_count;
                  dataSets.totalReadable = response.meta.total_count;
                }
              },
              // Error
              function (error) {
                success([]);
              }
            );
        },

        /**
         * Reset the cache
         */
        resetCache: function (id, hardReset) {
          id = id || dataSets.cache.defaultId;
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
         * Total number of data sets available.
         * @type {Number}
         */
        total: Number.POSITIVE_INFINITY,

        /**
         * Total number of data sets available in a readable format. I.e.
         * infinity is only used for internal purpose but shouldn't be displayed
         * to the user.
         * @type {Number}
         */
        totalReadable: 0
      };

      // Init the cache to get started.
      dataSets.cache.initialize(dataSets.cache.defaultId);

      return dataSets;
    }
  ]);
