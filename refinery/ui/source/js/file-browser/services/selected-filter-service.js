'use strict';

function selectedFilterService ($location) {
  var vm = this;
  vm.selectedFieldList = {};

  // Update the selected fields in the filter
  vm.updateSelectedFilters = function (selectedField, internalName, field) {
    // Check if attribute already exists in selectedFieldList
    if (selectedField[field] &&
      typeof vm.selectedFieldList[internalName] !== 'undefined') {
      // add field url query and selectedList;
      vm.selectedFieldList[internalName].push(field);
      $location.search(field, selectedField[field]);
      // Add new attribute to selectedFieldList
    } else if (selectedField[field]) {
      console.log('internal name does not exist');
      // add field url query and selectedList
      vm.selectedFieldList[internalName] = [field];
      $location.search(field, selectedField[field]);
    } else {
      // remove attribute field
      var ind = vm.selectedFieldList[internalName].indexOf(field);
      if (ind > -1) {
        vm.selectedFieldList[internalName].splice(ind, 1);
      }
      if (vm.selectedFieldList[internalName].length === 0) {
        delete vm.selectedFieldList[internalName];
      }
      $location.search(field, null);
    }
  };
}

angular.module('refineryFileBrowser')
  .service('selectedFilterService', [
    '$location',
    selectedFilterService
  ]
);
