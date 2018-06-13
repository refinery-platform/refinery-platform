'use strict';

describe('Controller: GroupMemberAddModalCtrl', function () {
  var ctrl;
  var promise;
  var scope;
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $componentController,
    $q,
    $rootScope,
    dataSetV2Service,
    mockParamsFactory
  ) {
    scope = $rootScope.$new();
    service = dataSetV2Service;
    promise = $q;
    ctrl = $componentController(
      'rpDataSetTransferModal',
      { $scope: scope },
      { resolve: { config: {
        title: 'Test Data Set Title', uuid: mockParamsFactory.generateUuid()
      } } }
    );
  }));

  it('AddGroupCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.alertType).toEqual('info');
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.dataSetTitle).toEqual('');
    expect(ctrl.form.email).toEqual('');
    expect(ctrl.isLoading).toEqual(false);
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.cancel)).toBe(true);
    expect(angular.isFunction(ctrl.close)).toBe(true);
  });

  describe('Test sendTransferRequest', function () {
    it('sendInvite is method', function () {
      expect(angular.isFunction(ctrl.sendTransferRequest)).toBe(true);
    });

    it('sendTransferRequest calls dataSetV2Service', function () {
      var successResponse = true;
      var sentTransfer = false;
      spyOn(service, 'partial_update').and.callFake(function () {
        var deferred = promise.defer();
        deferred.resolve(successResponse);
        sentTransfer = successResponse;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.sendTransferRequest();
      expect(sentTransfer).toEqual(successResponse);
    });
  });
});
