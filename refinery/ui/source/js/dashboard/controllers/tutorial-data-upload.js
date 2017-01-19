/**
 * Created by scott on 7/15/16.
 */
'use strict';

function dataUploadTutorialCtrl ($scope, tutorialPageNavigation) {
  var stepText = $scope.refineryTutorialSteps.DATA_UPLOAD_TUTORIAL;

  $scope.dataUploadCompletedEvent = function () {
    tutorialPageNavigation.setData($scope.dataUploadKey, true);
    document.getElementById('import-button').click();
  };

  $scope.dataUploadExitEvent = function () {
  };

  $scope.dataUploadChangeEvent = function () {
  };

  $scope.dataUploadBeforeChangeEvent = function () {

  };

  $scope.dataUploadAfterChangeEvent = function () {
  };

  $scope.startHandler = function () {
    tutorialPageNavigation.setData($scope.dataUploadAutoStart, true);
    window.location = '/';
  };

  $scope.dataUploadIntroOptions = {
    showStepNumbers: false,
    showBullets: false,
    exitOnOverlayClick: true,
    exitOnEsc: true,
    nextLabel: '<strong><i class="fa fa-arrow-right"></i></strong>',
    prevLabel: '<strong><i class="fa fa-arrow-left"></i></strong>',
    skipLabel: '<strong><i class="fa fa-times"></i></strong>',
    doneLabel: 'Proceed to <b>Upload</b> page'
  };

  setTimeout(function () {
    $scope.dataUploadIntroOptions.steps = [
      {
        element: document.querySelector('#dataUploadTutorialStep0'),
        intro: '<div>' + stepText.STEP0 + '</div>',
        position: 'bottom'
      }
    ];
    if (tutorialPageNavigation.getData($scope.dataUploadAutoStart) === 'true') {
      tutorialPageNavigation.setData($scope.dataUploadAutoStart, false);
      $scope.dataUploadStart();
    }
  }, 500);
}

angular
  .module('refineryDashboard')
  .controller('dataUploadTutorialCtrl', [
    '$scope',
    'tutorialPageNavigation',
    dataUploadTutorialCtrl
  ]);
