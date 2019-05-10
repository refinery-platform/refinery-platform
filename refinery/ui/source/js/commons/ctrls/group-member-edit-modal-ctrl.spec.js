'use strict';

describe('Controller: GroupEditModalCtrl', function () {
  var ctrl;
  var memberService;
  var promise;
  var scope;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $rootScope,
    $componentController,
    groupService,
    mockParamsFactory,
    $q
  ) {
    scope = $rootScope.$new();
    memberService = groupService;
    promise = $q;
    ctrl = $componentController(
      'rpGroupMemberEditModal',
      { $scope: scope },
      { resolve: { config: {
        activeGroup: { manager_group_uuid: mockParamsFactory.generateUuid() },
        activeMember: { user_id: 5 }
      } } }
    );
  }));

  it('AddGroupCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.alertType).toEqual('info');
    expect(ctrl.isLoading).toEqual(false);
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.close)).toBe(true);
  });

  describe('Test demote', function () {
    it('demoteGroup is method', function () {
      expect(angular.isFunction(ctrl.demote)).toBe(true);
    });

    it('demote calls memberService', function () {
      var successResponse = true;
      var memberDemoted = false;
      spyOn(memberService, 'partial_update').and.callFake(function () {
        var deferred = promise.defer();
        deferred.resolve(successResponse);
        memberDemoted = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.demote();
      expect(memberDemoted).toEqual(true);
    });
  });

  describe('Test promote', function () {
    it('promote is method', function () {
      expect(angular.isFunction(ctrl.promote)).toBe(true);
    });

    it('promote calls memberService', function () {
      var successResponse = true;
      var memberPromoted = false;
      spyOn(memberService, 'partial_update').and.callFake(function () {
        var deferred = promise.defer();
        deferred.resolve(successResponse);
        memberPromoted = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.promote();
      expect(memberPromoted).toEqual(true);
    });
  });

  describe('Test remove', function () {
    it('remove is method', function () {
      expect(angular.isFunction(ctrl.remove)).toBe(true);
    });

    it('remove calls memberService', function () {
      var successResponse = true;
      var memberRemoved = false;
      spyOn(memberService, 'partial_update').and.callFake(function () {
        var deferred = promise.defer();
        deferred.resolve(successResponse);
        memberRemoved = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.remove();
      expect(memberRemoved).toEqual(true);
    });
  });
});
