'use strict';

function DataSetNavFilesCtrl ($rootScope, $timeout, $window, $) {
  $rootScope.mode = 'browse';
  $rootScope.showCtrlTab = false;
  $rootScope.mainTabSpanSize = 'col-md-12 no-margin';
  $rootScope.ctrlTabSpanSize = '';

  // calls global resizing function implemented in base.html to rescale
  // height of scrollable elements timeout is needed to execute after DOM
  // changes
  if ($window.sizing) {
    $timeout($window.sizing, 0);
  }

  $($window).trigger('refinery/floatThead/reflow');
}

angular
  .module('refineryDataSetNav')
  .controller('refineryDataSetNavFilesCtrl', [
    '$rootScope',
    '$timeout',
    '$window',
    '$',
    DataSetNavFilesCtrl
  ]);
