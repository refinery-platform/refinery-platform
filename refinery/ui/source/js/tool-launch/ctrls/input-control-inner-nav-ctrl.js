(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputControlInnerNavCtrl', InputControlInnerNavCtrl);

  InputControlInnerNavCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService'
  ];


  function InputControlInnerNavCtrl (
    $scope,
    _,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.currentGroup = fileService.currentGroup; // maintains nav position
    vm.currentTypes = fileService.currentTypes;
    vm.inputFileTypes = fileService.inputFileTypes;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
    vm.needMoreNodes = needMoreNodes;
   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */
    function navLeft (depth) {
      vm.currentGroup[depth]--;
    }

    function navRight (depth) {
      vm.currentGroup[depth]++;
    }

    // Main method to check if the group has minimum nodes
    function needMoreNodes () {
      var moreFlag = false;
      var groupType = fileService.currentTypes[fileService.currentTypes.length - 1];
      if (!_.property(vm.currentGroup)(fileService.groupCollection)) {
        moreFlag = true;
      } else if (groupType === 'PAIR') {
        // pair, requires 2 inputTypes
        var inputLength = _.keys(fileService.groupCollection[vm.currentGroup]).length;
        if (inputLength > 1) {
          moreFlag = areInputFileTypesEmpty();
        } else {
          moreFlag = true;
        }
      } else {
        // list
        moreFlag = areInputFileTypesEmpty();
      }
      return moreFlag;
    }

    // helper method to check if each group-inputType are empty
    function areInputFileTypesEmpty () {
      var isEmpty = false;
      angular.forEach(fileService.groupCollection[vm.currentGroup], function (inputList) {
        if (inputList.length === 0) {
          isEmpty = true;
        }
      });
      return isEmpty;
    }
    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return fileService.currentGroup;
        },
        function () {
          vm.currentGroup = fileService.currentGroup;
          vm.currentTypes = fileService.currentTypes;

          vm.inputFileTypes = fileService.inputFileTypes;
        }
      );
    };
  }
})();
