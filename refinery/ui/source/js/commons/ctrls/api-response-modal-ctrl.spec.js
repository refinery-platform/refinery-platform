(function () {
  'use strict';

  describe('Controller: API Response Modal Ctrl', function () {
    var ctrl;

    beforeEach(module('refineryApp'));
    beforeEach(inject(function (
      $rootScope,
      $controller
    ) {
      ctrl = $controller('APIResponseModalCtrl', {
        $scope: $rootScope.$new()
      });
    }));

    it('Sharing Help Popover Details ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.addIcon).toEqual(false);
      expect(ctrl.modalData.introMsg).toEqual(
        'The API responded with the following status and message.'
      );
      expect(ctrl.modalData.header).toEqual('API Response');
      expect(ctrl.modalData.apiStatus).toEqual('');
      expect(ctrl.modalData.apiMsg).toEqual('');
      expect(ctrl.modalData.msgType).toEqual('primary');
    });

    it('closeModal is method', function () {
      expect(angular.isFunction(ctrl.closeModal)).toBe(true);
    });
  });
})();
