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

  provvisController.$inject = ['analysisService', '$window'];

  function provvisController (analysisService, $window) {
    var studyUuid = $window.externalStudyUuid;
    var dataSetUuid = $window.dataSetUuid;
    var analysesList = [];

    // Ajax calls, grabs the entire analysis list for a particular data set
    var getAnalysesList = function () {
      var params = {
        format: 'json',
        limit: 0,
        data_set__uuid: dataSetUuid
      };

      analysisService.query(params).$promise.then(function (response) {
        analysesList = response.objects;
        // Empty object is the solr query which is being used to update the
        // provvis graph.
        $window.provvis.run(studyUuid, analysesList, {});
      });
    };

    getAnalysesList();
  }
})();
