'use strict';

angular
  .module('refineryApp')
  .constant('$', window.jQuery)
  .constant('_', window.lodashLatest)
  .constant('d3', window.d3)
  .constant('d3V4', window.d3V4)
  .constant('dagre', window.dagre)
  .constant('c3', window.c3)
  .constant('filesize', window.filesize)
  .constant('humanize', window.humanize)
  .constant('bootbox', window.bootbox)
  .constant('SparkMD5', window.SparkMD5)
  .constant('ListGraphVis', window.ListGraph)
  .constant('angular-intro', window['angular-intro']);
