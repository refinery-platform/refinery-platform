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
    vm.needMoreNodes = needMoreNodes;
    vm.navRight = navRight;
    vm.navLeft = navLeft;
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

    function needMoreNodes () {
      var moreFlag = false;
      var groupType = fileService.currentTypes[fileService.currentTypes.length - 1];
      if (!_.property(vm.currentGroup)(fileService.groupCollection)) {
        moreFlag = true;
      } else if (groupType === 'PAIR') {
        var inputLength = _.keys(fileService.groupCollection[vm.currentGroup]).length;
        if (inputLength > 1) {
          angular.forEach(
            fileService.groupCollection[vm.currentGroup],
            function (inputList) {
              if (inputList.length === 0) {
                moreFlag = true;
              }
            });
        } else {
          moreFlag = true;
        }
      } else {
        angular.forEach(
          fileService.groupCollection[vm.currentGroup],
          function (inputList) {
            if (inputList.length === 0) {
              moreFlag = true;
            }
          });
      }
      return moreFlag;
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
