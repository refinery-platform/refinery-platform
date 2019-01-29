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
    var homeConfig = {
      aboutMarkdown: '',
      introMarkdown: ''
    };

    var service = {
      getConfigs: getConfigs,
      homeConfig: homeConfig
    };

    return service;

    /*
    *----------------------------
    * Method Definitions
    * ---------------------------
    */
    /**
     * @name getConfigs
     * @desc Grab and store site profile configs for the homepage's text
     * @memberOf refineryHome.getConfigs
    **/
    function getConfigs () {
      var configs = siteProfileService.query();
      configs.$promise.then(function (response) {
        homeConfig.aboutMarkdown = response.about_markdown;
        homeConfig.introMarkdown = response.intro_markdown;
      });
      return configs.$promise;
    }
  }
})();
