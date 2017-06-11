(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .service('selectedFilterService', selectedFilterService);

  selectedFilterService.$inject = ['$location', '$window'];

  function selectedFilterService ($location, $window) {
    var vm = this;
    vm.attributeSelectedFields = {};
    vm.addSelectedField = addSelectedField;
    vm.encodeAttributeFields = encodeAttributeFields;
    vm.resetAttributeFilter = resetAttributeFilter;
    vm.stringifyAndEncodeAttributeObj = stringifyAndEncodeAttributeObj;
    vm.uiSelectedFields = {};
    vm.updateUrlQuery = updateUrlQuery;
    vm.updateSelectedFilters = updateSelectedFilters;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * Helper method which removes selected Field and deletes empty attributes
     * @param {string} internalName - attribute internal name,'Month_Characteristics_10_5_s'
     * @param {string} fieldName - field name
    */
    function addSelectedField (internalName, fieldName) {
      // check to see if it already exists
      var fieldIndex = vm.attributeSelectedFields[internalName].indexOf(fieldName);
      if (fieldIndex === -1) {
        vm.attributeSelectedFields[internalName].push(fieldName);
      }
    }

    /**
     * Helper function encodes field array in an obj
     * @param {obj} attributeObj - {internalName: [fields]}
     */
    function encodeAttributeFields (attributeObj) {
      angular.forEach(attributeObj, function (fieldArray) {
        for (var ind = 0; ind < fieldArray.length; ind++) {
          fieldArray[ind] = $window.encodeURIComponent(fieldArray[ind]);
        }
      });
      return (attributeObj);
    }

    /**
     * Helper method which removes selected Field and deletes empty attributes
     * @param {string} internalName - attribute internal name,'Month_Characteristics_10_5_s'
     * @param {string} fieldName - field name
    */
    var removeSelectedField = function (internalName, fieldName) {
      // remove attribute field
      var fieldIndex = vm.attributeSelectedFields[internalName].indexOf(fieldName);
      if (fieldIndex > -1) {
        vm.attributeSelectedFields[internalName].splice(fieldIndex, 1);
      }
      // If attribute has no field, remove the attribute key
      if (vm.attributeSelectedFields[internalName].length === 0) {
        delete vm.attributeSelectedFields[internalName];
      }
    };

    /**
     * Helper method which loops through deselected fields and updates lists
     * @param {obj} deselectedFields - Generated by ui-select with active
      * field_names, {name: false}
     */
    function resetAttributeFilter (deselectedFields) {
      angular.forEach(vm.attributeSelectedFields, function (
        fieldList,
        attributeInternalName
      ) {
        var fieldCount = fieldList.length;
        for (var i = 0; i < fieldCount; i++) {
          vm.updateSelectedFilters(deselectedFields, attributeInternalName, fieldList[0]);
        }
      });
    }

    /**
     * Stringify and encodes an object with the internal name and field (urlquery)
     * @param {string} internalName - attribute internal name,'Month_Characteristics_10_5_s'
     * @param {string} field - fieldName
     */
    function stringifyAndEncodeAttributeObj (internalName, field) {
      var attributeFieldSelected = {};
      attributeFieldSelected[internalName] = $window.encodeURIComponent(field);
      return JSON.stringify(attributeFieldSelected);
    }

    /**
     * Update which attribute fields are selected in data-set browser. Used to
     * filter the solr_query response on back-end.
     * @param {obj} activeFields - Generated by ui-select with active field_names
     * and their boolean value (selected/unselected), {field_name: boolean}
     * @param {string} internalName - Attribute field's internal name,
     * 'Month_Characteristics_10_5_s'
     * @param {string} field - Field name, 'March'
     */
    function updateSelectedFilters (activeFields, internalName, field) {
      var encodedSelection = vm.stringifyAndEncodeAttributeObj(internalName, field);
      // Check if attribute already exists in attributeSelectedFields
      if (activeFields[field] && vm.attributeSelectedFields[internalName]) {
        // checks if selected fields exists in the attibute object
        if (vm.attributeSelectedFields[internalName].indexOf(field) > -1) {
          vm.updateUrlQuery(encodedSelection, activeFields[field]);
        } else {
          vm.attributeSelectedFields[internalName].push(field);
          vm.updateUrlQuery(encodedSelection, activeFields[field]);
        }
      // Add new attribute to attributeSelectedFields
      } else if (activeFields[field]) {
        vm.attributeSelectedFields[internalName] = [field];
        vm.updateUrlQuery(encodedSelection, activeFields[field]);
      // remove empty fields
      } else if (vm.attributeSelectedFields[internalName]) {
        removeSelectedField(internalName, field);
        vm.updateUrlQuery(encodedSelection, null);
      }
      return vm.attributeSelectedFields;
    }

    /**
     * Helper method which updates the url query with fields
     * @param {string} fieldObj - attribute obj with a the name of a field
     * @param {string} value - True adds name or null removes name
    */
    function updateUrlQuery (fieldObj, value) {
      $location.search(fieldObj, value);
    }
  }
})();
