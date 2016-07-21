/**
 * Created by scott on 7/18/16.
 */
'use strict';

function launchpadTutorialCtrl ($scope, updateUserTutorials) {
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

  $scope.launchpadExitEvent = function (event) {
    console.log('here', event.id);
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
      document.getElementsByClassName('introjs-showElement')[0].style[
        'background-color'] = '#525252';
    }
  };

  $scope.launchpadIntroOptions = {
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
    $scope.launchpadIntroOptions.steps = [
      {
        element: document.querySelector('#launchpadStep'),
        intro: '<div class="text-align-center">' +
        'Useful links such as currently running <b>Analyses</b>, ' +
        'login, logout, user profile edit etc.' +
        ' are located here.</div>',
        position: 'bottom'
      },
      {
        element: document.querySelector('#launchpadStep0'),
        intro: '<div class="text-align-center">' +
        'This panel shows you information about <b>DataSets</b> you\'ve' +
        ' successfully uploaded.</div>',
        position: 'right'
      },
      {
        element: document.querySelector('#launchpadStep1'),
        intro: '<div class="text-align-center">' +
        'Here you can search across your <b>Datasets</b> and their defined' +
        ' <b>Metadata</b>.</div>',
        position: 'bottom'
      },
      {
        element: document.querySelector('#launchpadStep2'),
        intro: '<div class="text-align-center">' +
        'You can also sort and filter your <b>Datasets</b> here.</div>',
        position: 'bottom'
      },
      {
        element: document.querySelector('#launchpadStep3'),
        intro: '<div class="text-align-center"><b>Datasets</b> ' +
        'will populate this area once uploaded.</div>',
        position: 'top'
      },
      {
        element: document.querySelector('#launchpadStep4'),
        intro: '<div' +
        ' class="text-align-center">This panel shows you information about ' +
        '<b>Analyses</b> and the status of their execution.<br></div><hr><div' +
        ' class="text-align-center">' +
        '<b>Analyses</b> can have three states: <br>' +
        '<i class="analyses-status fa fa-exclamation-triangle" title=""' +
        ' refinery-tooltip="" refinery-tooltip-container="body" ' +
        'refinery-tooltip-placement="left" data-container="body" ' +
        'data-original-title="Analysis failed."></i> <b>Failure</b>' +
        '<br><i class="analyses-status fa fa-check-circle" title="" ' +
        'refinery-tooltip="" refinery-tooltip-container="body" ' +
        'refinery-tooltip-placement="left" data-container="body" ' +
        'data-original-title="Analysis successful."></i> <b>Success</b>' +
        '<br><i class="analyses-status fa fa-cog" title="" refinery-tooltip="" ' +
        'refinery-tooltip-container="body" refinery-tooltip-placement="left"' +
        ' data-container="body" data-original-title="Analysis is running.">' +
        ' <b>Running</b></i></div>',
        position: 'left'
      },
      {
        element: document.querySelector('#launchpadStep5'),
        intro: '<div class="text-align-center">' +
        'This panel shows you information about <b>Workflows</b> ' +
        'currently imported into this Refinery instance.</div>',
        position: 'left'
      }
    ];
  }, 500);
}

angular
  .module('refineryDashboard')
  .controller('launchpadTutorialCtrl', [
    '$scope',
    'updateUserTutorials',
    launchpadTutorialCtrl
  ]);
