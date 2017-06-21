(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .factory('userFileBrowserFactory', userFileBrowserFactory);

  userFileBrowserFactory.$inject = [
    '$log',
    '$window',
    'userFileService'
  ];

  function userFileBrowserFactory (
    $log,
    $window,
    userFileService
    ) {
    return {
      getUserFiles: getUserFiles,
      createColumnDefs: createColumnDefs,
      createData: createData,
      createFilters: createFilters
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
          var name = normalizeName(attribute);
          if (requestedColumns[name]) {
            requestedColumns[name] = false; // TODO: Better strategy to avoid duplicates?
            defs.push({ field: name });
          }
        }
      });
      return defs;
    }

    function normalizeName (attribute) {
      return attribute.display_name.toLowerCase();
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
      console.log(solrFacetCounts); // TODO: These have only one suffix ...
      var mapDisplayToInternal = {}; // May be one-to-many
      solrAttributes.forEach(function (attribute) {
        var display = normalizeName(attribute);
        if (! mapDisplayToInternal.hasOwnProperty(display)) {
          mapDisplayToInternal[display] = [];
        }
        mapDisplayToInternal[display].push(attribute.internal_name);
      });

      var requestedFilters = $window.djangoApp.userFilesColumns;
      // TODO: Should there be a separate config for the filters?

      var filters = {};
      requestedFilters.forEach(function (filterName) {
        var internals = mapDisplayToInternal[filterName];
        if (filterName === 'organism') {
          console.log(internals); // TODO: ... but there are multiple name matches here ...
        }
        var facetCounts = [];
        internals.forEach(function (internal) {
          var counts = solrFacetCounts[internal];
          if (filterName === 'organism') {
            console.log(counts); // TODO: ... but all but one come out undefined.
          }
          if (counts) {
            counts.forEach(function (facetCount) {
              facetCounts.push(facetCount);
            });
          }
        });
        filters[filterName] = {
          facetObj: facetCounts
        };
      });

      return filters;
    }
  }
})();
