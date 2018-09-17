/**
 * Created by scott on 7/20/16.
 */
'use strict';

function collaborationTutorialCtrl2 (
  $scope, tutorialPageNavigation, updateUserTutorials) {
  var stepText = $scope.refineryTutorialSteps.COLLABORATION_TUTORIAL;

  $scope.collabCompletedEvent = function () {
    var data = {
      uuid: $scope.uuid,
      launchpad_viewed: null,
      collab_viewed: true,
      upload_viewed: null
    };

    updateUserTutorials.updateUser(data);
  };

  $scope.collabExitEvent = function () {
  };

  $scope.collabChangeEvent = function () {
  };

  $scope.collabBeforeChangeEvent = function () {
  };

  $scope.collabAfterChangeEvent = function () {
  };

  $scope.collabIntroOptions = {
    showStepNumbers: false,
    showBullets: false,
    exitOnOverlayClick: true,
    exitOnEsc: true,
    nextLabel: '<strong><i class="fa fa-arrow-right"></i></strong>',
    prevLabel: '<strong><i class="fa fa-arrow-left"></i></strong>',
    skipLabel: '<strong><i class="fa fa-times"></i></strong>',
    doneLabel: '<strong><i class="fa fa-times"></i></strong>',
    steps: [
      {
        element: document.querySelector('#collaborationTutorialStep1'),
        intro: '<div class="text-align-center">' + stepText.STEP1 + '</div>',
        position: 'right'
      },
      {
        element: document.querySelector('#collaborationTutorialStep2'),
        intro: '<div class="text-align-center">' + stepText.STEP2 + '</div>',
        position: 'left'
      },
      {
        element: document.querySelector('#collaborationTutorialStep3'),
        intro: '<div class="text-align-center">' + stepText.STEP3 + '</div>',
        position: 'left'
      }
    ]
  };

  setTimeout(function () {
    if (tutorialPageNavigation.getData($scope.collaborationKey) === 'true') {
      tutorialPageNavigation.setData($scope.collaborationKey, false);
      $scope.collaborationStart();
    }
  }, 500);
}

angular
  .module('refineryDashboard')
  .controller('collaborationTutorialCtrl2', [
    '$scope',
    'tutorialPageNavigation',
    'updateUserTutorials',
    collaborationTutorialCtrl2
  ]);
