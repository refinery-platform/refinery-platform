'use strict';

angular
  .module('refineryDashboard')
  .factory('dashboardDataSetPreviewService', [
    function () {
      function PreviewService () {
      }

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
          this.dataSetUuid = undefined;
        }
        this.previewing = false;
      };

      PreviewService.prototype.preview = function (dataSetUuid) {
        // Unset old preview
        if (this.previewing) {
          this.dataSetUuid = undefined;
        }

        // Store data set that's to be previewed
        this.dataSetUuid = dataSetUuid;
        this.previewing = true;
      };

      return new PreviewService();
    }
  ]);
