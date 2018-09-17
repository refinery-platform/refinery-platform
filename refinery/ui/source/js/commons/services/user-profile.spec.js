'use strict';

describe('Common.service.userProfileV2Service: unit tests', function () {
  var httpBackend;
  var scope;
  var mockUuid = '';
  var service;
  var refinerySettings;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $httpBackend,
    $rootScope,
    userProfileV2Service,
    mockParamsFactory,
    settings
  ) {
    refinerySettings = settings;
    httpBackend = $httpBackend;
    scope = $rootScope;
    service = userProfileV2Service;
    mockUuid = mockParamsFactory.generateUuid();
  }));

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('patch should return a resolving promise', function () {
      var param = { uuid: mockUuid, primary_group: '101' };
      var mockResponse = { data: 'success update' };
      httpBackend
        .expectPATCH(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/user_profile/' + mockUuid +
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
