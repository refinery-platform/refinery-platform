(function () {
  'use strict';

  describe('Primary Group Service', function () {
    var mockApiService;
    var mockGroup = { name: 'Group Lab', id: '101' };
    var refinerySettings;
    var rootScope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $q,
      $rootScope,
      mockParamsFactory,
      primaryGroupService,
      settings,
      userProfileV2Service
    ) {
      settings.djangoApp = {
        userprofileUUID: mockParamsFactory.generateUuid(),
        userprofilePrimaryGroup: 'None',
        userprofilePrimaryGroupID: ''
      };
      refinerySettings = settings;
      mockApiService = spyOn(userProfileV2Service, 'partial_update').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve(mockGroup);
        return {
          $promise: deferred.promise
        };
      });
      rootScope = $rootScope;
      service = primaryGroupService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.primaryGroup.name).toBe(undefined);
      expect(service.primaryGroup.id).toBe(undefined);
    });

    it('setPrimaryGroup is a method', function () {
      expect(angular.isFunction(service.setPrimaryGroup)).toBe(true);
    });

    it('setPrimaryGroup calls correct service', function () {
      service.setPrimaryGroup({ id: mockGroup.id });
      expect(mockApiService).toHaveBeenCalled();
    });

    it('setPrimaryGroup resolves group in mock', function () {
      var successData = {};
      var promiseResponse = service.setPrimaryGroup({ id: mockGroup.id }).then(function (response) {
        successData = response;
      });
      rootScope.$apply();
      expect(typeof promiseResponse.then).toEqual('function');
      expect(successData).toBe(mockGroup);
    });

    it('updatePrimaryGroup updates primary group', function () {
      refinerySettings.djangoApp.userprofilePrimaryGroup = 'New Group';
      refinerySettings.djangoApp.userprofilePrimaryGroupID = 4;
      service.updatePrimaryGroup();
      expect(service.primaryGroup.name).toEqual(
        refinerySettings.djangoApp.userprofilePrimaryGroup
      );
      expect(service.primaryGroup.id).toEqual(
        refinerySettings.djangoApp.userprofilePrimaryGroupID
      );
    });
  });
})();
