/**
 * Created by scott on 7/21/16.
 */
'use strict';
function dataUploadTutorialCtrl2 (
  $scope, tutorialPageNavigation, updateUserTutorials) {
  var lastEventId = null;

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

  $scope.dataUploadChangeEvent = function (event) {
    lastEventId = event.id;
  };

  $scope.dataUploadBeforeChangeEvent = function (event) {
    console.log(lastEventId);
    if (! event.id) {
      document.getElementById('dataUploadTutorial_click').click();
      setTimeout(function () {
        $scope.dataUploadIntroOptions.steps = [
          {
            element: document.querySelector('#dataUploadTutorialStep7'),
            intro: '<div class="text-align-center">Select local files to import ' +
            'into Refinery</div>',
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
    exitOnOverlayClick: false,
    exitOnEsc: false,
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
          intro: '<div class="text-align-center">Use this tab to import a ' +
          'delimited metadata table or ISA-Archive.</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep2'),
          intro: '<div class="text-align-center">Or use this tab to import any ' +
          'other data file.</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep3'),
          intro: '<div class="text-align-center">Here we can upload a tabular ' +
          'file and specify its formatting.</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep4'),
          intro: '<div class="text-align-center">Select a file containing the ' +
          'metadata table.</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep5'),
          intro: '<div class="text-align-center">Here we can upload a zip ' +
          'archive that complies with ISA standards.</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep6'),
          intro: '<div class="text-align-center">Select a local or ' +
          'remote ISA-Archive.</div>',
          position: 'bottom'
        },
        {
          element: document.querySelector('#dataUploadTutorialStep7'),
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
