'use strict';

function introCtrl ($scope) {
  $scope.CompletedEvent = function () {
    document.getElementById('fileUploadStep0').click();
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
    doneLabel: 'Proceed to upload page'
  };
  setTimeout(function () {
    $scope.IntroOptions.steps = [
      {
        element: document.querySelector('#fileUploadStep0'),
        intro: 'Click here to start uploading files into your Refinery' +
        ' instance',
        position: 'bottom'
      }
    ];

    $scope.start();
  }, 1000);
}

angular
  .module('refineryDashboard')
  .controller('introCtrl', [
    '$scope',
    introCtrl
  ]);
