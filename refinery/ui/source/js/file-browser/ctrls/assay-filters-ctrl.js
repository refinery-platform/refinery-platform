/**
 * Assay Filters Ctrl
 * @namespace AssayFiltersCtrl
 * @desc Main ctrl for the assay filters, which can be used for a ui-grid
 * displaying data from solr. Updates a files param to display data
 * when user select filters or when in url query.
 * @memberOf refineryFileBrowser
 */
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
    'filesLoadingService',
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
    filesLoadingService,
    fileParamService,
    resetGridService,
    selectedFilterService
  ) {
    var vm = this;
    vm.attributeFilter = assayFiltersService.attributeFilter;
    vm.analysisFilter = assayFiltersService.analysisFilter;
    vm.attributeSelectionUpdate = attributeSelectionUpdate;
    vm.queryKeys = Object.keys($location.search()); // used for pre-set filters in url query
    vm.refreshSelectedFieldFromQuery = refreshSelectedFieldFromQuery;
    /** Used by ui to select/deselect, attributes have an object of filter fields
     * attributeInternalName: {fieldName: boolean, fieldName: boolean} */
    vm.uiSelectedFields = {};
    vm.updateFiltersFromUrlQuery = updateFiltersFromUrlQuery;
    vm.updateFilterDOM = false;

    activate();
   /*
   * ---------------------------------------------------------
   * Methods
   * ---------------------------------------------------------
   */
    function activate () {
      // Only on a new page load/new data set do we expect the attribute filters
      // to be empty
      if (_.isEmpty(assayFiltersService.attributeFilter)) {
        // Requires waiting for the api response which should update the
        // service's attribute filter and unbind.
        var watchOnce = $scope.$watchCollection(
          function () {
            return assayFiltersService.attributeFilter;
          },
          function () {
            // no need to update filters if there are no url queries
            if (Object.keys($location.search()).length === 0) {
              watchOnce();   // unbind watcher
            }
            if (!_.isEmpty(assayFiltersService.attributeFilter)) {
              updateFiltersFromUrlQuery();
                // drop panels in ui from query
              vm.updateFilterDOM = true;
              // update data in grid
              resetGridService.setRefreshGridFlag(true);
              watchOnce();   // unbind watcher
            }
          }
        );
      } else {
        // Else is for soft loads (example tabbing)
        // updates view model's selected attribute filters
        angular.forEach(
          selectedFilterService.attributeSelectedFields,
          function (fieldArr, attributeInternalName) {
            for (var i = 0; i < fieldArr.length; i++) {
              if (_.isEmpty(vm.uiSelectedFields) ||
                !vm.uiSelectedFields.hasOwnProperty(attributeInternalName)) {
                vm.uiSelectedFields[attributeInternalName] = {};
              }
              vm.uiSelectedFields[attributeInternalName][fieldArr[i]] = true;
              // update url with selected fields(filters)
              var encodedAttribute = selectedFilterService
                .stringifyAttributeObj(attributeInternalName, fieldArr[i]);
              selectedFilterService.updateUrlQuery(encodedAttribute, true);
            }
          });
          // for attribute filter directive, drop panels in query
        vm.updateFilterDOM = true;
          // updates url with the selected filters (ex: tabbing)
        if (Object.keys($location.search()).length > 0) {
          updateFiltersFromUrlQuery();
        }
      }
    }

    /**
     * @name attributeSelectionUpdate
     * @desc Used by ui, updates which attribute filters are selected and ui-grid data
     * @memberOf refineryFileBrowser.AssayFiltersCtrl
     * @param {string} internalName - solr name for attribute
     * @param {string} field - value for the attributes
    **/
    function attributeSelectionUpdate (internalName, field) {
      selectedFilterService.updateSelectedFilters(
        vm.uiSelectedFields[internalName], internalName, field
      );
      fileParamService.setParamFilterAttribute(selectedFilterService.attributeSelectedFields);
      // refresh grid
      resetGridService.setRefreshGridFlag(true);
    }

    /**
     * @name refreshSelectedFieldFromQuery
     * @desc helper method, upon refresh/load add fields to select data objs from query
     * @memberOf refineryFileBrowser.AssayFiltersCtrl
     * @param {object} attributeObj - combination of attribute and analysis
     * object from solr
    **/
    function refreshSelectedFieldFromQuery (attributeObj) {
      // stringify/encode attributeInternalName:fieldName for url query comparison
      angular.forEach(attributeObj.facetObj, function (fieldObj) {
        var encodedField = selectedFilterService.stringifyAttributeObj(
          attributeObj.internal_name,
          fieldObj.name
        );

        if (vm.queryKeys.indexOf(encodedField) > -1) {
          if (!vm.uiSelectedFields.hasOwnProperty(attributeObj.internal_name)) {
            vm.uiSelectedFields[attributeObj.internal_name] = {};
          }
          vm.uiSelectedFields[attributeObj.internal_name][fieldObj.name] = true;
          selectedFilterService.updateSelectedFilters(
            vm.uiSelectedFields[attributeObj.internal_name],
            attributeObj.internal_name,
            fieldObj.name
          );
        }
      });
    }

    /**
     * @name updateFiltersFromUrlQuery
     * @desc checks url for params to update the filter
     * @memberOf refineryFileBrowser.AssayFiltersCtrl
    **/
    function updateFiltersFromUrlQuery () {
      if (_.has(vm.analysisFilter, 'Analysis')) {
        vm.refreshSelectedFieldFromQuery(vm.analysisFilter.Analysis);
      }

      angular.forEach(vm.attributeFilter, function (attributeObj) {
        vm.refreshSelectedFieldFromQuery(attributeObj);
      });

      fileParamService.setParamFilterAttribute(
        selectedFilterService.attributeSelectedFields
      );
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
        vm.analysisFilter = assayFiltersService.analysisFilter;
        vm.attributeFilter = assayFiltersService.attributeFilter;
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
              // initialize the uiSelectObj for easier indexing
              vm.uiSelectedFields[attributeInternalName][fieldName] = false;
            });
            selectedFilterService.resetAttributeFilter(fieldsObj);
          });
          fileParamService.resetParamFilterAttribute = {};
          resetGridService.setResetGridFlag(false);
        }
      }
    );
  }
})();
