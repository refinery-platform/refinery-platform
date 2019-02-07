(function () {
  'use strict';

  describe('Controller: Collaboration Card Ctrl', function () {
    var ctrl;
    var mockRejectService;
    var mockService;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $controller,
      groupInviteService,
      groupMemberService,
      $q,
      $rootScope
    ) {
      scope = $rootScope.$new();
      mockService = spyOn(groupInviteService, 'resend').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve({});
        return { $promise: deferred.promise };
      });

      mockRejectService = spyOn(groupInviteService, 'revoke').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve({});
        return { $promise: deferred.promise };
      });

      ctrl = $controller('CollaborationCardCtrl', {
        $scope: scope
      });
    }));

    it('CollaborationCardCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Variables should be initialized', function () {
      expect(ctrl.userGroups).toEqual([]);
      expect(ctrl.invitations).toEqual([]);
    });

    describe('openGroupAdd', function () {
      var mockUibModal;
      var responseFlag = false;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
          return { result: { then: function () { responseFlag = true; } } };
        });
      }));

      it('openGroupAdd is method', function () {
        expect(angular.isFunction(ctrl.openGroupAdd)).toBe(true);
      });

      it('openGroupAdd opens a new modal', function () {
        ctrl.openGroupAdd();
        expect(mockUibModal).toHaveBeenCalled();
      });

      it('openGroupAdd resolves promise', function () {
        ctrl.openGroupAdd();
        expect(responseFlag).toEqual(true);
      });
    });

    describe('openGroupEditor', function () {
      var mockUibModal;
      var responseFlag = false;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
          return { result: { then: function () { responseFlag = true; } } };
        });
      }));

      it('openGroupEditor is method', function () {
        expect(angular.isFunction(ctrl.openGroupEditor)).toBe(true);
      });

      it('openGroupEditor opens a new modal', function () {
        ctrl.openGroupEditor();
        expect(mockUibModal).toHaveBeenCalled();
      });

      it('openGroupEditor resolves promise', function () {
        ctrl.openGroupEditor();
        expect(responseFlag).toEqual(true);
      });
    });

    describe('openGroupMemberAdd', function () {
      var mockUibModal;
      var responseFlag = false;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
          return { result: { then: function () { responseFlag = true; } } };
        });
      }));

      it('openGroupMemberAdd is method', function () {
        expect(angular.isFunction(ctrl.openGroupMemberAdd)).toBe(true);
      });

      it('openGroupMemberAdd opens a new modal', function () {
        ctrl.openGroupMemberAdd();
        expect(mockUibModal).toHaveBeenCalled();
      });

      it('openGroupMemberAdd resolves promise', function () {
        ctrl.openGroupMemberAdd();
        expect(responseFlag).toEqual(true);
      });
    });

    describe('openGroupMemberEditor', function () {
      var mockUibModal;
      var responseFlag = false;
      beforeEach(inject(function ($uibModal) {
        mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
          return { result: { then: function () { responseFlag = true; } } };
        });
      }));

      it('openGroupMemberEditor is method', function () {
        expect(angular.isFunction(ctrl.openGroupMemberEditor)).toBe(true);
      });

      it('openGroupMemberEditor opens a new modal', function () {
        ctrl.openGroupMemberEditor();
        expect(mockUibModal).toHaveBeenCalled();
      });

      it('openGroupMemberEditor resolves promise', function () {
        ctrl.openGroupMemberEditor();
        expect(responseFlag).toEqual(true);
      });
    });

    describe('resendInvitation', function () {
      it('resendInvitation is a method', function () {
        expect(angular.isFunction(ctrl.resendInvitation)).toBe(true);
      });

      it('resendInvitation calls invite api', function () {
        ctrl.resendInvitation();
        expect(mockService).toHaveBeenCalled();
      });
    });

    describe('revokeInvitation', function () {
      it('revokeInvitation is a method', function () {
        expect(angular.isFunction(ctrl.revokeInvitation)).toBe(true);
      });

      it('revokeInvitation calls invite api', function () {
        ctrl.revokeInvitation();
        expect(mockRejectService).toHaveBeenCalled();
      });
    });
  });
})();
