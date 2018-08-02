'use strict';

describe('Controller: GroupMemberAddModalCtrl', function () {
  var ctrl;
  var mockGroupName = 'Test Group';
  var promise;
  var scope;
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $componentController,
    $rootScope,
    groupInviteService,
    $q
  ) {
    scope = $rootScope.$new();
    service = groupInviteService;
    promise = $q;
    ctrl = $componentController(
      'rpGroupMemberAddModal',
      { $scope: scope },
      { resolve: { config: { group: { id: 5, name: mockGroupName } } } }
    );
  }));

  it('AddGroupCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.alertType).toEqual('info');
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.form.email).toEqual('');
  });

  it('GroupName should be initialized', function () {
    // when using $componentController, need to call lifecycle hooks
    ctrl.$onInit();
    expect(ctrl.groupName).toEqual(mockGroupName);
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.cancel)).toBe(true);
    expect(angular.isFunction(ctrl.close)).toBe(true);
  });

  describe('Test sendInvite', function () {
    it('sendInvite is method', function () {
      expect(angular.isFunction(ctrl.sendInvite)).toBe(true);
    });

    it('sendInvite calls memberService', function () {
      var successResponse = true;
      var sentInvite = false;
      spyOn(service, 'send').and.callFake(function () {
        var deferred = promise.defer();
        deferred.resolve(successResponse);
        sentInvite = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.sendInvite();
      expect(sentInvite).toEqual(true);
    });
  });
});
