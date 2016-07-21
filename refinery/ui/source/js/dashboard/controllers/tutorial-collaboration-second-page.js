/**
 * Created by scott on 7/20/16.
 */
'use strict';

function collaborationTutorialCtrl2 (
  $scope, tutorialPageNavigation, updateUserTutorials) {
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
    exitOnOverlayClick: false,
    exitOnEsc: false,
    nextLabel: '<strong><i class="fa fa-arrow-right"></i></strong>',
    prevLabel: '<strong><i class="fa fa-arrow-left"></i></strong>',
    skipLabel: '<strong><i class="fa fa-times"></i></strong>',
    doneLabel: '<strong><i class="fa fa-times"></i></strong>',
    steps: [
      {
        element: document.querySelector('#collaborationTutorialStep1'),
        intro: '<div class="text-align-center"><b>Groups</b> that you are a ' +
        'member of appear in this panel.</div>',
        position: 'right'
      },
      {
        element: document.querySelector('#collaborationTutorialStep2'),
        intro: '<div class="text-align-center"><b>Members</b> of the <b>Group</b>' +
        ' highlighted to the left are listed here.</div>',
        position: 'left'
      },
      {
        element: document.querySelector('#collaborationTutorialStep3'),
        intro: '<div class="text-align-center">Here you can see your ' +
        '<b>Pending Invitations</b></div>',
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
