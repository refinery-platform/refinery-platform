/**
 * Created by scott on 7/21/16.
 */
'use strict';
function dataUploadTutorialCtrl2 (
  $scope, tutorialPageNavigation, updateUserTutorials) {
  var stepText = $scope.refineryTutorialSteps.DATA_UPLOAD_TUTORIAL;

  $scope.dataUploadCompletedEvent = function () {
    var data = {
      uuid: $scope.uuid,
      launchpad_viewed: null,
      collab_viewed: null,
      upload_viewed: true
    };
    updateUserTutorials.updateUser(data);
  };

  $scope.dataUploadExitEvent = function () {
  };

  $scope.dataUploadChangeEvent = function () {
  };

  $scope.dataUploadBeforeChangeEvent = function (event) {
    if (! event.id) {
      document.getElementById('dataUploadTutorial_click').click();
      setTimeout(function () {
        $scope.dataUploadIntroOptions.steps = [
          {
            element: document.querySelector('#dataUploadTutorialStep5'),
            intro: '<div>' + stepText.STEP5 + '</div>',
            position: 'bottom'
          },
          {
            element: document.querySelector('#dataUploadTutorialStep6'),
            intro: '<div>' + stepText.STEP6 + '</div>',
            position: 'bottom'
          }
        ];
        $scope.dataUploadStart();
      }, 500);
    }
  };

  $scope.dataUploadAfterChangeEvent = function () {
  };

  $scope.dataUploadIntroOptions = {
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
    if (tutorialPageNavigation.getData($scope.dataUploadKey) === 'true') {
      tutorialPageNavigation.setData($scope.dataUploadKey, false);
      $scope.dataUploadIntroOptions.steps = [
        {
          element: document.querySelector('#dataUploadTutorialStep1'),
          intro: '<div>' + stepText.STEP1 + '</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep2'),
          intro: '<div>' + stepText.STEP2 + '</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep3'),
          intro: '<div>' + stepText.STEP3 + '</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep4'),
          intro: '<div>' + stepText.STEP4 + '</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep5'),
          intro: 'This never gets reached... just needed as a place holder',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep6'),
          intro: 'This never gets reached... just needed as a place holder',
          position: 'bottom'
        }

      ];
      $scope.dataUploadStart();
    }
  }, 500);
}

angular
  .module('refineryDashboard')
  .controller('dataUploadTutorialCtrl2', [
    '$scope',
    'tutorialPageNavigation',
    'updateUserTutorials',
    dataUploadTutorialCtrl2
  ]);
