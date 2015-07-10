angular
  .module('refineryDashboard')
  .factory('dashboardDataSetPreviewService', ['_',
    function (_) {

      function PreviewService() {}

      Object.defineProperty(
        PreviewService.prototype,
        'dataSet', {
          enumerable: true,
          configurable: false,
          writable: true
      });

      Object.defineProperty(
        PreviewService.prototype,
        'listeners', {
          enumerable: true,
          configurable: false,
          value: {
            collapsFinished: [],
            expandFinished: []
          },
          writable: true
      });

      Object.defineProperty(
        PreviewService.prototype,
        'previewing', {
          enumerable: true,
          configurable: false,
          value: false,
          writable: true
      });

      PreviewService.prototype.addListener = function (stack, callback) {
        if (_.isArray(this.listeners[stack])) {
          this.listeners[stack].push(callback);
        } else {
          this.listeners[stack] = [callback];
        }
      };

      PreviewService.prototype.close = function () {
        if (this.previewing) {
          this.dataSet.preview = false;
        }
        this.previewing = false;
      };

      PreviewService.prototype.preview = function (dataSet) {
        // Unset old preview
        if (this.previewing) {
          this.dataSet.preview = false;
        }

        // Store data set that's to be previewed
        this.dataSet = dataSet;
        this.dataSet.preview = true;
        this.previewing = true;
      };

      PreviewService.prototype.trigger = function (stack) {
        if (_.isArray(this.listeners[stack])) {
          for (var i = 0, len = this.listeners[stack].length; i < len; i++) {
            if (_.isFunction(this.listeners[stack][i])) {
              this.listeners[stack][i]();
            }
          }
        }
      };

      return new PreviewService();
    }
  ]);
