'use strict';

function DataSetNavAnalyzeCtrl ($rootScope, $timeout, $window, $) {
  $('#filesTab').addClass('active');
  $rootScope.mode = 'analyze';
  $rootScope.showCtrlTab = true;
  $rootScope.mainTabSpanSize = 'col-md-10';
  $rootScope.ctrlTabSpanSize = 'col-md-2';

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
  .controller('refineryDataSetNavAnalyzeCtrl', [
    '$rootScope',
    '$timeout',
    '$window',
    '$',
    DataSetNavAnalyzeCtrl
  ]);
