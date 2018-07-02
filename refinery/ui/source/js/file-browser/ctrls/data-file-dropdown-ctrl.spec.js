(function () {
  'use strict';

  describe('Controller: DataFileDropdownCtrl', function () {
    var ctrl;
    var mockUibModal;
    var mockResponse;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $componentController,
      $q,
      $rootScope,
      $uibModal,
      mockParamsFactory,
      settings
    ) {
      settings.djangoApp = { deploymentPlatform: '' };
      scope = $rootScope.$new();
      ctrl = $componentController(
        'rpDataFileDropdown',
        { $scope: scope }
      );
      mockResponse = true;
      mockUibModal = spyOn($uibModal, 'open').and.callFake(function () {
        return {
          result: {
            then: function () {
              return mockResponse;
            }
          }
        };
      });
    }));

    it('DataFileDropdownCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    describe('Test openDataFileModal', function () {
      it('openDataFileModal is method', function () {
        expect(angular.isFunction(ctrl.openDataFileModal)).toBe(true);
      });
      it('calls on mock uibmodal service', function () {
        ctrl.openDataFileModal('add', { });
        expect(mockUibModal).toHaveBeenCalled();
      });
    });
  });
})();
