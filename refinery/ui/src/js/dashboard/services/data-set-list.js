angular
  .module('refineryDashboard')
  .factory('dashboardDataSetListService', ['dataSetService',
    function (dataSetService) {
      return function (limit, offset) {
        var query = dataSetService.query({
              limit: limit,
              offset: offset
            });

        /*
         * This extra promise is needed to normalize the APIs output. Most
         * importantely the name has be split into a title.
         */
        return query
          .$promise
          .then(function (data) {
            for (var i = 0, len = data.objects.length; i < len; i++) {
              var obj = data.objects[i],
                  colonPos = obj.name.indexOf(':');

              if (colonPos >= 0) {
                obj.title = obj.name.substr(colonPos + 1).trim();
              } else {
                obj.title = obj.name;
              }
            }
            return data;
          });
      };
    }
  ]);
