'use strict';

function rpFileBrowserAssayFilters ($timeout, $location, selectedFilterService) {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-filters.html',
    link: function (scope) {
      // ng-click event for attribute filter panels
      scope.dropAttributePanel = function (e, attributeName, attributeObj) {
        e.preventDefault();
        var escapeAttributeName = attributeName.replace(' ', '-');
        var attributeTitle = angular.element(
          document.querySelector('#attribute-panel-' + escapeAttributeName)
        );
        var attribute = angular.element(
          document.querySelector('#' + escapeAttributeName)
        );
        var selectedKeys = Object.keys(selectedFilterService.attributeSelectedFields);
        var selectedAttributeIndex = selectedKeys.indexOf(attributeObj.internal_name);
        if (attributeTitle.hasClass('fa-caret-right')) {
          // open panel
          attributeTitle.removeClass('fa-caret-right');
          attributeTitle.addClass('fa-caret-down');
          attribute.addClass('in');
        } else if (selectedAttributeIndex > -1) {
          // keep panel open when some fields are selected showFields method
          // will hide any non-selected fields
          attributeTitle.removeClass('fa-caret-down');
          attributeTitle.addClass('fa-caret-right');
        } else {
          // collapse entire panel when none are selected
          attributeTitle.removeClass('fa-caret-down');
          attributeTitle.addClass('fa-caret-right');
          attribute.removeClass('in');
        }
      };

      // Helper method Checks to see if panel is minimized based on caret
      var isMinimized = function (index) {
        var attributeTitle = angular.element(
          document.querySelector('#attribute-panel-' + index)
        );
        return attributeTitle.hasClass('fa-caret-right');
      };

      // When panel is minimized, selected fields continue to show
      scope.showField = function (field, internalName, attributeName) {
        var escapedAttributeName = attributeName.replace(' ', '-');
        var selectedIndex = -1;
        if (selectedFilterService.attributeSelectedFields[internalName] !== undefined) {
          selectedIndex = selectedFilterService
            .attributeSelectedFields[internalName].indexOf(field);
        }
        if (!isMinimized(escapedAttributeName)) {
          return true;
        } else if (selectedIndex > -1 && isMinimized(escapedAttributeName)) {
          return true;
        }
        return false;
      };

      // Helper method, loops through fields to find matching attributes and
      // drops down panel from url query
      var updateDomDropdown = function (allFields, attributeName, attributeInternalName) {
        var queryFields = Object.keys($location.search());
        for (var ind = 0; ind < allFields.length; ind++) {
          var encodedAttribute = selectedFilterService
            .stringifyAndEncodeAttributeObj(attributeInternalName, allFields[ind]);
          if (queryFields.indexOf(encodedAttribute) > -1) {
            var escapeAttributeName = attributeName.replace(' ', '-');
            var attributeTitle = angular.element(
            document.querySelector('#attribute-panel-' + escapeAttributeName)
            );

            // mark checkbox for selected item
            if (!scope.FBCtrl.uiSelectedFields.hasOwnProperty(attributeInternalName)) {
              scope.FBCtrl.uiSelectedFields[attributeInternalName] = {};
            }
            scope.FBCtrl.uiSelectedFields[attributeInternalName][allFields[ind]] = true;
            if (attributeTitle.hasClass('fa-caret-right')) {
              angular.element(
              document.querySelector('#' + escapeAttributeName)).addClass('in');
              attributeTitle.removeClass('fa-caret-right');
              attributeTitle.addClass('fa-caret-down');
              selectedFilterService.addSelectedField(attributeInternalName, allFields[ind]);
            } else {
              selectedFilterService.addSelectedField(attributeInternalName, allFields[ind]);
            }
          }
        }
      };

      // On the initial page load, consolidates filters obj & updates dom
      scope.generateFilterDropSelection = function () {
        var allFilters = {};
        angular.copy(scope.FBCtrl.attributeFilter, allFilters);

        if (typeof scope.FBCtrl.analysisFilter.Analysis !== 'undefined') {
          allFilters.Analysis = scope.FBCtrl.analysisFilter.Analysis;
        }
        angular.forEach(allFilters, function (attributeObj, attributeName) {
          var allFields = [];
          angular.forEach(attributeObj.facetObj, function (fieldObj) {
            allFields.push(fieldObj.name);
          });

          // time out allows the dom to load
          $timeout(function () {
            updateDomDropdown(allFields, attributeName, attributeObj.internal_name);
          }, 0);
        });
        return allFilters;
      };

      // Drop down windows when they are in the URL query
      scope.$on('rf/attributeFilter-ready', function () {
        scope.generateFilterDropSelection();
      });
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserAssayFilters', [
    '$timeout',
    '$location',
    'selectedFilterService',
    rpFileBrowserAssayFilters
  ]
);
