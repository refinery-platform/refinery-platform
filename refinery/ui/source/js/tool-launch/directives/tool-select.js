'use strict';
angular.module('refineryToolLaunch').component('rpToolSelect', {
  templateUrl: '/static/partials/tool-launch/partials/tool-select.html',
  controller: ToolSelectCtrl
});


function ToolSelectCtrl () {
  console.log('in the tool select ctrl');
  var vm = this;
  vm.toolList = [
    { name: 'Workflow 1' },
    { name: 'Workflow 2' },
    { name: 'Visualization 1' }
  ];
  vm.selectedTool = { select: null };

  vm.updateSelectedTool = function () {
    console.log(vm.selectedTool.select);
  };
}
