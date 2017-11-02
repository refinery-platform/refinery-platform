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
    var vm = this;
    var studyUuid = $window.externalStudyUuid;
    var dataSetUuid = $window.dataSetUuid;
    var assayUuid = $window.externalAssayUuid;
    var analysesList = [];
    var solrResponse = {};
    vm.getData = getData;
    vm.launchProvvis = launchProvvis;

    activate();

    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
     */
    function activate () {
      vm.launchProvvis();
    }

    // Ajax calls, grabs the analysis & files promises for a particular data set
    function getData () {
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
    }

    function launchProvvis () {
      getData().then(function (response) {
        analysesList = response[0].objects;
        solrResponse = response[1];
        $window.provvis.run(studyUuid, analysesList, solrResponse);
      });
    }
  }
})();
