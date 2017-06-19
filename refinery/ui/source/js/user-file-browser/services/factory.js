(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .factory('userFileBrowserFactory', userFileBrowserFactory);

  userFileBrowserFactory.$inject = [
    '$log',
    '_',
    '$window',
    'userFileService',
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
            width: 30 }];
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

    function createData (solrNodes) {
      var data = [];
      for (var i = 0; i < solrNodes.length; i++) {
        var node = solrNodes[i];
        var url = node.REFINERY_NAME_6_3_s;
        data.push({
          url: url,
          technology: 'TODO',
          filename: url ? decodeURIComponent(url.replace(/.*\//, '')) : '',
          organism: node.organism_Characteristics_6_3_s,
          date: 'TODO',
          antibody: node.antibody_Factor_Value_6_3_s,
          cell_type: node.cell_line_Characteristics_6_3_s,
          published: 'TODO',
          accession: 'TODO',
          genotype: 'TODO',
          owner: 'TODO'
        });
      }
      return data;
    }
  }
})();
