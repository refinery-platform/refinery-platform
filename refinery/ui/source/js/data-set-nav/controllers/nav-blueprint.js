'use strict';

function DataSetNavBlueprintCtrl ($timeout, $window) {
  if ($window.sizing) {
    $timeout($window.sizing, 0);
  }
}

// This is just a placeholder controller until we re-implement that tab's
// content in Angular.
angular
  .module('refineryDataSetNav')
  .controller('refineryDataSetNavBlueprintCtrl', [
    '$timeout',
    '$window',
    '$',
    DataSetNavBlueprintCtrl
  ]);
