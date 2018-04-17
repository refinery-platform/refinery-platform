'use strict';

describe('Controller: GroupEditModalCtrl', function () {
  var ctrl;
  var idService;
  var memberService;
  var promise;
  var service;
  var scope;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $rootScope,
    $componentController,
    groupExtendedService,
    groupMemberService,
    mockParamsFactory,
    $q,
    sessionService
  ) {
    scope = $rootScope.$new();
    idService = sessionService;
    service = groupExtendedService;
    memberService = groupMemberService;
    promise = $q;
    ctrl = $componentController(
      'rpGroupEditModal',
      { $scope: scope },
      { resolve: { config: { group: { uuid: mockParamsFactory.generateUuid() } } } }
    );
  }));

  it('AddGroupCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.alertType).toEqual('info');
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.close)).toBe(true);
  });

  describe('Test leaveGroup', function () {
    it('leaveGroup is method', function () {
      expect(angular.isFunction(ctrl.leaveGroup)).toBe(true);
    });

    it('leaveGroup calls checks authoservice', function () {
      spyOn(idService, 'get').and.returnValue('5');
      var successResponse = true;
      var leftGroup = false;
      spyOn(memberService, 'remove').and.callFake(function () {
        var deferred = promise.defer();
        deferred.resolve(successResponse);
        leftGroup = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.leaveGroup();
      expect(leftGroup).toEqual(true);
    });
  });

  describe('Test deleteGroup', function () {
    it('deleteGroup is method', function () {
      expect(angular.isFunction(ctrl.deleteGroup)).toBe(true);
    });

    it('deleteGroup calls checks authoservice', function () {
      var successResponse = true;
      var groupRemoved = false;
      spyOn(service, 'delete').and.callFake(function () {
        var deferred = promise.defer();
        deferred.resolve(successResponse);
        groupRemoved = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.deleteGroup();
      expect(groupRemoved).toEqual(true);
    });
  });
});
