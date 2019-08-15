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
    'assayFileService',
    'fileParamService'
  ];

  function rpSelectAllCheckbox (
    $,
    $window,
    assayFileService,
    fileParamService
  ) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/select-all-checkbox.html');
      },
      controller: 'rpSelectAllCheckboxCtrl',
      controllerAs: '$ctrl',
      link: function (scope, element, attrs, ctrl) {
        var selectAllStatus = false; // establish perm.
        console.log(ctrl);

        // toggles checkbox
        scope.updateSelection = function () {
          console.log(selectAllStatus);
          console.log('in the update selectAllStatus');
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
            console.log(fileParamService.fileParam.filter_attribute);

            params.filter_attribute = fileParamService.fileParam.filter_attribute;
            var attributeNames = Object.keys(params.filter_attribute).concat(['uuid']);
            params.facets = attributeNames.join(',');

            var assayFiles = assayFileService.query(params);
            assayFiles.$promise.then(function (response) {
              console.log(response.nodes);
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
