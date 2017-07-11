(function () {
  'use strict';

  describe('Common.service.tools: unit tests', function () {
    var httpBackend;
    var fakeResponse = { data: 'success' };
    var mocker;
    var refinerySettings;
    var rootScope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $httpBackend,
      mockParamsFactory,
      $rootScope,
      settings,
      toolsService
    ) {
      refinerySettings = settings;
      httpBackend = $httpBackend;
      mocker = mockParamsFactory;
      rootScope = $rootScope;
      service = toolsService;
    }));

    describe('Service', function () {
      it('should be defined', function () {
        expect(service).toBeDefined();
      });

      it('should be a method', function () {
        expect(typeof service).toEqual('function');
      });

      it('should return a resolving promise', function () {
        var postParams = {
          tool_definition_uuid: mocker.generateUuid(),
          file_relationships: '[' + mocker.generateUuid() + mocker.generateUuid() + ']'
        };

        httpBackend
          .expectPOST(
            refinerySettings.appRoot +
            refinerySettings.refineryApiV2 +
            '/tools',
          postParams
        ).respond(200, fakeResponse);

        var promise = service.save(postParams).$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return a success status', function () {
        var postParams = {
          tool_definition_uuid: mocker.generateUuid(),
          file_relationships: '[' + mocker.generateUuid() + mocker.generateUuid() + ']'
        };

        httpBackend
          .expectPOST(
            refinerySettings.appRoot +
            refinerySettings.refineryApiV2 +
            '/tools/',
          postParams
        ).respond(200, fakeResponse);

        var results;
        service.save(postParams).$promise
          .then(function (response) {
            results = response;
          });
        httpBackend.flush();
        rootScope.$digest();
        expect(results.data).toEqual(fakeResponse.data);
      });

      it('should return a failed status', function () {
        var postParams = {
          tool_definition_uuid: '',
          file_relationships: '[' + mocker.generateUuid() + mocker.generateUuid() + ']'
        };

        fakeResponse.data = 'Failed, missing tool_definition_uuid';

        httpBackend
          .expectPOST(
            refinerySettings.appRoot +
            refinerySettings.refineryApiV2 +
            '/tools/',
          postParams
        ).respond(400, fakeResponse);

        var results;
        service.save(postParams).$promise
          .catch(function (response) {
            results = response;
          });
        httpBackend.flush();
        rootScope.$digest();
        expect(results.data.data).toEqual(fakeResponse.data);
      });
    });
  });
})();
