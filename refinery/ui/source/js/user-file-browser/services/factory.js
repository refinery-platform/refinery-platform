(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .factory('UserFileBrowserFactory', userFileBrowserFactory);

  userFileBrowserFactory.$inject = [
    '$log',
    '_',
    '$window',
    'userFileService'
  ];

  function userFileBrowserFactory (
    $log,
    _,
    $window,
    userFileService
    ) {
    return {
      getUserFiles: getUserFiles
    };

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    function getUserFiles () {
      var userFile = userFileService.query();
      userFile.$promise.then(function (/* response */) {
        // TODO: addNodeDetailtoUserFiles();
      }, function (error) {
        $log.error(error);
      });
      return userFile.$promise;
    }

    // TODO: I think I'll need this soon-ish.
    //  /**
    //  * Helper method for file download column, requires unique template & fields.
    //  * @param {string} _columnName - column name
    //  */
    // function setCustomUrlColumn (_columnName) {
    //   var internalName = grabAnalysisInternalName(assayAttributes);
    //   var _cellTemplate = '<div class="ngCellText text-align-center ui-grid-cell-contents"' +
    //         'ng-class="col.colIndex()">' +
    //         '<div ng-if="COL_FIELD" title="Download File \{{COL_FIELD}}\">' +
    //         '<a href="{{COL_FIELD}}" target="_blank">' +
    //         '<i class="fa fa-arrow-circle-o-down"></i></a>' +
    //         '<span class="fastqc-viewer" ' +
    //         'ng-if="row.entity.Url.indexOf(' + "'fastqc_results'" + ') >= 0">' +
    //         '&nbsp;<a title="View FastQC Result"' +
    //         ' href="/fastqc_viewer/#/\{{row.entity.' + internalName + '}}\">' +
    //         '<i class="fa fa-bar-chart-o"></i></a>' +
    //         '</span></div>' +
    //         '<div ng-if="!COL_FIELD"' +
    //           'title="File not available for download">' +
    //         '<i class="fa fa-bolt"></i>' +
    //         '</div>' +
    //         '</div>';
    //
    //   return {
    //     name: _columnName,
    //     field: _columnName,
    //     cellTooltip: true,
    //     width: 4 + '%',
    //     displayName: '',
    //     enableFiltering: false,
    //     enableSorting: false,
    //     enableColumnMenu: false,
    //     enableColumnResizing: false,
    //     cellTemplate: _cellTemplate
    //   };
    // }
  }
})();
