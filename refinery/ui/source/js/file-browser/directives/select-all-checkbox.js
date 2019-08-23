/**
 * Select All Checkbox
 * @namespace rpSelectAllCheckbox
 * @desc Component which displays a custom select-all checkbox with an
 * indeterminate state
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .directive('rpSelectAllCheckbox', rpSelectAllCheckbox);

  rpSelectAllCheckbox.$inject = [
    '$',
    '$window',
    'activeNodeService',
    'assayFileService',
    'fileBrowserFactory',
    'fileParamService',
    'fileRelationshipService',
    'toolSelectService'
  ];

  function rpSelectAllCheckbox (
    $,
    $window,
    activeNodeService,
    assayFileService,
    fileBrowserFactory,
    fileParamService,
    fileRelationshipService,
    toolSelectService
  ) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/select-all-checkbox.html');
      },
      link: function (scope) {
        var selectAllStatus = 'none'; // establish status, none, all, some.
        scope.nodeSelectCount = 0; // view display number selected

        // toggles checkbox
        scope.updateSelection = function () {
          fileRelationshipService.resetInputGroup();
          if (selectAllStatus === 'none') {
            selectAllStatus = 'all';
            $('#file-selection-box').prop('checked', true);
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
              var inputTypeUuid = toolSelectService.selectedTool.
                file_relationship.input_files[0].uuid;
              activeNodeService.selectionObj = angular.copy({ 0: { } });
              activeNodeService.selectionObj[0][inputTypeUuid] = { };
              for (var i = 0; i < response.nodes.length; i++) {
                angular.copy(response.nodes[i], activeNodeService.activeNodeRow);
                activeNodeService.selectionObj[0][inputTypeUuid][response.nodes[i].uuid] = true;
                fileRelationshipService.setNodeSelectCollection(
                  inputTypeUuid, activeNodeService.selectionObj
                );
                fileRelationshipService.setGroupCollection(
                  inputTypeUuid, activeNodeService.selectionObj
                );
              }
              // reset selected node in UI
              angular.copy({}, activeNodeService.activeNodeRow);
            });
            // select all the nodes
          } else {
            selectAllStatus = 'none';
            $('#file-selection-box').prop('checked', false);
            fileRelationshipService.resetInputGroup();
          }
        };

        // updates checkbox with user selects via grid
        var fileSelectionBox = $('#file-selection-box');
        var setSelectionBox = function () {
          if (fileRelationshipService.nodeSelectCount ===
            fileBrowserFactory.assayFilesTotalItems.count) {
            fileSelectionBox.prop('checked', true);
            fileSelectionBox.prop('indeterminate', false);
            selectAllStatus = 'all';
          } else if (fileRelationshipService.nodeSelectCount === 0) {
            fileSelectionBox.prop('checked', false);
            fileSelectionBox.prop('indeterminate', false);
            selectAllStatus = 'none';
          } else {
            fileSelectionBox.prop('indeterminate', true);
            selectAllStatus = 'some';
          }
        };

        scope.$watch(function () {
          return fileRelationshipService.nodeSelectCount;
        }, function (selectCount) {
          setSelectionBox();
          scope.nodeSelectCount = selectCount;
        });
      }
    };
  }
})();
