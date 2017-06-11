(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('AssayFiltersCtrl', AssayFiltersCtrl);

  AssayFiltersCtrl.$inject = [
    '$location',
    '$scope',
    '$timeout',
    '_',
    'assayFiltersService',
    'fileParamService',
    'resetGridService',
    'selectedFilterService'
  ];

  function AssayFiltersCtrl (
    $location,
    $scope,
    $timeout,
    _,
    assayFiltersService,
    fileParamService,
    resetGridService,
    selectedFilterService
  ) {
    var vm = this;
    vm.attributeFilter = assayFiltersService.attributeFilter;
    vm.analysisFilter = assayFiltersService.analysisFilter;
    vm.attributeSelectionUpdate = attributeSelectionUpdate;
    vm.queryKeys = Object.keys($location.search()); // used for preset filters
    vm.refreshSelectedFieldFromQuery = refreshSelectedFieldFromQuery;
    /** Used by ui to select/deselect, attributes have an object of filter fields
     * attributeInternalName: {fieldName: boolean, fieldName: boolean} */
    vm.uiSelectedFields = selectedFilterService.uiSelectedFields;
    vm.updateFiltersFromUrlQuery = updateFiltersFromUrlQuery;

    activate();
   /*
   * ---------------------------------------------------------
   * Methods
   * ---------------------------------------------------------
   */
    function activate () {
      if (assayFiltersService.attributeFilter.length === 0) {
         // When the filters are updated (ex when a new analysis runs)
        $scope.$watchCollection(
          function () {
            return assayFiltersService.attributeFilter;
          },
          function () {
            console.log('in the watcher attribute Filter');
            if (Object.keys($location.search()).length > 0) {
              updateFiltersFromUrlQuery();
              // drop panels in ui from query
              $scope.$broadcast('rf/attributeFilter-ready');
              resetGridService.setResetGridFlag(true);
            }
          });
      } else {
        // updates view model's selected attribute filters
        angular.forEach(
          selectedFilterService.attributeSelectedFields,
          function (fieldArr, attributeInternalName) {
            for (var i = 0; i < fieldArr.length; i++) {
              if (_.isEmpty(selectedFilterService.uiSelectedFields)) {
                selectedFilterService.uiSelectedFields[attributeInternalName] = {};
              }
              selectedFilterService
                .uiSelectedFields[attributeInternalName][fieldArr[i]] = true;
              // update url with selected fields(filters)
              var encodedAttribute = selectedFilterService
                .stringifyAndEncodeAttributeObj(attributeInternalName, fieldArr[i]);
              selectedFilterService.updateUrlQuery(encodedAttribute, true);
            }
          });
        // $timeout required to allow grid generation
        $timeout(function () {
          // for attribute filter directive, drop panels in query
          $scope.$broadcast('rf/attributeFilter-ready');
          // update selected rows in ui and set selected nodes count
        }, 0);
        // updates params object
        if (Object.keys($location.search()).length > 0) {
          updateFiltersFromUrlQuery();
        }
      }
    }

    // Used by ui, updates which attribute filters are selected and ui-grid data
    function attributeSelectionUpdate (internalName, field) {
      selectedFilterService.updateSelectedFilters(
        vm.uiSelectedFields[internalName], internalName, field
      );
      angular.copy(vm.uiSelectedFields, selectedFilterService.selectedFilterService);
      fileParamService.fileParam.filter_attribute = {};
      angular.copy(selectedFilterService.attributeSelectedFields,
        fileParamService.fileParam.filter_attribute
      );
      // resets grid
      resetGridService.setRefreshGridFlag(true);
    }

     // helper method, upon refresh/load add fields to select data objs from query
    function refreshSelectedFieldFromQuery (_attributeObj) {
      // stringify/encode attributeInternalName:fieldName for url query comparison
      angular.forEach(_attributeObj.facetObj, function (fieldObj) {
        var encodedField = selectedFilterService.stringifyAndEncodeAttributeObj(
          _attributeObj.internal_name,
          fieldObj.name
        );

        if (vm.queryKeys.indexOf(encodedField) > -1) {
          if (!vm.uiSelectedFields.hasOwnProperty(_attributeObj.internal_name)) {
            vm.uiSelectedFields[_attributeObj.internal_name] = {};
          }
          vm.uiSelectedFields[_attributeObj.internal_name][fieldObj.name] = true;
          selectedFilterService.updateSelectedFilters(
            vm.uiSelectedFields[_attributeObj.internal_name],
            _attributeObj.internal_name,
            fieldObj.name
          );
        }
      });
      angular.copy(vm.uiSelectedFields, selectedFilterService.selectedFilterService);
    }

    // checks url for params to update the filter
    function updateFiltersFromUrlQuery () {
      var allFilters = {};
      // Merge attribute and analysis filter data obj
      angular.copy(vm.attributeFilter, allFilters);
      if (typeof vm.analysisFilter.Analysis !== 'undefined') {
        allFilters.Analysis = vm.analysisFilter.Analysis;
      }

      angular.forEach(allFilters, function (attributeObj) {
        vm.refreshSelectedFieldFromQuery(attributeObj);
      });
      fileParamService.fileParam.filter_attribute = {};
      angular.copy(selectedFilterService.attributeSelectedFields,
        fileParamService.fileParam.filter_attribute);
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // When the filters are updated (ex when a new analysis runs)
    $scope.$watchCollection(
      function () {
        return assayFiltersService.analysisFilter;
      },
      function () {
        vm.attributeFilter = assayFiltersService.attributeFilter;
        vm.analysisFilter = assayFiltersService.analysisFilter;
      }
    );

     // Reset grid flag if set to true, grid, params, filters, and nodes resets
    $scope.$watch(
      function () {
        return resetGridService.resetGridFlag;
      },
      function () {
        if (resetGridService.resetGridFlag) {
          // Have to set selected Fields in control due to service scope
          angular.forEach(vm.uiSelectedFields, function (fieldsObj, attributeInternalName) {
            angular.forEach(fieldsObj, function (value, fieldName) {
              vm.uiSelectedFields[attributeInternalName][fieldName] = false;
            });
            selectedFilterService.resetAttributeFilter(fieldsObj);
          });
          fileParamService.fileParam.filter_attribute = {};
          resetGridService.setResetGridFlag(true);
        }
        angular.copy(vm.uiSelectedFields, selectedFilterService.selectedFilterService);
      }
    );
  }
})();
