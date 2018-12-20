'use strict';

function AppCtrl (
  $,
  $scope,
  $rootScope,
  $timeout,
  $window,
  _,
  currentUserService,
  pubSub,
  settings
) {
  this.$window = $window;
  this.jqWindow = $($window);
  this.$ = $;
  this._ = _;
  this.pubSub = pubSub;
  this.settings = settings;

  this.repoMode = settings.djangoApp.repositoryMode;

  this.jqWindow.on(
    'resize orientationchange',
    this._.debounce(
      function () {
        this.pubSub.trigger('resize', {
          width: this.jqWindow.width(),
          height: this.jqWindow.height()
        });
      }.bind(this),
      this.settings.debounceWindowResize
    )
  );

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

  $scope.isOnHomepage = location.pathname === '/';
  $scope.isntOnHomepage = location.pathname !== '/';

  $scope.tutorials_viewed = {
    launchpad: currentUserService.currentUser.launchpad_tut_viewed,
    data_upload: currentUserService.currentUser.data_upload_tut_viewed
  };

  $scope.currentCommit = settings.djangoApp.currentCommit;

  $scope.uuid = currentUserService.currentUser.profile.uuid;

  $scope.dataUploadKey = 'dataUploadTutorialFirstStepViewed';

  $scope.dataUploadAutoStart = 'dataUploadAutoStart';
  $scope.launchpadAutoStart = 'launchpadAutoStart';

  $scope.refineryTutorialSteps = JSON.parse(settings.djangoApp.refineryTutorialSteps);

  var tutorialPopoverUrl = $window.getStaticUrl('partials/tutorials/partials/tutorialPopover.html');
  $scope.dynamicPopover = {
    title: 'Refinery Tutorials',
    content: 'These are some helpful tutorials to guide you through Refinery!',
    templateUrl: tutorialPopoverUrl
  };

  $scope.$watch(
    function () {
      return settings.djangoApp.userId;
    },
    function () {
      // update user info when user changes
      currentUserService.getCurrentUser().then(function () {
        $scope.uuid = currentUserService.currentUser.profile.uuid;
        $scope.tutorials_viewed = {
          launchpad: currentUserService.currentUser.has_viewed_launchpad_tut,
          data_upload: currentUserService.currentUser.has_viewed_data_upload_tut
        };
      });
    }
  );
}

AppCtrl.prototype.globalClick = function ($event) {
  this.pubSub.trigger('globalClick', $event);
};

angular
  .module('refineryApp')
  .controller('AppCtrl', [
    '$',
    '$scope',
    '$rootScope',
    '$timeout',
    '$window',
    '_',
    'currentUserService',
    'pubSub',
    'settings',
    AppCtrl
  ]);
