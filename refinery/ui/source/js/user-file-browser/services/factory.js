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
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

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
      settings.djangoApp.userFilesColumns.forEach(function (column) {
        requestedColumns[column] = true;
      });
      solrAttributes.forEach(function (attribute) {
        if (attribute.attribute_type === 'Characteristics'
            || attribute.attribute_type === 'Factor Value') {
          var name = normalizeName(attribute);
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
            normalizeName(attribute);
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

    function createFilters (solrAttributes, solrFacetCounts) {
      var filters = { todo_name: { facetObj: [{ name: 'foo', count: 42 }] } };
      Object.keys(solrFacetCounts).forEach(function (key) {
        console.log(key, solrFacetCounts[key]);
      });
      // TODO

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

    function normalizeName (attribute) {
      return attribute.display_name.toLowerCase();
    }
  }
})();
