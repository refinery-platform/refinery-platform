'use strict';

function selectedFilterService ($location) {
  var vm = this;
  vm.selectedFieldList = {};

  vm.updateSelectedFilters = function (selectedField, internalName, field) {
    console.log('in the field list');
    console.log(selectedField);
    console.log(internalName);
    console.log(field);
    if (selectedField[field] &&
      typeof vm.selectedFieldList[internalName] !== 'undefined') {
      // add field url query and selectedList
      console.log('internal name exists');
      vm.selectedFieldList[internalName].push(field);
      $location.search(field, selectedField[field]);
    } else if (selectedField[field]) {
      console.log('internal name does not exist');
      // add field url query and selectedList
      vm.selectedFieldList[internalName] = [field];
      $location.search(field, selectedField[field]);
    } else {
      // remove attribute field
      console.log('removing field');
     // console.log(vm.selectedFieldList);
      console.log(internalName);
      console.log(vm.selectedFieldList[internalName]);
      var ind = vm.selectedFieldList[internalName].indexOf(field);
      if (ind > -1) {
        vm.selectedFieldList[internalName].splice(ind, 1);
      }
      if (vm.selectedFieldList[internalName].length === 0) {
        delete vm.selectedFieldList[internalName];
      }
      $location.search(field, null);
    }
    console.log(vm.selectedFieldList);
  };
}

angular.module('refineryFileBrowser')
  .service('selectedFilterService', [
    '$location',
    selectedFilterService
  ]
);
