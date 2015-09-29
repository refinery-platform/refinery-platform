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
        'previewing', {
          enumerable: true,
          configurable: false,
          value: false,
          writable: true
      });

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

      return new PreviewService();
    }
  ]);
