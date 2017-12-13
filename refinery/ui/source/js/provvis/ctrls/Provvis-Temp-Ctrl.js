/**
 * Provvis Temp Controller
 * @namespace ProvvisTempController
 * @desc Hot fix to load the window static url. Using a temp ctrl to avoid
 * merge conflicts with the lastest provvis revisions.
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .controller('ProvvisTempCtrl', ProvvisTempCtrl);

  ProvvisTempCtrl.$inject = [
    'analysisService',
    'assayFileService',
    'd3',
    '$',
    '$q',
    '$scope',
    '$window'
  ];

  function ProvvisTempCtrl (
    analysisService,
    assayFileService,
    d3,
    $,
    $q,
    $scope,
    $window
  ) {
    var vm = this;
    var _studyUuid = $window.externalStudyUuid;
    var _dataSetUuid = $window.dataSetUuid;
    var _assayUuid = $window.externalAssayUuid;
    var analysesList = [];
    var provvisService = $window.provvis;
    var provvisDecl = $window.provvisDecl;
    var provvisInit = $window.provvisInit;
    vm.getData = getData;
    vm.launchProvvis = launchProvvis;

    activate();

     /*
     * -----------------------------------------------------------------------------
     * Watchers
     * -----------------------------------------------------------------------------
     */
    $scope.$on('$destroy', function () {
      if (provvisService.get() instanceof provvisDecl.ProvVis) {
        provvisService.resetVis();
        provvisInit.reset();
      }
    });

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
        data_set__uuid: _dataSetUuid
      };

      var filesParams = {
        uuid: _assayUuid,
        offset: 0,
        data_set_uuid: _dataSetUuid
      };
      var analysisPromise = analysisService.query(analysisParams).$promise;
      var filesPromise = assayFileService.query(filesParams).$promise;
      return $q.all([analysisPromise, filesPromise]);
    }

    function launchProvvis () {
      getData().then(function (response) {
        analysesList = response[0].objects;
        var _solrResponse = response[1];
        provvisService.run(_studyUuid, analysesList, _solrResponse);
      });
    }
  }
})();
