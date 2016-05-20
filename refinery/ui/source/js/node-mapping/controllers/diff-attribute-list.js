'use strict';

function DiffAttributeListCtrl (analysisService, $log, $scope) {
  var vm = this;

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

  vm.getAndUpdateAnalysisName = function (index, attributeObj, uuid) {
    analysisService.query({ uuid: uuid })
    .$promise.then(function (response) {
      if (attributeObj[index].value) {
        attributeObj[index].value = response.objects[0].name;
      } else if (attributeObj[index].valueSetA === uuid) {
        attributeObj[index].valueSetA = response.objects[0].name;
      } else if (attributeObj[index].valueSetB === uuid) {
        attributeObj[index].valueSetB = response.objects[0].name;
      }
    }, function () {
      $log.error('Error returning analysis name');
    });
  };

  vm.replaceAnalysisName = function () {
    var analysisUuid = '';
    if (vm.commonAttributes.length > 0) {
      var commIndex = vm.findAnalysisIndex(vm.commonAttributes);
      if (commIndex >= 0 && vm.commonAttributes[commIndex].value !== 'N/A') {
        analysisUuid = vm.commonAttributes[commIndex].value;
        vm.getAndUpdateAnalysisName(commIndex, vm.commonAttributes, analysisUuid);
      }
    }
    if (vm.diffAttributes.length > 0) {
      var diffIndex = vm.findAnalysisIndex(vm.diffAttributes);
      if (diffIndex >= 0 && vm.diffAttributes[diffIndex].valueSetA !== 'N/A') {
        analysisUuid = vm.diffAttributes[diffIndex].valueSetA;
        vm.getAndUpdateAnalysisName(diffIndex, vm.diffAttributes, analysisUuid);
      }
      if (diffIndex >= 0 && vm.diffAttributes[diffIndex].valueSetB !== 'N/A') {
        analysisUuid = vm.diffAttributes[diffIndex].valueSetB;
        vm.getAndUpdateAnalysisName(diffIndex, vm.diffAttributes, analysisUuid);
      }
    }
  };

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
    vm.replaceAnalysisName();
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
