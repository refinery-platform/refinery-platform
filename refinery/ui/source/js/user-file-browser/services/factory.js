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
      console.log(solrAttributes);
      console.log(solrFacetCounts);
      return {
        Technology: {
          facetObj: [
            { name: 'ChIP-seq', count: 4 },
            { name: 'RNA-seq', count: 7 }
          ]
        },
        Organism: {
          facetObj: [
            { name: 'Homo sapiens', count: 3 },
            { name: 'Mus musculus', count: 8 }
          ]
        },
        Filetype: {
          facetObj: [
            { name: 'GCT file', count: 42 },
            { name: 'Affymetrix Probe Results', count: 8 }
          ]
        },
        Owner: {
          facetObj: [
            { name: 'Chuck McCallum', count: 6 },
            { name: 'Geoff Nelson', count: 6 }
          ]
        },
        Antibody: {
          facetObj: [
            { name: 'HNF4A', count: 5 },
            { name: 'FRTS4', count: 46 }
          ]
        },
        Celltype: {
          facetObj: [
            { name: 'Caco-2', count: 42 },
            { name: 'HeLa', count: 1 }
          ]
        },
        Genotype: {
          facetObj: [
            { name: 'C57BL/6J', count: 12 }
          ]
        }
      };
    }
  }
})();
