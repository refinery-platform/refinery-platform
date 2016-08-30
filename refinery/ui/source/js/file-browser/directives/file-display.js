'use strict';

function rpFileDisplay ($, $window) {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/file-display.html',
    link: function () {
      $('#view-selector').select2({ minimumResultsForSearch: -1 });
      $('#view-selector').on('change', function (event) {
        $('#navigation-tabs a[href="#' + event.added.element[0].value + '"]').tab('show');
        // Temp code to render pivot Matrix view
        if (event.val === 'pivot-view-tab') {
          $window.pivotMatrixView.render();
        } else if (event.val === 'provenance-view-tab') {
          console.log('in provenance-view-tab');
        }
      });
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileDisplay', ['$', '$window', rpFileDisplay]
);
