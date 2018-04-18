'use strict';

describe('Controller: GroupAddModalCtrl', function () {
  var ctrl;
  var scope;
  var service;
  var $q;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $rootScope,
    $controller,
    groupExtendedService,
    _$q_
  ) {
    scope = $rootScope.$new();
    service = groupExtendedService;
    $q = _$q_;
    ctrl = $controller('GroupAddModalCtrl', {
      $scope: scope
    });
  }));

  it('AddGroupCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.alertType).toEqual('info');
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.cancel)).toBe(true);
    expect(angular.isFunction(ctrl.close)).toBe(true);
  });

  describe('Test createGroup', function () {
    it('createGroup is method', function () {
      expect(angular.isFunction(ctrl.createGroup)).toBe(true);
    });

    it('createGroup called correct service', function () {
      ctrl.groupName = 'Test Group 1';
      var successResponse = true;
      var groupNameAccepted = false;
      spyOn(service, 'create').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve(successResponse);
        groupNameAccepted = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.createGroup();
      expect(groupNameAccepted).toEqual(true);
    });
  });
});
