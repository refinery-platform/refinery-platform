(function () {
  'use strict';
  describe('Group V2 Api Unit tests', function () {
    var httpBackend;
    var mockDataSetUuid;
    var mockUuid;
    var refinerySettings;
    var rootScope;
    var service;
    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $httpBackend,
      $rootScope,
      groupService,
      mockParamsFactory,
      settings
    ) {
      service = groupService;
      httpBackend = $httpBackend;
      mockUuid = mockParamsFactory.generateUuid();
      mockDataSetUuid = mockParamsFactory.generateUuid();
      rootScope = $rootScope;
      refinerySettings = settings;
    }));

    it('service should be defined', function () {
      expect(service).toBeDefined();
    });

    describe('query', function () {
      it('should return a resolving promise', function () {
        httpBackend
        .expectGET(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/'
        ).respond();

        var promise = service.query().$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return a group array', function () {
        var mockResponse = [{ name: 'Test Group' }];
        var results;
        httpBackend
        .expectGET(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/'
        ).respond(mockResponse);
        service.query().$promise.then(function (response) {
          results = response[0].name;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(mockResponse[0].name);
      });
    });

    describe('partial_update', function () {
      var params = {
        data_set_uuid: mockDataSetUuid,
        perm_list: { change: 'True', read: 'True', read_meta: 'True' }
      };
      it('should return a resolving promise', function () {
        httpBackend
        .expectPATCH(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/' + mockUuid + '/', params
        ).respond();
        params.uuid = mockUuid;
        var promise = service.partial_update(params).$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return success', function () {
        var results = '';
        httpBackend
        .expectPATCH(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/' + mockUuid + '/', params
        ).respond({ status: 200 });
        params.uuid = mockUuid;
        service.partial_update(params).$promise.then(function (response) {
          results = response.status;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(200);
      });
    });

    describe('post', function () {
      var params = { name: 'New Test Group' };
      it('should return a resolving promise', function () {
        httpBackend
        .expectPOST(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/',
          params
        ).respond();

        var promise = service.save(params).$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return a group', function () {
        var mockResponse = { name: 'Test Group' };
        var results = {};
        httpBackend
        .expectPOST(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/', params
        ).respond(mockResponse);
        service.save(params).$promise.then(function (response) {
          results = response.name;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(mockResponse.name);
      });
    });

    describe('delete', function () {
      it('should return a resolving promise', function () {
        httpBackend
        .expectDELETE(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/' + mockUuid + '/'
        ).respond();

        var promise = service.delete({ uuid: mockUuid }).$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return success', function () {
        var results = '';
        httpBackend
        .expectDELETE(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/groups/' + mockUuid + '/'
        ).respond({ status: 200 });
        service.delete({ uuid: mockUuid }).$promise.then(function (response) {
          results = response.status;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(200);
      });
    });
  });
})();
