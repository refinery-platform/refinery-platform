/**
 * Provvis Main Controller
 * @namespace provvisController
 * @desc Main controller for the provvis graph, where code initializes
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .controller('provvisController', provvisController);

  provvisController.$inject = [
    'analysisService',
    'assayFileService',
    '$q',
    '$window'
  ];

  function provvisController (
    analysisService,
    assayFileService,
    $q,
    $window
  ) {
    var studyUuid = $window.externalStudyUuid;
    var dataSetUuid = $window.dataSetUuid;
    var assayUuid = $window.externalAssayUuid;
    var analysesList = [];
    var filesList = [];

    // Ajax calls, grabs the entire analysis list for a particular data set
    var getData = function () {
      var analysisParams = {
        format: 'json',
        limit: 0,
        data_set__uuid: dataSetUuid
      };

      var filesParams = {
        uuid: assayUuid,
        offset: 0
      };
      var analysisPromise = analysisService.query(analysisParams).$promise;
      var filesPromise = assayFileService.query(filesParams).$promise;
      return $q.all([analysisPromise, filesPromise]);
    };

    var launchProvvis = function () {
      getData().then(function (response) {
        analysesList = response[0].objects;
        filesList = response[1];
        console.log('in the then');
        console.log(analysesList);
        console.log(filesList);
        $window.provvis.run(studyUuid, analysesList, filesList);
      });
    };

    launchProvvis();
  }
})();
