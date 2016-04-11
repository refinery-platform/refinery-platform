'use strict';

angular
  .module('refineryApp')
  .constant('$', window.jQuery)
  .constant('_', window.lodashLatest)
  .constant('d3', window.d3)
  .constant('c3', window.c3)
  .constant('humanize', window.humanize)
  .constant('ListGraphVis', window.ListGraph);
