'use strict';

function metadataStatusService () {
  var vm = this;
  vm.metadataPreviewStatus = false;

  /**
   * * Used by UI to see if a metadata is being previewed to trigger alert
   * when leaving the tab or page. Temp fix until we can presist data.
   * @param { boolean } status - true or false if file is previewed
   */
  vm.setMetadataPreviewStatus = function (status) {
    if (typeof(status) === 'boolean') {
      vm.metadataPreviewStatus = status;
    }
  };
}

angular.module('refineryDataSetImport')
  .service('metadataStatusService', [
    metadataStatusService
  ]
);
