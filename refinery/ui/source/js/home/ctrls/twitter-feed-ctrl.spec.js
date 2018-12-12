(function () {
  'use strict';

  describe('Controller: Twitter Feed Ctrl', function () {
    var ctrl;
    var scope;
    var window;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $window
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('TwitterFeedCtrl', {
        $scope: scope
      });
      window = $window;
      window.djangoApp = {
        refineryTwitter: 'testId'
      };
    }));

    it('TwitterFeedCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('sets view data twitterId', function () {
      ctrl.$onInit();
      expect(ctrl.twitterId).toEqual(window.djangoApp.refineryTwitter);
    });
  });
})();
