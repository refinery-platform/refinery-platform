/**
 * Created by scott on 7/18/16.
 */
'use strict';

function collaborationTutorialCtrl ($scope, tutorialPageNavigation) {
  var stepText = $scope.refineryTutorialSteps.COLLABORATION_TUTORIAL;

  $scope.collabCompletedEvent = function () {
    tutorialPageNavigation.setData($scope.collaborationKey, true);
    document.getElementById('collaborationTutorialStep0_click').click();
  };

  $scope.collabExitEvent = function () {
  };

  $scope.collabChangeEvent = function () {
  };

  $scope.collabBeforeChangeEvent = function () {
  };

  $scope.collabAfterChangeEvent = function (event) {
    if (event.id === 'collaborationTutorialStep0') {
      document.getElementsByClassName('introjs-showElement')[0].style[
        'background-color'] = '#525252';
    }
  };
  $scope.startHandler = function () {
    tutorialPageNavigation.setData($scope.collabAutoStart, true);
    window.location = '/';
  };

  $scope.collabIntroOptions = {
    showStepNumbers: false,
    showBullets: false,
    exitOnOverlayClick: false,
    exitOnEsc: false,
    nextLabel: '<strong><i class="fa fa-arrow-right"></i></strong>',
    prevLabel: '<strong><i class="fa fa-arrow-left"></i></strong>',
    skipLabel: '<strong><i class="fa fa-times"></i></strong>',
    doneLabel: 'Proceed to collaboration page'
  };

  setTimeout(function () {
    $scope.collabIntroOptions.steps = [
      {
        element: document.querySelector('#collaborationTutorialStep0'),
        intro: '<div class="text-align-center">' + stepText.STEP0 + '</div>',
        position: 'bottom'
      }
    ];
    if (tutorialPageNavigation.getData($scope.collabAutoStart) === 'true') {
      tutorialPageNavigation.setData($scope.collabAutoStart, false);
      $scope.collaborationStart();
    }
  }, 500);
}

angular
  .module('refineryDashboard')
  .controller('collaborationTutorialCtrl', [
    '$scope',
    'tutorialPageNavigation',
    collaborationTutorialCtrl
  ]);
