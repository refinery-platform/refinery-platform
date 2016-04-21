// UNIT TESTING
'use strict';

describe('Is Owner Service', function () {
  var deferred;
  var rootScope;
  var service;
  var validUuid = 'c508e83e-f9ee-4740-b9c7-a7b0e631280f';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (_isOwnerService_) {
    service = _isOwnerService_;
  }));

  it('service and variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.isOwner).toEqual(false);
  });

  describe('getAssayFiles', function () {
    beforeEach(inject(function (dataSetService, $q, $rootScope) {
      var responseData = { objects: [{ is_owner: true }] };
      spyOn(dataSetService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(responseData);
        return { $promise: deferred.promise };
      });
      rootScope = $rootScope;
    }));

    it('refreshDataSetOwner is a method', function () {
      expect(angular.isFunction(service.refreshDataSetOwner)).toBe(true);
    });

    it('refreshDataSetOwner returns a promise', function () {
      var successData;
      var response = service
        .refreshDataSetOwner({ uuid: validUuid })
        .then(function (responseData) {
          successData = responseData.objects[0].is_owner;
        });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(true);
      expect(service.isOwner).toEqual(true);
    });
  });
});
