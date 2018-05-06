(function () {
  'use strict';

  describe('Common.service.tools: unit tests', function () {
    var httpBackend;
    var fakeResponse = { name: 'Test Group' };
    var refinerySettings;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $httpBackend,
      settings,
      groupMemberService
    ) {
      refinerySettings = settings;
      httpBackend = $httpBackend;
      service = groupMemberService;
    }));

    describe('Service', function () {
      it('should be defined', function () {
        expect(service).toBeDefined();
      });

      it('should be a method', function () {
        expect(typeof service).toEqual('function');
      });

      it('should return a resolving promise', function () {
        httpBackend
          .expectGET(
            refinerySettings.appRoot +
            refinerySettings.refineryApi +
            '/extended_groups/members/?format=json&id=id'
        ).respond(200, fakeResponse);

        var promise = service.get().$promise;
        expect(typeof promise.then).toEqual('function');
      });
    });
  });
})();
