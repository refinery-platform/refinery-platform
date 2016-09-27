'use strict';

function launchVisualizationService () {
  var vm = this;
  vm.visualizationSelection = false;

  vm.setVisualizationSelection = function (state) {
    console.log('set visualization selection');
    console.log(state);
    vm.visualizationSelection = true;
  };
}

angular.module('refineryVisualization')
  .service('launchVisualizationService', [
    launchVisualizationService
  ]
);
