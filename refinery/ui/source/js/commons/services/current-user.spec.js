(function () {
  'use strict';

  describe('Current User Service', function () {
    var httpBackend;
    var rootScope;
    var service;
    var refinerySettings;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $httpBackend,
      $rootScope,
      currentUserService,
      settings
    ) {
      httpBackend = $httpBackend;
      rootScope = $rootScope;
      service = currentUserService;
      refinerySettings = settings;
    }));

    it('service should exist', function () {
      expect(service).toBeDefined();
    });

    it('anonUser variables should exist', function () {
      expect(service.anonUser.id).toEqual(null);
      expect(service.anonUser.username).toEqual('');
      expect(service.anonUser.first_name).toEqual('');
      expect(service.anonUser.last_name).toEqual('');
      expect(service.anonUser.has_viewed_collaboration_tut).toEqual(false);
      expect(service.anonUser.has_viewed_data_upload_tut).toEqual(false);
      expect(service.anonUser.has_viewed_launchpad_tut).toEqual(false);
      expect(service.anonUser.profile.uuid).toEqual('');
      expect(service.anonUser.profile.primary_group.id).toEqual(null);
      expect(service.anonUser.profile.primary_group.name).toEqual('');
    });

    it('currentUser should initialize to anonUser', function () {
      expect(service.currentUser).toEqual(service.anonUser);
    });

    describe('getCurrentUser', function () {
      it('getCurrentUser is a method', function () {
        expect(angular.isFunction(service.getCurrentUser)).toBe(true);
      });

      it('getCurrentUser makes a patch request for non-anon-users', function () {
        refinerySettings.djangoApp.userId = 1;
        var mockResponse = {
          id: 1,
          username: 'guest1',
          first_name: 'Jane',
          last_name: 'Doe',
          profile: {
            uuid: '',
            primary_group: { id: null, name: '' }
          },
          has_viewed_collaboration_tut: false,
          has_viewed_data_upload_tut: false,
          has_viewed_launchpad_tut: false
        };

        httpBackend.expectGET(
          refinerySettings.appRoot + refinerySettings.refineryApiV2 + '/user/'
        ).respond(200, mockResponse);

        service.getCurrentUser();
        httpBackend.flush();
        rootScope.$digest();
        expect(service.currentUser.id).toEqual(mockResponse.id);
      });

      it('getCurrentUser sets currentUser to anonUser', function () {
        refinerySettings.djangoApp.userId = null;

        service.getCurrentUser();
        expect(service.currentUser.id).toEqual(service.anonUser.id);
      });
    });
  });
})();
