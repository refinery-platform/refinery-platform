'use strict';

describe('Controller: Email Invite Ctrl', function () {
  var ctrl;
  var scope;
  var $controller;
  var $uibModalInstance = { cancel: function () {}, dismiss: function () {} };

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryCollaboration'));
  beforeEach(inject(function (
    $rootScope,
    _$controller_
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('EmailInviteCtrl', {
      $scope: scope,
      $uibModalInstance: $uibModalInstance
    });
  }));

  it('EmailInviteCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.alertType).toEqual('info');
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.cancel)).toBe(true);
    expect(angular.isFunction(ctrl.close)).toBe(true);
    expect(angular.isFunction(ctrl.sendInvite)).toBe(true);
  });
});
