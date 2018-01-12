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
      getUserFiles: getUserFiles,
      _mergeAndAddObject: _mergeAndAddObject,
      _objectToNameCount: _objectToNameCount,
      _nameCountToObject: _nameCountToObject,
      _mergeAndAddNameCounts: _mergeAndAddNameCounts
    };
    var URL = 'url';
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    function createColumnDefs () {
      var _cellTemplate = '<div class="ngCellText text-align-center ui-grid-cell-contents"' +
            'ng-class="col.colIndex()">' +
            '<div ng-if="COL_FIELD == \'PENDING\'  ' +
            'title="Importing file in progress.">' +
            '<i class="fa fa-clock-o"></i></div>' +
            '<div ng-if="COL_FIELD != \'PENDING\' ' +
            '&& COL_FIELD != \'N/A\'" ' +
            'title="Download File \{{COL_FIELD}}\">' +
            '<a href="{{COL_FIELD}}" target="_blank">' +
            '<i class="fa fa-arrow-circle-o"></i></a></div>' +
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
                    '<i class="fa fa-table"></i>' +
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
          // TODO: Name collisions might happen here:
          // organism_Characteristics vs organism_Factor_Value
          row[display] = node[internalName];
        });
        row[URL] = row.name;
        data.push(row);
      });
      return data;
    }

    function _mergeAndAddObject (target, extra) {
      Object.keys(extra).forEach(function (key) {
        if (typeof target[key] === 'undefined') {
          target[key] = extra[key];
        } else {
          target[key] += extra[key];
        }
      });
    }

    function _objectToNameCount (object) {
      var nc = [];
      Object.keys(object).forEach(function (key) {
        nc.push({
          name: key,
          count: object[key]
        });
      });
      return nc;
    }

    function _nameCountToObject (nameCount) {
      var obj = {};
      nameCount.forEach(function (nc) {
        obj[nc.name] = nc.count;
      });
      return obj;
    }

    function _mergeAndAddNameCounts (targetNC, extraNC) {
      var targetObj = _nameCountToObject(targetNC);
      var extraObj = _nameCountToObject(extraNC);
      _mergeAndAddObject(targetObj, extraObj);
      var newTargetNC = _objectToNameCount(targetObj);
      targetNC.length = 0;
      newTargetNC.forEach(function (nc) {
        targetNC.push(nc);
      });
    }

    function createFilters (solrFacetCounts) {
      var filters = {};
      Object.keys(solrFacetCounts).forEach(function (key) {
        if (solrFacetCounts[key].length > 0) {
          var facetObj = solrFacetCounts[key];
          var lowerCaseNames = facetObj.map(function (nameCount) {
            return nameCount.name.toLowerCase();
          }).join(' ');
          // "foo_Characteristic" and "foo_Factor_Value" both map to "foo".
          var display = mapInternalToDisplay(key);
          if (!angular.isDefined(filters[display])) {
            filters[display] = {
              facetObj: [],
              lowerCaseNames: ''
            };
          }
          filters[display].lowerCaseNames += ' ' + lowerCaseNames;
          _mergeAndAddNameCounts(filters[display].facetObj, facetObj);
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
