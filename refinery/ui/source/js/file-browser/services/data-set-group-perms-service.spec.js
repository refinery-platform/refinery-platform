(function () {
  'use strict';

  describe('Data Set Group Perms Service', function () {
    var factory;
    var fakeUuid;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $rootScope,
      dataSetGroupPermsService
    ) {
      factory = dataSetGroupPermsService;
      rootScope = $rootScope;
    }));

    it('factory and tools variables should exist', function () {
      expect(factory).toBeDefined();
      expect(factory.dataSetSharing).toEqual({});
      expect(factory.groupList).toEqual([]);
      expect(factory.owner).toEqual('');
      expect(factory.ownerName).toEqual('');
    });

    describe('refreshDataSetPerms', function () {
      var groupsApiResponse;
      var q;

      beforeEach(inject(function (
        $q,
        $rootScope,
        groupService
      ) {
        q = $q;
        groupsApiResponse = [
          {
            id: 100,
            name: 'Public',
            perms: {
              change: false,
              read: false
            }
          }
        ];

        spyOn(groupService, 'query').and.callFake(function () {
          var deferred = q.defer();
          deferred.resolve(groupsApiResponse);
          return {
            $promise: deferred.promise
          };
        });

        rootScope = $rootScope;
      }));

      it('getDataSetGroupPerms is a method', function () {
        expect(angular.isFunction(factory.getDataSetGroupPerms)).toBe(true);
      });

      it('getDataSetGroupPerms returns a promise', function () {
        var successData;
        var response = factory.getDataSetGroupPerms({
          data_set_uuid: fakeUuid
        }).then(function (responseData) {
          successData = responseData;
        });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(groupsApiResponse);
      });
    });
  });
})();
