(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .factory('userFileBrowserFactory', userFileBrowserFactory);

  userFileBrowserFactory.$inject = [
    '$log',
    'settings',
    '_',
    'userFileService'
  ];

  function userFileBrowserFactory (
    $log,
    settings,
    _,
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

    function createColumnDefs (culledAttributes) {
      var _cellTemplate = '<div class="ngCellText text-align-center ui-grid-cell-contents"' +
            'ng-class="col.colIndex()">' +
            '<div ng-if="COL_FIELD == \'PENDING\'"  ' +
            'title="Importing file in progress.">' +
            '<i class="fa fa-clock-o"></i></div>' +
            '<div ng-if="COL_FIELD != \'PENDING\' ' +
            '&& COL_FIELD != \'N/A\'" ' +
            'title="Download File \{{COL_FIELD}}\">' +
            '<a href="{{COL_FIELD}}" target="_blank">' +
            '<i class="fa fa-arrow-circle-o-down"></i></a></div>' +
            '<div ng-if="COL_FIELD == \'N/A\'" ' +
            'title="File not available for download">' +
            '<i class="fa fa-bolt"></i>' +
            '</div>' +
            '</div>';
      var defs = [
           { field: 'REFINERY_DOWNLOAD_URL_s',
            enableSorting: false,
            displayName: '',
            cellTemplate: _cellTemplate,
            width: 30 },
          { field: 'data_set_uuid',
            enableSorting: false,
            displayName: '',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                  '<a href="/data_sets/{{grid.getCellValue(row, col)}}' +
                           '/#/files/">' +
                    '<i class="fa fa-folder-open-o"></i>' +
                  '</a>' +
                '</div>',
            width: 30 }];
      // temp solution to handle empty columns until backend is updated to
      // avoid sending attributes with no fields
      var attributeStr = culledAttributes.join(',');
      settings.djangoApp.userFilesColumns.forEach(function (column) {
        if (_.includes(attributeStr, column)) {
          defs.push({ field: column });
        }
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
          // TODO: Name collisions might happen here:
          // organism_Characteristics vs organism_Factor_Value
          row[display] = node[internalName];
        });
        row[URL] = row.name;
        data.push(row);
      });
      return data;
    }

    function createFilters (solrFacetCounts) {
      var filters = {};
      Object.keys(solrFacetCounts).forEach(function (attributeName) {
        if (solrFacetCounts[attributeName].length > 0) {
          // array of facet objs with counts
          var facetObjArr = solrFacetCounts[attributeName];
          var lowerCaseNames = facetObjArr.map(function (nameCount) {
            return nameCount.name.toLowerCase();
          }).join(' ');
          // "foo_Characteristic" and "foo_Factor_Value" both map to "foo".
          var display = mapInternalToDisplay(attributeName);
          if (!angular.isDefined(filters[display])) {
            filters[display] = {
              facetObj: [],
              lowerCaseNames: ''
            };
          }
          filters[display].lowerCaseNames += ' ' + lowerCaseNames;

          // combine 'similar' attribute facets into one, but track internal
          // names in the facet obj (needed for filtering)
          facetObjArr.forEach(function (facet) {
            facetObjArr.assocAttribute = attributeName;
            facet.assocAttribute = attributeName;
            filters[display].facetObj.push(facet);
          });
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
