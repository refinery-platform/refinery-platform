/**
 * Created by scott on 7/18/16.
 */
'use strict';

function launchpadTutorialCtrl ($scope, updateUserTutorials, tutorialPageNavigation) {
  var stepText = $scope.refineryTutorialSteps.LAUNCHPAD_TUTORIAL;

  var data = {
    uuid: $scope.uuid,
    launchpad_viewed: true,
    collab_viewed: null,
    upload_viewed: null
  };

  $scope.launchpadCompletedEvent = function () {
    document.getElementById('launchpadStep1Fix').style['min-width'] = null;
    updateUserTutorials.updateUser(data);
  };

  $scope.launchpadExitEvent = function () {
    document.getElementById('launchpadStep1Fix').style['min-width'] = null;
  };

  $scope.launchpadChangeEvent = function (event) {
    if (event.id === 'launchpadStep1') {
      document.getElementById('launchpadStep1Fix').style['min-width'] = '100%';
    }
  };

  $scope.launchpadBeforeChangeEvent = function () {
  };

  $scope.launchpadAfterChangeEvent = function (event) {
    if (event.id === 'launchpadStep') {
      document.getElementsByClassName('introjs-helperLayer')[0].style['background-color'] =
         'rgba(255, 255, 255, 0.25)';
    }
  };

  $scope.startHandler = function () {
    tutorialPageNavigation.setData($scope.launchpadAutoStart, true);
    window.location = '/';
  };

  $scope.launchpadIntroOptions = {
    showStepNumbers: false,
    showBullets: false,
    exitOnOverlayClick: true,
    exitOnEsc: true,
    nextLabel: '<strong><i class="fa fa-arrow-right"></i></strong>',
    prevLabel: '<strong><i class="fa fa-arrow-left"></i></strong>',
    skipLabel: '<strong><i class="fa fa-times"></i></strong>',
    doneLabel: '<strong><i class="fa fa-times"></i></strong>'
  };

  setTimeout(function () {
    $scope.launchpadIntroOptions.steps = [
      {
        element: document.querySelector('#launchpadStep'),
        intro: '<div>' + stepText.STEP0 + '</div>',
        position: 'bottom'
      },
      {
        element: document.querySelector('#launchpadStep0'),
        intro: '<div>' + stepText.STEP1 + '</div>',
        position: 'right'
      },
      {
        element: document.querySelector('#launchpadStep1'),
        intro: '<div>' + stepText.STEP2 + '</div>',
        position: 'bottom'
      },
      {
        element: document.querySelector('#launchpadStep2'),
        intro: '<div>' + stepText.STEP3 + '</div>',
        position: 'bottom'
      },
      {
        element: document.querySelector('#launchpadStep3'),
        intro: '<div>' + stepText.STEP4 + '</div>',
        position: 'top'
      },
      {
        element: document.querySelector('#launchpadStep4'),
        intro: '<div' +
        '>' + stepText.STEP5.a + '<br></div><hr><div' +
        '>' + stepText.STEP5.b +
        '<br><i class="analyses-status fa fa-exclamation-triangle" title=""' +
        'refinery-tooltip="" refinery-tooltip-container="body" ' +
        'refinery-tooltip-placement="left" data-container="body" ' +
        'data-original-title="Analysis failed."></i>' + stepText.STEP5.c +
        '<br><i class="analyses-status fa fa-check-circle" title="" ' +
        'refinery-tooltip="" refinery-tooltip-container="body" ' +
        'refinery-tooltip-placement="left" data-container="body" ' +
        'data-original-title="Analysis successful."></i> ' + stepText.STEP5.d +
        '<br><i class="analyses-status fa fa-cog" title="" ' +
        'refinery-tooltip="" refinery-tooltip-container="body" ' +
        'refinery-tooltip-placement="left"' +
        ' data-container="body" data-original-title="Analysis is running."></i> ' +
         stepText.STEP5.e + '</div>',
        position: 'left'
      },
      {
        element: document.querySelector('#launchpadStep5'),
        intro: '<div>' + stepText.STEP6 + '</div>',
        position: 'left'
      }
    ];

    if (tutorialPageNavigation.getData($scope.launchpadAutoStart) === 'true') {
      tutorialPageNavigation.setData($scope.launchpadAutoStart, false);
      $scope.launchpadStart();
    }
  }, 500);
}

angular
  .module('refineryDashboard')
  .controller('launchpadTutorialCtrl', [
    '$scope',
    'updateUserTutorials',
    'tutorialPageNavigation',
    launchpadTutorialCtrl
  ]);
