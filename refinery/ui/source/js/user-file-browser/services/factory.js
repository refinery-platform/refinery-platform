(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .factory('userFileBrowserFactory', userFileBrowserFactory);

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
      getUserFiles: getUserFiles,
      createColumnDefs: createColumnDefs,
      createData: createData
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

    function createColumnDefs (solrAttributes) {
      var defs = [
           { field: 'url',
            enableSorting: false,
            displayName: '',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                '<a href="{{grid.getCellValue(row, col)}}" target="_blank">' +
                '<i class="fa fa-arrow-circle-o-down"></i>' +
                '</a>' +
                '</div>',
            width: 30 },
          { field: 'dataset',
            enableSorting: false,
            displayName: '',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                '<a href="{{grid.getCellValue(row, col)}}" target="_blank">' +
                '<i class="fa fa-file"></i>' +
                '</a>' +
                '</div>',
            width: 30 },
          { field: 'filename' }];
      var requestedColumns = {};
      $window.djangoApp.userFilesColumns.forEach(function (column) {
        requestedColumns[column] = true;
      });
      solrAttributes.forEach(function (attribute) {
        if (attribute.attribute_type === 'Characteristics'
            || attribute.attribute_type === 'Factor Value') {
          var name = attribute.display_name.toLowerCase();
          if (requestedColumns[name]) {
            requestedColumns[name] = false; // TODO: Better strategy to avoid duplicates?
            defs.push({ field: name });
          }
        }
      });
      return defs;
    }

    function createData (solrAttributes, solrNodes) {
      var mapInternalToDisplay = {};
      solrAttributes.forEach(function (attribute) {
        mapInternalToDisplay[attribute.internal_name] =
            attribute.display_name.toLowerCase();
      });

      var data = [];
      solrNodes.forEach(function (node) {
        var row = {};
        var internalNames = Object.keys(node);
        internalNames.forEach(function (internalName) {
          var display = mapInternalToDisplay[internalName];
          row[display] = node[internalName];
        });
        row.url = row.name;
        row.filename = decodeURIComponent(row.name.replace(/.*\//, ''));
        data.push(row);
      });
      return data;
    }
  }
})();
