angular
  .module('refineryDashboard')
  .factory('dashboardWidthFixerService', ['_',
    function (_) {
      return {
        fire: function (stack) {
          if (_.isArray(this[stack])) {
            for (var i = 0, len = this[stack].length; i < len; i++) {
              if (_.isFunction(this[stack][i])) {
                this[stack][i]();
              }
            }
          }
        },
        fixer: [],
        reseter: []
      };
    }
  ]);
