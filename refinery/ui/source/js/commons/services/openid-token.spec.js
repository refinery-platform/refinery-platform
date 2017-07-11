(function () {
  'use strict';

  describe('openIdTokenService', function () {
    var $httpBackend;
    var service;
    var settings;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (_$httpBackend_, openIdTokenService, _settings_) {
      $httpBackend = _$httpBackend_;
      service = openIdTokenService;
      settings = _settings_;
    }));

    it('should exist', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('should return a resolving promise', function () {
      $httpBackend
        .expectPOST(
          settings.appRoot + settings.refineryApiV2 + '/openid_token/'
        ).respond(200, '');

      var promise = service.save().$promise;
      expect(typeof promise.then).toEqual('function');
    });
  });
})();
