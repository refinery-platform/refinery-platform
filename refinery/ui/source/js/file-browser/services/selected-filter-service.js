'use strict';

function selectedFilterService ($location) {
  var vm = this;
  vm.selectedFieldList = {};

  var removeSelectedField = function (internalName, field) {
    // remove attribute field
    var fieldIndex = vm.selectedFieldList[internalName].indexOf(field);
    if (fieldIndex > -1) {
      vm.selectedFieldList[internalName].splice(fieldIndex, 1);
    }
    // If attribute has no field, remove the attribute key
    if (vm.selectedFieldList[internalName].length === 0) {
      delete vm.selectedFieldList[internalName];
    }
  };

  var updateUrlQuery = function (field, value) {
    $location.search(field, value);
  };

  // Update the selected fields in the filter
  vm.updateSelectedFilters = function (selectedField, internalName, field) {
    // Check if attribute already exists in selectedFieldList
    if (selectedField[field] && vm.selectedFieldList[internalName]) {
      vm.selectedFieldList[internalName].push(field);
      updateUrlQuery(field, selectedField[field]);
      // Add new attribute to selectedFieldList
    } else if (selectedField[field]) {
      vm.selectedFieldList[internalName] = [field];
      updateUrlQuery(field, selectedField[field]);
    } else if (vm.selectedFieldList[internalName]) {
      removeSelectedField(internalName, field);
      updateUrlQuery(field, null);
    }
    return vm.selectedFieldList;
  };
}

angular.module('refineryFileBrowser')
  .service('selectedFilterService', [
    '$location',
    selectedFilterService
  ]
);
