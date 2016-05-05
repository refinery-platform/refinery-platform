'use strict';

function rpFileBrowserAssayFilters ($timeout, $location) {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-filters.html',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    bindToController: {
      attributeFilter: '@',
      analysisFilter: '@'
    },
    link: function (scope) {
      // toggles views for fields when some fields are selected
      // var toggleUnselectedFields = function (fieldList, internalName) {
      //  var selectedValues = scope.FBCtrl.selectedFieldList[internalName];
      //  console.log(selectedValues);
      //  var domFields = angular.element('.' + internalName).children();
      //  console.log(domFields);
      //  angular.forEach(fieldList, function (value, key) {
      //    if (selectedValues.indexOf(key) === -1) {
      //      angular.element(
      //      document.querySelector('#attribute-filter-' + key)).toggle();
      //    }
      //  });
      // };

      // ng-click event for attribute filter panels
      scope.dropAttributePanel = function (e, attributeName, attributeObj,
                                           attributeIndex) {
        e.preventDefault();
    //    var escapeAttributeName = attributeName.replace(' ', '-');
        var attributeTitle = angular.element(
          document.querySelector('#attribute-panel-' + attributeIndex)
        );
        var escapeAttributeName = attributeName.replace(' ', '-');
        var attribute = angular.element(
          document.querySelector('#' + escapeAttributeName)
        );
        console.log(attribute);

      //  var selectedKeys = Object.keys(scope.FBCtrl.selectedFieldList);
      //  var selectedAttributeIndex =
        // selectedKeys.indexOf(attributeObj.internal_name);
        if (attributeTitle.hasClass('fa-caret-right')) {
          // minimize the panel if it does not have a selected field
          attributeTitle.removeClass('fa-caret-right');
          attributeTitle.addClass('fa-caret-down');
          attribute.addClass('in');
        } else {
          // expand the panel
          attributeTitle.removeClass('fa-caret-down');
          attributeTitle.addClass('fa-caret-right');
          attribute.removeClass('in');
        }
      };

      // Drop down windows when they are in the URL query
      scope.$on('rf/attributeFilter-ready', function () {
        scope.generateFilterDropSelection();
      });

      // Loops through fields to find matching attributes and drops down panel
      var updateDomDropdown = function (allFields, queryFields, attributeName) {
        for (var ind = 0; ind < allFields.length; ind++) {
          if (queryFields.indexOf(allFields[ind]) > -1) {
            var escapeAttributeName = attributeName.replace(' ', '-');
            angular.element(
              document.querySelector('#' + escapeAttributeName)
            ).addClass('in');
            break;
          }
        }
      };

      scope.generateFilterDropSelection = function () {
        var queryFields = Object.keys($location.search());
        var allFilters = {};
        angular.copy(scope.FBCtrl.attributeFilter, allFilters);

        if (typeof scope.FBCtrl.analysisFilter.Analysis !== 'undefined') {
          allFilters.Analysis = scope.FBCtrl.analysisFilter.Analysis;
        }

        angular.forEach(allFilters, function (attributeObj, attribute) {
          var allFields = Object.keys(attributeObj.facetObj);
          // time out allows the dom to load
          $timeout(function () {
            updateDomDropdown(allFields, queryFields, attribute);
          }, 0);
        });
      };
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserAssayFilters', [
    '$timeout',
    '$location',
    rpFileBrowserAssayFilters
  ]
);
