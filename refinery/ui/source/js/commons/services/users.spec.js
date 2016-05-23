'use strict';

describe('Common.service.userService: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var fakeUuid = 123;
  var fakeResolve = {
    affiliation: 'test',
    email: 'test@test.de',
    firstName: 'test',
    fullName: 'test test',
    lastName: 'test',
    userId: 0,
    userName: 'AnonymousUser',
    userProfileUuid: '123'
  };
  var fakeResponse = {
    affiliation: 'test',
    id: 1,
    resource_uri: '/api/v1/users/123/',
    user: {
      email: 'test@test.de',
      first_name: 'test',
      id: 0,
      last_name: 'test',
      resource_uri: '',
      username: 'AnonymousUser'
    },
    uuid: '123'
  };
  var params = '?format=json';
  var service;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      var settings = $injector.get('settings');

      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('userService');

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApi +
          '/users/' +
          fakeUuid + '/' +
          params
      )
        .respond(200, fakeResponse);
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "get" method', function () {
      expect(typeof service.get).toEqual('function');
    });

    it('should get a value', function () {
      var user;
      var promise = service.get(fakeUuid);

      expect(typeof promise.then).toEqual('function');

      $httpBackend.flush();

      promise.then(function (data) {
        user = data;
      });

      $rootScope.$apply();

      expect(user).toEqual(fakeResolve);
    });
  });
});
