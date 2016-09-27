'use strict';

function VisualizationCtrl (
) {
  var vm = this;

  vm.visualizations = ['IGV'];
  vm.selectedVisualization = { select: null };

  vm.launchVisualization = function () {
    console.log('launcing something here');
  };
}

angular
  .module('refineryVisualization')
  .controller('VisualizationCtrl', [
    VisualizationCtrl
  ]);
