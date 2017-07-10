(function () {
  // UNIT TESTING
  'use strict';

  describe('Group Perm Service', function () {
    var deferred;
    var rootScope;
    var service;
    var shareService;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $window,
      groupPermService,
      mockParamsFactory,
      sharingService
    ) {
      service = groupPermService;
      shareService = sharingService;
      $window.dataSetUuid = mockParamsFactory.generateUuid();
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.canUsersGroupEdit).toEqual(false);
    });

    describe('refreshUsersGroupEdit', function () {
      beforeEach(inject(function (sharingService, $q, $rootScope) {
        var responseData = {
          share_list: [
            {
              perms: {
                write: true
              }
            }
          ]
        };
        spyOn(shareService, 'query').and.callFake(function () {
          deferred = $q.defer();
          deferred.resolve(responseData);
          return { $promise: deferred.promise };
        });
        rootScope = $rootScope;
      }));

      it('refreshUsersGroupEdit is a method', function () {
        expect(angular.isFunction(service.refreshUsersGroupEdit)).toBe(true);
      });

      it('refreshUsersGroupEdit returns a promise', function () {
        var response = service.refreshUsersGroupEdit();
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
      });

      it('refreshUsersGroupEdit response is correct', function () {
        var successData;
        service
          .refreshUsersGroupEdit()
          .then(function (responseData) {
            successData = responseData.share_list[0].perms.write;
          });
        rootScope.$apply();
        expect(successData).toEqual(true);
      });
    });
  });
})();
