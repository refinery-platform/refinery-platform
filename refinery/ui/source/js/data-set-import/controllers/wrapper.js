'use strict';

function RefineryImportWrapperCtrl ($scope) {
  $scope.CompletedEvent = function () {
  };

  $scope.ExitEvent = function () {

  };

  $scope.ChangeEvent = function () {
  };

  $scope.BeforeChangeEvent = function () {
  };

  $scope.AfterChangeEvent = function () {
  };

  $scope.IntroOptions = {
    showStepNumbers: false,
    exitOnOverlayClick: true,
    exitOnEsc: true,
    nextLabel: '<strong>NEXT!</strong>',
    prevLabel: '<span style="color:green">Previous</span>',
    skipLabel: 'Exit',
    doneLabel: 'Thanks'
  };
  setTimeout(function () {
    $scope.IntroOptions.steps = [
      {
        element: document.querySelector('#fileUploadStep1'),
        intro: 'Use this tab to import a delimited metadata table or ISA-Archive.',
        position: 'bottom'
      },
      {
        element: document.querySelector('#fileUploadStep2'),
        intro: 'Or use this tab to import any other data file.',
        position: 'bottom'
      },
      {
        element: document.querySelector('#fileUploadStep3'),
        intro: 'Here we can upload a tabular file and specify its formatting.',
        position: 'bottom'
      },
      {
        element: document.querySelector('#fileUploadStep4'),
        intro: 'Select a file containing the metadata table.',
        position: 'bottom'
      },
      {
        element: document.querySelector('#fileUploadStep5'),
        intro: 'Here we can upload a zip archive that complies with ISA' +
        ' standards',
        position: 'bottom'
      },
      {
        element: document.querySelector('#fileUploadStep6'),
        intro: 'Here we can select a local or remote ISA-Archive.'
      }
    ];

    $scope.start();
  }, 1000);
}

angular
  .module('refineryDataSetImport')
  .controller('RefineryImportWrapperCtrl', [
    '$scope',
    RefineryImportWrapperCtrl
  ]);
