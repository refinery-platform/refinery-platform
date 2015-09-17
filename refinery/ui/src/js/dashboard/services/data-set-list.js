angular
  .module('refineryDashboard')
  .factory('dashboardDataSetListService', ['dataSetService', '_',
    function (dataSetService, _) {
      return function (limit, offset, extra) {
        var params = _.merge(_.cloneDeep(extra) || {}, {
              limit: limit,
              offset: offset
            }),
            query = dataSetService.query(params);

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
