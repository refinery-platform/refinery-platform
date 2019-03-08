'use strict';

function AppCtrl ($, $scope, $rootScope, $timeout, $window, _, settings) {
  this.$window = $window;
  this.jqWindow = $($window);
  this.$ = $;
  this._ = _;
  this.settings = settings;

  this.repoMode = settings.djangoApp.repositoryMode;

  $rootScope.$on(
    '$stateChangeSuccess',
    function (e, toState, toParams, fromState) {
      $timeout(function () {
        if (fromState.url !== '^' && $window.ga) {
          $window.ga(
            'send',
            'pageview',
            $window.location.pathname + $window.location.hash
          );
        }
      }, 0);
    }
  );

  $rootScope.$on('$reloadlessStateChangeSuccess', function () {
    $timeout(function () {
      if ($window.ga) {
        var hash = $window.location.hash;
        var path = $window.location.pathname;

        if (hash.length > 2) {
          path = path + hash;
        }

        $window.ga(
          'send',
          'pageview',
          path
        );
      }
    }, 0);
  });

  $scope.isOnHomepage = location.pathname === '/';
  $scope.isntOnHomepage = location.pathname !== '/';

  $scope.tutorials_viewed = {
    data_upload: settings.djangoApp.data_upload_tut_viewed
  };

  $scope.currentCommit = settings.djangoApp.currentCommit;

  $scope.uuid = settings.djangoApp.userprofileUUID;

  $scope.dataUploadKey = 'dataUploadTutorialFirstStepViewed';

  $scope.dataUploadAutoStart = 'dataUploadAutoStart';

  $scope.refineryTutorialSteps = JSON.parse(settings.djangoApp.refineryTutorialSteps);

  var tutorialPopoverUrl = $window.getStaticUrl('partials/tutorials/partials/tutorialPopover.html');
  $scope.dynamicPopover = {
    title: 'Refinery Tutorials',
    content: 'These are some helpful tutorials to guide you through Refinery!',
    templateUrl: tutorialPopoverUrl
  };
}

angular
  .module('refineryApp')
  .controller('AppCtrl', [
    '$',
    '$scope',
    '$rootScope',
    '$timeout',
    '$window',
    '_',
    'settings',
    AppCtrl
  ]);
