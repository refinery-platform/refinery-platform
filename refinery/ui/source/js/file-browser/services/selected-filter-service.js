'use strict';

function selectedFilterService ($location) {
  var vm = this;
  vm.selectedFieldList = {};

  /**
   * Helper method which removes selected Field and deletes empty attributes
   * @param {string} attributeName - internal name,'Month_Characteristics_10_5_s'
   * @param {string} fieldName - field name
  */
  var removeSelectedField = function (attributeName, fieldName) {
    // remove attribute field
    var fieldIndex = vm.selectedFieldList[attributeName].indexOf(fieldName);
    if (fieldIndex > -1) {
      vm.selectedFieldList[attributeName].splice(fieldIndex, 1);
    }
    // If attribute has no field, remove the attribute key
    if (vm.selectedFieldList[attributeName].length === 0) {
      delete vm.selectedFieldList[attributeName];
    }
  };

  /**
   * Helper method which removes selected Field and deletes empty attributes
   * @param {string} attributeName - internal name,'Month_Characteristics_10_5_s'
   * @param {string} fieldName - field name
  */
  vm.addSelectedField = function (attributeName, fieldName) {
    // check to see if it already exists
    var fieldIndex = vm.selectedFieldList[attributeName].indexOf(fieldName);
    if (fieldIndex === -1) {
      vm.selectedFieldList[attributeName].push(fieldName);
    }
  };

  /**
   * Helper method which updates the url query with fields
   * @param {string} fieldName - name of field
   * @param {string} value - True adds name or null removes name
  */
  vm.updateUrlQuery = function (fieldName, value) {
    $location.search(fieldName, value);
  };

  /**
   * Update which attribute fields are selected in data-set browser. Used to
   * filter the solr_query response on back-end.
   * @param {obj} activeFields - Generated by ui-select with active field_names
   * and their boolean value (selected/unselected), {field_name: boolean}
   * @param {string} attribute - Attribute field's internal name,
   * 'Month_Characteristics_10_5_s'
   * @param {string} field - Field name, 'March'
   */
  vm.updateSelectedFilters = function (activeFields, attribute, field) {
    // Check if attribute already exists in selectedFieldList
    if (activeFields[field] && vm.selectedFieldList[attribute]) {
      // checks if selected fields exists in the attibute object
      if (vm.selectedFieldList[attribute].indexOf(field) > -1) {
        vm.updateUrlQuery(field, activeFields[field]);
      } else {
        vm.selectedFieldList[attribute].push(field);
        vm.updateUrlQuery(field, activeFields[field]);
      }
    // Add new attribute to selectedFieldList
    } else if (activeFields[field]) {
      vm.selectedFieldList[attribute] = [field];
      vm.updateUrlQuery(field, activeFields[field]);
    // remove empty fields
    } else if (vm.selectedFieldList[attribute]) {
      console.log('should remove selected field');
      console.log(attribute);
      removeSelectedField(attribute, field);
      console.log('in the conditional, post helper');
      console.log(vm.selectedFieldList);
      vm.updateUrlQuery(field, null);
    }
    return vm.selectedFieldList;
  };

   /**
   * Helper method which loops through deselected fields and updates lists
   * @param {obj} deselectedFields - Generated by ui-select with active
    * field_names, {name: false}
   */
  vm.resetAttributeFilter = function (deselectedFields) {
    angular.forEach(vm.selectedFieldList, function (fieldList, attribute) {
      var len = fieldList.length;
      for (var i = 0; i < len; i ++) {
        vm.updateSelectedFilters(deselectedFields, attribute, fieldList[0]);
      }
    });
  };
}

angular.module('refineryFileBrowser')
  .service('selectedFilterService', [
    '$location',
    selectedFilterService
  ]
);
