(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolLaunchButtonCtrl', ToolLaunchButtonCtrl);

  function ToolLaunchButtonCtrl () {
    var vm = this;
    vm.tool = {};
    vm.toolType = '';
  }
})();
