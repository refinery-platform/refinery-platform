(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .factory('userFileBrowserFactory', userFileBrowserFactory);

  userFileBrowserFactory.$inject = [
    '$log',
    'settings',
    'userFileService'
  ];

  function userFileBrowserFactory (
    $log,
    settings,
    userFileService
    ) {
    var service = {
      createColumnDefs: createColumnDefs,
      createData: createData,
      createFilters: createFilters,
      getUserFiles: getUserFiles
    };
    var URL = 'url';
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    function createColumnDefs () {
      var defs = [
           { field: 'REFINERY_DOWNLOAD_URL_s',
            enableSorting: false,
            displayName: '',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                '<a href="{{grid.getCellValue(row, col)}}" target="_blank" ' +
                    'ng-show="grid.getCellValue(row, col)">' +
                '<i class="fa fa-arrow-circle-o-down"></i>' +
                '</a>' +
                '</div>',
            width: 30 },
          { field: 'data_set_uuid',
            enableSorting: false,
            displayName: '',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                  '<a href="/data_sets/{{grid.getCellValue(row, col)}}' +
                           '/#/files/">' +
                    '<i class="fa fa-file"></i>' +
                  '</a>' +
                '</div>',
            width: 30 }];
      settings.djangoApp.userFilesColumns.forEach(function (column) {
        defs.push({ field: column });
      });
      return defs;
    }

    function mapInternalToDisplay (internal) {
      return internal.replace(/_(Characteristics|Factor_Value)_generic_s/, '');
    }

    function createData (solrNodes) {
      var data = [];
      solrNodes.forEach(function (node) {
        var row = {};
        var internalNames = Object.keys(node);
        internalNames.forEach(function (internalName) {
          var display = mapInternalToDisplay(internalName);
          row[display] = node[internalName];
        });
        row[URL] = row.name;
        data.push(row);
      });
      return data;
    }

    function createFilters (solrFacetCounts) {
      var filters = {};
      Object.keys(solrFacetCounts).forEach(function (key) {
        if (solrFacetCounts[key].length > 0) {
          // TODO: can't use AttributeOrder (it's per dataset), but this is bad.
          var facetObj = solrFacetCounts[key];
          var lowerCaseNames = facetObj.map(function (nameCount) {
            return nameCount.name.toLowerCase();
          }).join(' ');
          filters[mapInternalToDisplay(key)] = {
            facetObj: facetObj,
            lowerCaseNames: lowerCaseNames
          };
        }
      });
      return filters;
    }

    function getUserFiles () {
      var userFile = userFileService.query();
      userFile.$promise.then(function (/* response */) {
        // TODO: addNodeDetailtoUserFiles();
      }, function (error) {
        $log.error(error);
      });
      return userFile.$promise;
    }
  }
})();
