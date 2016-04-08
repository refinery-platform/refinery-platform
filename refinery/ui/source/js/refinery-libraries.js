'use strict';

angular
  .module('refineryApp')
  .constant('$', window.jQuery)
  .constant('_', window.lodashLatest)
  .constant('d3', window.d3)
  .constant('ListGraphVis', window.ListGraph);
