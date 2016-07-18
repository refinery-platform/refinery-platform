'use strict';

function analysisStartConfigService ($window) {
  var vm = this;

  var analysisConfig = {
    studyUuid: $window.externalStudyUuid,
    workflowUuid: null,
    nodeSetUuid: null,
    nodeRelationshipUuid: null,
    name: null
  };

  vm.setAnalysisConfig = function (paramObj) {
    vm.updateAnalysisConfig(paramObj);
  };

  vm.getAnalysisConfig = function () {
    return analysisConfig;
  };

  vm.updateAnalysisConfig = function (paramObj) {
    var keys = Object.keys(paramObj);
    for (var i = keys.length; i--;) {
      analysisConfig[keys[i]] = paramObj[keys[i]];
    }
  };
}

angular
  .module('refineryAnalysisStart')
  .service('analysisStartConfigService', [
    '$window',
    analysisStartConfigService
  ]);
