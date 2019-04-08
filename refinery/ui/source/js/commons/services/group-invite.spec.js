(function () {
  'use strict';
  describe('Invitation V2 Api Unit tests', function () {
    var httpBackend;
    var mockUuid;
    var mockId = 5;
    var refinerySettings;
    var rootScope;
    var service;
    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $httpBackend,
      $rootScope,
      groupInviteService,
      mockParamsFactory,
      settings
    ) {
      service = groupInviteService;
      httpBackend = $httpBackend;
      mockUuid = mockParamsFactory.generateUuid();
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
          '/invitations/'
        ).respond();

        var promise = service.query().$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return a invites array', function () {
        var mockResponse = [{ recipient_email: 'jane_doe@example.com' }];
        var results;
        httpBackend
        .expectGET(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/invitations/'
        ).respond(mockResponse);
        service.query().$promise.then(function (response) {
          results = response[0].recipient_email;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(mockResponse[0].recipient_email);
      });
    });

    describe('resend', function () {
      var params = {
        id: mockId
      };
      it('should return a resolving promise', function () {
        httpBackend
        .expectPATCH(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/invitations/' + mockId + '/', params
        ).respond();
        var promise = service.resend(params).$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return success', function () {
        var results = '';
        httpBackend
        .expectPATCH(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/invitations/' + mockId + '/', params
        ).respond({ status: 200 });
        service.resend(params).$promise.then(function (response) {
          results = response.status;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(200);
      });
    });

    describe('send', function () {
      var params = { recipient_email: 'jane_doe@example.com', group_uuid: mockUuid };
      it('should return a resolving promise', function () {
        httpBackend
        .expectPOST(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/invitations/',
          params
        ).respond();

        var promise = service.send(params).$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return a group', function () {
        var mockResponse = { recipient_email: 'jane_doe@example.com', group_uuid: mockUuid };
        var results = {};
        httpBackend
        .expectPOST(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/invitations/', params
        ).respond(mockResponse);
        service.send(params).$promise.then(function (response) {
          results = response.recipient_email;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(mockResponse.recipient_email);
      });
    });

    describe('revoke', function () {
      it('should return a resolving promise', function () {
        httpBackend
        .expectDELETE(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/invitations/' + mockId + '/'
        ).respond();

        var promise = service.revoke({ id: mockId }).$promise;
        expect(typeof promise.then).toEqual('function');
      });

      it('should return success', function () {
        var results = '';
        httpBackend
        .expectDELETE(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/invitations/' + mockId + '/'
        ).respond({ status: 200 });
        service.revoke({ id: mockId }).$promise.then(function (response) {
          results = response.status;
        });
        httpBackend.flush();
        rootScope.$digest();
        expect(results).toEqual(200);
      });
    });
  });
})();
