(function () {
  'use strict';

  describe('Common.service.tools: unit tests', function () {
    var httpBackend;
    var mockUuid;
    var refinerySettings;
    var rootScope;
    var service;
    var mockUserId = 5;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $httpBackend,
      $rootScope,
      settings,
      groupMemberService,
      mockParamsFactory
    ) {
      refinerySettings = settings;
      httpBackend = $httpBackend;
      mockUuid = mockParamsFactory.generateUuid();
      rootScope = $rootScope;
      service = groupMemberService;
    }));

    describe('Service', function () {
      it('should be defined', function () {
        expect(service).toBeDefined();
      });

      it('should be a method', function () {
        expect(typeof service).toEqual('function');
      });

      describe('post', function () {
        it('should return a resolving promise', function () {
          var mockResponseStatus = { status: 200 };
          httpBackend
            .expectPOST(
              refinerySettings.appRoot +
              refinerySettings.refineryApiV2 +
              '/groups/' + mockUuid + '/members/?format=json',
              { user_id: mockUserId, uuid: mockUuid }
          ).respond(200, mockResponseStatus);

          var promise = service.update({ user_id: mockUserId, uuid: mockUuid }).$promise;
          expect(typeof promise.then).toEqual('function');
        });

        it('should return a group', function () {
          var mockResponse = { name: 'Test Group' };
          var results = '';
          httpBackend
            .expectPOST(
              refinerySettings.appRoot +
              refinerySettings.refineryApiV2 +
              '/groups/' + mockUuid + '/members/?format=json',
              { user_id: mockUserId, uuid: mockUuid }
          ).respond(200, mockResponse);

          service.update({ uuid: mockUuid, user_id: mockUserId })
            .$promise.then(function (response) {
              results = response.name;
            });
          httpBackend.flush();
          rootScope.$digest();
          expect(results).toEqual(mockResponse.name);
        });
      });
    });
  });
})();
