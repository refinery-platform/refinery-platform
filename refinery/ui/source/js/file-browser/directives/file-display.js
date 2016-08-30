'use strict';

function rpFileDisplay ($) {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/file-display.html',
    link: function () {
      $('#view-selector').select2({ minimumResultsForSearch: -1 });
      $('#view-selector').on('change', function (event) {
        $('#navigation-tabs a[href="#' + event.added.element[0].value + '"]').tab('show');
      });
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileDisplay', ['$', rpFileDisplay]
);
