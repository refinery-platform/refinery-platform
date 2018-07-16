(function () {
  'use strict';

  describe('Common.service.nodesV2Service: unit tests', function () {
    var httpBackend;
    var scope;
    var mockUuid = '';
    var mockFileUuid = '';
    var refinerySettings;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function ($httpBackend,
                                $rootScope,
                                nodesV2Service,
                                mockParamsFactory,
                                settings) {
      httpBackend = $httpBackend;
      refinerySettings = settings;
      scope = $rootScope;
      service = nodesV2Service;
      mockUuid = mockParamsFactory.generateUuid();
      mockFileUuid = mockParamsFactory.generateUuid();
    }));

    describe('Service', function () {
      it('should be defined', function () {
        expect(service).toBeDefined();
      });

      it('should be a method', function () {
        expect(typeof service).toEqual('function');
      });

      it('patch should return a resolving promise', function () {
        var param = { uuid: mockUuid, file_uuid: mockFileUuid };
        var mockResponse = { data: 'success update' };
        httpBackend
          .expectPATCH(
            refinerySettings.appRoot +
            refinerySettings.refineryApiV2 +
            '/nodes/' + mockUuid +
            '/?format=json',
            param
          ).respond(202, mockResponse);

        var results;
        var promise = service.partial_update(param).$promise
          .then(function (response) {
            results = response;
          });

        expect(typeof promise.then).toEqual('function');
        httpBackend.flush();
        scope.$digest();
        expect(results.status).toEqual(mockResponse.status);
        expect(results.data).toEqual(mockResponse.data);
      });
    });
  });
})();
