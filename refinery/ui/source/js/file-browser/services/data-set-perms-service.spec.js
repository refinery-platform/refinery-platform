(function () {
  'use strict';

  describe('Data Set Perms Service', function () {
    var factory;
    var fakeUuid;
    var mocker;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $rootScope,
      dataSetPermsService,
      mockParamsFactory
    ) {
      factory = dataSetPermsService;
      mocker = mockParamsFactory;
      fakeUuid = mockParamsFactory.generateUuid();
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
      var dataSetSharingResult;
      var q;

      beforeEach(inject(function (
        $q,
        $rootScope,
        sharingService
      ) {
        q = $q;
        dataSetSharingResult = {
          share_list: [
            {
              group_id: 100,
              group_name: 'Public',
              perms: {
                change: false,
                read: false
              },
              owner: '',
              user_perms: 'read_meta'
            }
          ],
          slug: null,
          summary: '',
          title: 'Request for Comments (RFC) Test',
          uuid: mocker.generateUuid()
        };
        spyOn(sharingService, 'query').and.callFake(function () {
          var deferred = q.defer();
          deferred.resolve(dataSetSharingResult);
          return {
            $promise: deferred.promise
          };
        });

        rootScope = $rootScope;
      }));

      it('getDataSetSharing is a method', function () {
        expect(angular.isFunction(factory.getDataSetSharing)).toBe(true);
      });

      it('getDataSetSharing returns a promise', function () {
        var successData;
        var response = factory.getDataSetSharing({
          uuid: fakeUuid,
          model: 'data_sets'
        }).then(function (responseData) {
          successData = responseData;
        });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(dataSetSharingResult);
      });
    });
  });
})();
