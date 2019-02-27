(function () {
  'use strict';

  describe('Controller: Twitter Feed Ctrl', function () {
    var ctrl;
    var scope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      homeConfigService
    ) {
      scope = $rootScope.$new();
      service = homeConfigService;
      angular.copy({ twitter_username: 'oldMockUsername' }, service.homeConfig);
      ctrl = $controller('TwitterFeedCtrl', {
        $scope: scope
      });
    }));

    it('TwitterFeedCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('sets view data twitterId', function () {
      expect(ctrl.twitterId).toEqual('');
    });

    it('watches twitterusername and updates twitterId', function () {
      scope.$apply();
      expect(ctrl.twitterId).toEqual(service.homeConfig.twitter_username);
    });
  });
})();
