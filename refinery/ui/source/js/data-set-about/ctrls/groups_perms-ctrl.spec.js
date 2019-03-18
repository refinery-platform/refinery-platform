'use strict';

describe('Controller: AboutSharingCtrl', function () {
  var ctrl;
  var scope;
  var factory;
  var fakeUuid;
  var mocker;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetAbout'));
  beforeEach(inject(function (
    $rootScope,
    $controller,
    dataSetPermsService,
    mockParamsFactory
  ) {
    scope = $rootScope.$new();
    ctrl = $controller('AboutSharingCtrl', {
      $scope: scope
    });
    factory = dataSetPermsService;
    mocker = mockParamsFactory;
    fakeUuid = mocker.generateUuid();
  }));

  it('AboutSharingCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.dataSetSharing).toEqual({});
    expect(ctrl.ownerName).toEqual('');
  });

  describe('RefreshDataSetSharing', function () {
    it('refreshDataSetStats is method', function () {
      expect(angular.isFunction(ctrl.refreshDataSetSharing)).toBe(true);
    });

    it('RefreshDataSetSharing returns calls Factory and updates mock item', function () {
      var mockDataSets = false;
      spyOn(factory, 'getDataSetSharing').and.callFake(function () {
        return {
          then: function () {
            mockDataSets = true;
          }
        };
      });
      expect(mockDataSets).toEqual(false);
      ctrl.refreshDataSetSharing();
      expect(mockDataSets).toEqual(true);
    });
  });

  describe('getOwnerName', function () {
    var ownerResult;
    var userService;

    beforeEach(inject(function (_userService_) {
      userService = _userService_;
      ownerResult = {
        affiliation: '',
        email: 'guest@example.com',
        firstName: 'Guest',
        fullName: 'Guest',
        lastName: '',
        userId: 2,
        userName: 'guest',
        userProfileUuid: mocker.generateUuid()
      };
    }));

    it('refreshOwnerName is a method', function () {
      expect(angular.isFunction(ctrl.refreshOwnerName)).toBe(true);
    });

    it('refreshOwnerName returns a promise', function () {
      var response = {};
      spyOn(userService, 'get').and.callFake(function () {
        return {
          then: function () {
            response = ownerResult;
          }
        };
      });
      expect(response).toEqual({});
      ctrl.refreshOwnerName({ uuid: fakeUuid });
      expect(response).toEqual(ownerResult);
    });
  });
});
