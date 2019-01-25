/**
 * Home Config Service
 * @namespace homeConfigService
 * @desc Service which gets site profile configs
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .factory('homeConfigService', homeConfigService);

  homeConfigService.$inject = [
    'siteProfileService'
  ];

  function homeConfigService (siteProfileService) {
    var homeConfig = {};

    var service = {
      getConfigs: getConfigs,
      homeConfig: homeConfig,
    };

    return service;

    /*
    *----------------------------
    * Method Definitions
    * ---------------------------
    */
    function getConfigs () {
      var configs = siteProfileService.query();
      configs.$promise.then(function (response) {
        console.log(response);
        angular.copy(response, homeConfig);
      });

      return configs.$promise;
    }
  }
})();
