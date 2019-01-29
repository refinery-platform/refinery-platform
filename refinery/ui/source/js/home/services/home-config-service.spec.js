(function () {
  'use strict';

  describe('Home Config Service', function () {
    var apiService;
    var factory;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $rootScope,
      homeConfigService,
      siteProfileService
    ) {
      factory = homeConfigService;
      apiService = siteProfileService;
      rootScope = $rootScope;
    }));

    it('factory and tools variables should exist', function () {
      expect(factory).toBeDefined();
      expect(factory.homeConfig).toEqual({ aboutMarkdown: '', introMarkdown: '' });
    });

    describe('getConfigs', function () {
      var siteProfileResponse = {
        intro_markdown: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
        'Vivamus ante justo, tempus sit amet lobortis a, dapibus vitae metus.',
        about_markdown: 'Aliquam scelerisque dictum molestie. Proin ac pl magna.',
        twitter_username: 'mockUserName',
        site_videos: []
      };
      var q;

      beforeEach(inject(function (
        $q,
        $rootScope
      ) {
        q = $q;
        spyOn(apiService, 'query').and.callFake(function () {
          var deferred = q.defer();
          deferred.resolve(siteProfileResponse);
          return {
            $promise: deferred.promise
          };
        });

        rootScope = $rootScope;
      }));

      it('getConfigs is a method', function () {
        expect(angular.isFunction(factory.getConfigs)).toBe(true);
      });

      it('getConfigs returns a promise', function () {
        var successData;
        var response = factory.getConfigs().then(function () {
          successData = siteProfileResponse;
        });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(siteProfileResponse);
      });
    });
  });
})();
