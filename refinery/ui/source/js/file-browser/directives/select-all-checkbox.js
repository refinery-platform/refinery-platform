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
      controller: 'rpSelectAllCheckboxCtrl',
      controllerAs: '$ctrl',
      link: function (scope) {
        var selectAllStatus = false; // establish perm.

        // toggles checkbox
        scope.updateSelection = function () {
          if (!selectAllStatus) {
            selectAllStatus = true;
            $('#file-selection-box').prop('checked', true);
            // add filters to facets
            var params = {
              data_set_uuid: $window.dataSetUuid,
              uuid: $window.externalAssayUuid,
              include_facet_count: false
            };
            // encodes all field names to avoid issues with escape characters.
       //     console.log(fileParamService.fileParam.filter_attribute);
            var internalName = fileBrowserFactory.attributesNameKey.Name;
            console.log(internalName);

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
            selectAllStatus = false;
            $('#file-selection-box').prop('checked', false);
            // deselect all
          }
        };
      //  var setSelectionBox = function () {
          // update active node service selectionObj
          // only works for single lists!!
          // update when user select/deselect rows
          // if (activeNodeService.selectionObj) {
          //   $('#file-selection-box').prop('checked', true);
          // } else if () {
          //   $('#file-selection-box').prop('indeterminate', true);
          // } else {
          //   $('#file-selection-box').prop('checked', false);
          // }

          // update when user toggles selection box
    //    }
      }
    };
  }
})();
