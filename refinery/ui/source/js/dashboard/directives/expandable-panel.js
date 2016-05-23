'use strict';

function refineryExpandablePanel () {
  return {
    controller: 'ExpandablePanelCtrl',
    restrict: 'A'
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryExpandablePanel', [
    refineryExpandablePanel
  ]);
