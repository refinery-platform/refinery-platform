'use strict';

function DataSetNavFilesBrowseCtrl ($rootScope, $timeout, $window, $) {
  $('#filesTab').addClass('active');
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
  .controller('refineryDataSetNavFilesBrowseCtrl', [
    '$rootScope',
    '$timeout',
    '$window',
    '$',
    DataSetNavFilesBrowseCtrl
  ]);
