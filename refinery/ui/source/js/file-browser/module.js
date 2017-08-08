/**
 * Refinery File Browser
 * @namespace refineryFileBrowser
 * @desc Data Set file browser (files tab) module. Main view on the files
 * tab and handles the functionality of data set table and attribute filter.
 * Works with refineryToolLaunch to handle tool panel.
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryFileBrowser', [
      'dndLists',
      'ui.grid',
      'ui.grid.autoResize',
      'ui.grid.infiniteScroll',
      'ui.grid.pinning',
      'ui.grid.resizeColumns',
      'ui.select'
    ]);
})();
