/**
 * Select All Button
 * @namespace rpSelectAllButton
 * @desc Component which displays a custom select-all checkbox with an
 * indeterminate state
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .directive('rpSelectAllButton', rpSelectAllButton);

  rpSelectAllButton.$inject = [
    '$',
    '_',
    '$window',
    'activeNodeService',
    'assayFileService',
    'assayFiltersService',
    'dataSetPropsService',
    'fileBrowserFactory',
    'fileParamService',
    'fileRelationshipService',
    'toolSelectService'
  ];

  function rpSelectAllButton (
    $,
    _,
    $window,
    activeNodeService,
    assayFileService,
    assayFiltersService,
    dataSetPropsService,
    fileBrowserFactory,
    fileParamService,
    fileRelationshipService,
    toolSelectService
  ) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/select-all-button.html');
      },
      link: function (scope) {
        scope.isAllSelected = true; // for vm to toggle text on select all
        scope.nodeSelectCount = 0; // view display number selected
        scope.updatingSelectionStatus = false;

        // toggles button
        scope.updateSelection = function () {
          var inputTypeUuid = toolSelectService.selectedTool.file_relationship.input_files[0].uuid;
          if (!scope.isAllSelected) {
            scope.isAllSelected = true;
            scope.updatingSelectionStatus = true;
             // add filters to facets
            var params = {
              data_set_uuid: $window.dataSetUuid,
              uuid: $window.externalAssayUuid,
              include_facet_count: false
            };
            // encodes all field names to avoid issues with escape characters.
            var internalName = fileBrowserFactory.attributesNameKey.Name;

            params.filter_attribute = fileParamService.fileParam.filter_attribute;
            // grabbing a subset of attributes
            var attributeNames = Object.keys(params.filter_attribute).concat([
              'uuid', internalName
            ]);
            params.facets = attributeNames.join(',');

            var assayFiles = assayFileService.query(params);
            assayFiles.$promise.then(function (response) {
              if (!_.has(activeNodeService.selectionObj, '0.' + inputTypeUuid)) {
                activeNodeService.selectionObj = angular.copy({ 0: {} });
                activeNodeService.selectionObj[0][inputTypeUuid] = {};
              }
              for (var i = 0; i < response.nodes.length; i++) {
                if (!_.has(activeNodeService.selectionObj[0][inputTypeUuid],
                  response.nodes[i].uuid) || !activeNodeService.selectionObj[0][inputTypeUuid]
                  [response.nodes[i].uuid]) {
                  angular.copy(response.nodes[i], activeNodeService.activeNodeRow);
                  activeNodeService.selectionObj[0][inputTypeUuid][response.nodes[i].uuid] = true;
                  fileRelationshipService.setNodeSelectCollection(
                    inputTypeUuid, activeNodeService.selectionObj
                  );
                  fileRelationshipService.setGroupCollection(
                    inputTypeUuid, activeNodeService.selectionObj
                  );
                }
              }
              // reset selected node in UI
              angular.copy({}, activeNodeService.activeNodeRow);
              scope.updatingSelectionStatus = false;
            });
          } else if (fileRelationshipService.nodeSelectCount ===
            dataSetPropsService.dataSet.file_count) {
            scope.isAllSelected = false;
            fileRelationshipService.resetInputGroup();
          } else {
            // remove selection on the currect view
            scope.isAllSelected = false;
            for (var i = 0; i < fileBrowserFactory.assayFiles.length; i++) {
              if (activeNodeService.selectionObj[0][inputTypeUuid]
                [fileBrowserFactory.assayFiles[i].uuid] ||
                activeNodeService.selectionObj[0][inputTypeUuid]
                  [fileBrowserFactory.assayFiles[i].uuid]) {
                angular.copy(fileBrowserFactory.assayFiles[i], activeNodeService.activeNodeRow);
                activeNodeService.selectionObj[0][inputTypeUuid]
                  [fileBrowserFactory.assayFiles[i].uuid] = false;
                fileRelationshipService.setNodeSelectCollection(
                  inputTypeUuid, activeNodeService.selectionObj,
                  fileBrowserFactory.assayFiles[i].uuid
                );
                fileRelationshipService.setGroupCollection(
                  inputTypeUuid, activeNodeService.selectionObj,
                  fileBrowserFactory.assayFiles[i].uuid
                );
              }
            }
            // reset selected node in UI
            angular.copy({}, activeNodeService.activeNodeRow);
          }
        };

        scope.$watchCollection(function () {
          return assayFiltersService.attributeFilter;
        }, function () {
          scope.isAllSelected = false;
        });

        scope.$watchCollection(function () {
          return assayFiltersService.analysisFilter;
        }, function () {
          scope.isAllSelected = false;
        });

        scope.$watch(function () {
          return fileRelationshipService.nodeSelectCount;
        }, function (selectCount) {
          scope.nodeSelectCount = selectCount;
          if (fileRelationshipService.nodeSelectCount ===
            dataSetPropsService.dataSet.file_count) {
            scope.isAllSelected = true;
          }
        });
      }
    };
  }
})();
