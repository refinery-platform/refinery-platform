'use strict';

function DataSetNavCtrl ($rootScope, $scope, $location, $state, $) {
  var tabNames = [];
  var previousTabAnalyses = false;

  $('.dataSetTabs').each(function (ind, link) {
    tabNames.push(link.getAttribute('ui-sref'));
  });
  $scope.$state = $state;

  // when the url changes this hides/show
  $scope.$on(
    '$stateChangeSuccess',
    function (event, to) {
      var tab = to.name;
      // grabs the list of tab names to avoid collisions with other tabs.
      if (tabNames.indexOf(tab) >= 0) {
        $('.data-set-view-tabs.active').removeClass('active');
        $('.dataSetTabContent').hide();
        $('#' + tab).show();

        if (tab === 'analyses') {
          $rootScope.$broadcast('refinery/analyze-tab-active');
          previousTabAnalyses = true;
        } else {
          if (previousTabAnalyses) {
            $rootScope.$broadcast('refinery/analyze-tab-inactive');
            previousTabAnalyses = false;
          }
        }
      }

      if (tab === 'analyze' || tab === 'visualize' || tab === 'browse') {
        $('.dataSetTabContent').hide();
        $('#files').show();
      }
    }
  );
}

angular
  .module('refineryDataSetNav')
  .controller(
    'DataSetNavCtrl', [
      '$rootScope', '$scope', '$location', '$state', '$', DataSetNavCtrl
    ]
  );
