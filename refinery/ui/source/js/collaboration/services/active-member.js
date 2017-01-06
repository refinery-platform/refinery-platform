'use strict';

function activeMemberService () {
  var vm = this;
  vm.activeMember = {};
  // total members in active group
  vm.totalMembers = 0;

  vm.setActiveMember = function (memberObj) {
    angular.copy(memberObj, vm.activeMember);
  };

  vm.setTotalMembers = function (count) {
    vm.totalMembers = count;
  };
}

angular.module('refineryCollaboration')
  .service('activeMemberService', [
    activeMemberService
  ]
);
