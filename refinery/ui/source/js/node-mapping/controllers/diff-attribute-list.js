'use strict';

function DiffAttributeListCtrl (analysisService, $log, $scope) {
  var vm = this;

  // Logs and called update node pair properities
  function checkIfUpdateDiff (oldVal, newVal) {
    if (oldVal && !newVal) {
      $log.debug('Attribute setA initialized');
      vm.updateDiff();
    }
    if (newVal) {
      $log.debug('Attribute setA changed');
      vm.updateDiff();
    }
  }

  // Watch for any changes in the drag/drop paired analysis
  $scope.$watch(function () {
    return vm.setA.attributes;
  }, checkIfUpdateDiff.bind(this));
  $scope.$watch(function () {
    return vm.setB.attributes;
  }, checkIfUpdateDiff.bind(this));


  // helper method for updating attributes @params: obj {name: '', value: ''}
  vm.seperateCommonAndDiffAttributes = function (attributeA, attributeB) {
    if (attributeA.name === attributeB.name) {
      if (attributeA.value === attributeB.value) {
        vm.commonAttributes.push({
          name: attributeA.name,
          value: attributeA.value
        });
      } else {
        vm.diffAttributes.push({
          name: attributeA.name,
          valueSetA: attributeA.value,
          valueSetB: attributeB.value
        });
      }
    }
  };

  // helper method, in an array of object, returns the index for the FIRST
  // name: Analysis
  vm.findAnalysisIndex = function (arrOfObj) {
    var index = -1;
    for (var i = 0; i < arrOfObj.length; i++) {
      if (arrOfObj[i].name === 'Analysis') {
        index = i;
        break;
      }
    }
    return index;
  };

  /* helper method, makes the api call and updates analysis name
   @params:
   index: location of analysis object
   attributeObj: either common attributes or diff attributes is passed in
   to be updated
   uuid: analysis object value should be uuid */
  vm.getAndReplaceAnalysisName = function (index, attributeArr, uuid) {
    var analysis = analysisService.query({ uuid: uuid });
    analysis.$promise.then(function (response) {
      var analysisName = response.objects[0].name;
      if (attributeArr[index].value) {
        attributeArr[index].value = analysisName;
      } else if (attributeArr[index].valueSetA === uuid) {
        attributeArr[index].valueSetA = analysisName;
      } else if (attributeArr[index].valueSetB === uuid) {
        attributeArr[index].valueSetB = analysisName;
      }
    }, function () {
      $log.error('Error returning analysis name');
    });
    return analysis.$promise;
  };

  // main method to replace the analysis uuid with name
  vm.replaceAnalysisUuidWithName = function () {
    var analysisUuid = '';
    if (vm.commonAttributes.length > 0) {
      var commIndex = vm.findAnalysisIndex(vm.commonAttributes);
      if (commIndex >= 0 && vm.commonAttributes[commIndex].value !== 'N/A') {
        analysisUuid = vm.commonAttributes[commIndex].value;
        vm.getAndReplaceAnalysisName(commIndex, vm.commonAttributes, analysisUuid);
      }
    }
    if (vm.diffAttributes.length > 0) {
      var diffIndex = vm.findAnalysisIndex(vm.diffAttributes);
      if (diffIndex >= 0 && vm.diffAttributes[diffIndex].valueSetA !== 'N/A') {
        analysisUuid = vm.diffAttributes[diffIndex].valueSetA;
        vm.getAndReplaceAnalysisName(diffIndex, vm.diffAttributes, analysisUuid);
      }
      if (diffIndex >= 0 && vm.diffAttributes[diffIndex].valueSetB !== 'N/A') {
        analysisUuid = vm.diffAttributes[diffIndex].valueSetB;
        vm.getAndReplaceAnalysisName(diffIndex, vm.diffAttributes, analysisUuid);
      }
    }
  };

 // view method for updating selected pair node analysis properities in the
  // drag/drop
  vm.updateDiff = function () {
    vm.diffAttributes = [];
    vm.commonAttributes = [];
    $log.debug('Updating diff lists ...');

    if (vm.setA.attributes === null && vm.setB.attributes === null) {
      $log.debug('Both sets empty');
    } else if (vm.setB.attributes !== null && vm.setA.attributes !== null) {
      for (var i = 0; i < vm.setA.attributes.length; ++i) {
        vm.seperateCommonAndDiffAttributes(vm.setA.attributes[i], vm.setB.attributes[i]);
      }
    } else if (vm.setA.attributes === null) {
      angular.copy(vm.setB.attributes, vm.commonAttributes);
    } else {
      // ( expect vm.setB.attributes === null)
      angular.copy(vm.setA.attributes, vm.commonAttributes);
    }
    vm.replaceAnalysisUuidWithName();
  };
}

angular
  .module('refineryNodeMapping')
  .controller('DiffAttributeListCtrl', [
    'analysisService',
    '$log',
    '$scope',
    DiffAttributeListCtrl
  ]);
