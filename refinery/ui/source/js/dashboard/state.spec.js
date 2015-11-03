describe('Dashboard.state:', function () {
  'use strict';

  var $location,
      $q,
      $state,
      $templateCache,
      $rootScope,
      $window = {
        location: {
          pathname: '/'
        }
      };

  function mockTemplate(templateRoute, tmpl) {
    $templateCache.put(templateRoute, tmpl || templateRoute);
  }

  beforeEach(function () {
    module(function($provide) {
      $provide.value('$window', $window);
    });
  });

  beforeEach(function () {
    module('refineryApp');
    module('refineryRouter');
    module('refineryDashboard');

    inject(function ($injector) {
      $location = $injector.get('$location');
      $q = $injector.get('$q');
      $state = $injector.get('$state');
      $templateCache = $injector.get('$templateCache');
      $rootScope = $injector.get('$rootScope');
    });
  });

  describe('paths:', function () {
    function goTo(url) {
      $location.url(url);
      $rootScope.$digest();
    }

    beforeEach(function () {
      mockTemplate('/static/partials/dashboard/views/launch-pad.html');
    });

    describe('when empty', function () {
      it('should go to the _launchPad_ state', function () {
        goTo('');
        expect($state.current.name).toEqual('launchPad');
      });
    });

    describe('/', function () {
      it('should go to the _launchPad_ state', function () {
        goTo('/');
        expect($state.current.name).toEqual('launchPad');
      });
    });

    describe('/exploration', function () {
      it('should go to the _launchPad.exploration_ state', function () {
        goTo('/exploration');
        expect($state.current.name).toEqual('launchPad.exploration');
      });
    });

    describe('/preview', function () {
      it('should go to the _launchPad.preview_ state', function () {
        goTo('/preview');
        expect($state.current.name).toEqual('launchPad.preview');
      });
    });

    describe('otherwise', function () {
      it('should go to the _launchPad_ state', function () {
        goTo('/someNonExistentUrl');
        expect($state.current.name).toEqual('launchPad');
      });
    });
  });
});
