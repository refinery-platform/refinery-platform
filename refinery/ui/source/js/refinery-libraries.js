'use strict';

angular
  .module('refineryApp')
  .constant('$', window.jQuery)
  .constant('d3', window.d3)
  .constant('dagre', window.dagre)
  .constant('filesize', window.filesize)
  .constant('humanize', window.humanize)
  .constant('bootbox', window.bootbox)
  .constant('SparkMD5', window.SparkMD5)
  .constant('MarkdownJS', window.markdown)
  .constant('YouTube', window.YT)
  .constant('angular-intro', window['angular-intro']);
