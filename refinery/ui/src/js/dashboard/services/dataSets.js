angular
  .module('refineryDashboard')
  .factory('dashboardDataSetService', ['$timeout', 'dataSetService',
    function ($timeout, dataSetService) {

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
           * Initialize cache.
           * @type {function}
           */
          initialize: function () {
            this.isEnabled = true;
            this.items = {};
            this.getPure = dataSets.get;
            dataSets.get = this.getCached;
          },

          /**
           * Get cached items wrapper.
           * @param  {number}   offset  First item returned by the API.
           * @param  {number}   limit   Number of items returned by the API.
           * @param  {function} success Callback on success.
           * @return {(boolean|function)}
           */
          getCached: function (offset, limit, success) {
            var self = dataSets.cache;

            if (self.isEnabled) {
              if (self.getItems(offset, limit, success)) {
                return true;
              }
              return self.getPure(offset, limit, function (results) {
                self.saveItems(offset, limit, results);
                success(results);
              });
            }

            return self.getPure(offset, limit, success);
          },

          /**
           * Get cached items.
           * @param  {number}   offset  First item returned by the API.
           * @param  {number}   limit   Number of items returned by the API.
           * @param  {function} success Callback on success.
           * @return {boolean}          Got cached items?
           */
          getItems: function (offset, limit, success) {
            var results = [];

            for (var i = offset, end = offset + limit; i < end; i++) {
              if (!dataSets.cache.items.hasOwnProperty(i)) {
                return;
              }
              results.push(dataSets.cache.items[i]);
            }

            success(results);

            return true;
          },

          /**
           * Store results in the cache.
           * @param  {number} offset  First item returned by the API.
           * @param  {number} limit   Number of items returned by the API.
           * @param  {Array}  results Array of results.
           */
          saveItems: function (offset, limit, results) {
            for (var i = 0, len = results.length; i < len; i++) {
              dataSets.cache.items[offset + i] = results[i];
            }
          }
        },

        /**
         * Query the dataSetService service.
         * @param  {number}   offset  First item returned by the API.
         * @param  {number}   limit   Number of items returned by the API.
         * @param  {function} success Callback on success.
         * @return {boolean}
         */
        get: function (offset, limit, success) {
          // Avoid negative offset API calls.
          if (offset < 0) {
            success([]);
            return;
          }

          // Avoid API calls when the total is reached.
          if (offset >= dataSets.total) {
            success([]);
            return;
          }

          var query = dataSetService.query({
                limit: limit,
                offset: offset
              });

          query
            .$promise
            .then(
              // Success
              function (response) {
                success(response.objects);
                if (!dataSets.initializedWithData) {
                  dataSets.initializedWithData = true;
                  dataSets.total = response.meta.total_count;
                }
              },
              // Error
              function (error) {
                success([]);
              }
            );
        },

        /**
         * Total number of data sets available.
         * @type {number}
         */
        total: Number.POSITIVE_INFINITY
      };

      // Init the cache to get started.
      dataSets.cache.initialize();

      return dataSets;
    }
  ]);
