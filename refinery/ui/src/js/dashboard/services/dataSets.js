angular
  .module('refineryDashboard')
  .factory('dashboardDataSetService', ['dashboardDataSetSourceService',
    function (dashboardDataSetSourceService) {

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
           * @param  {Number}   offset  First item returned by the API.
           * @param  {Number}   limit   Number of items returned by the API.
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
           * Store results in the cache.
           * @param  {Number} offset  First item returned by the API.
           * @param  {Number} limit   Number of items returned by the API.
           * @param  {Array}  results Array of results.
           */
          saveItems: function (offset, limit, results) {
            console.log('dashboardDataSetService', results);
            for (var i = 0, len = results.length; i < len; i++) {
              this.items[offset + i] = results[i];
            }
          }
        },

        /**
         * Query the dataSetService service.
         * @param  {Number}   offset  First item returned by the API.
         * @param  {Number}   limit   Number of items returned by the API.
         * @param  {function} success Callback on success.
         * @return {boolean}
         */
        get: function (offset, limit, success) {
          offset--;

          // Avoid negative offset API calls.
          if (offset < 0) {
            success([]);
            return;
          }

          // Avoid API calls when the total is reached.
          if (offset >= this.total) {
            success([]);
            return;
          }

          console.log('dashboardDataSetService: REQUEST:', offset, limit);

          var query = dashboardDataSetSourceService.get(limit, offset);

          query
            .then(
              // Success
              function (response) {
                console.log('dashboardDataSetService: RESPONSE:', response);
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
         * Reset the cache
         */
        resetCache: function () {
          this.items = {};
        },

        /**
         * Total number of data sets available.
         * @type {Number}
         */
        total: Number.POSITIVE_INFINITY
      };

      // Init the cache to get started.
      // dataSets.cache.initialize();

      return dataSets;
    }
  ]);
