'use strict';

describe('Dashboard.state:', function () {
  var $location;
  var $state;
  var $templateCache;
  var $rootScope;
  var $window = {
    location: {
      pathname: '/'
    }
  };

  function mockTemplate (templateRoute, tmpl) {
    $templateCache.put(templateRoute, tmpl || templateRoute);
  }

  beforeEach(function () {
    module(function ($provide) {
      $provide.value('$window', $window);
    });
  });

  beforeEach(function () {
    module('refineryApp');
    module('refineryRouter');
    module('refineryDashboard');

    inject(function ($injector) {
      $location = $injector.get('$location');
      $state = $injector.get('$state');
      $templateCache = $injector.get('$templateCache');
      $rootScope = $injector.get('$rootScope');
    });
  });

  describe('state', function () {
    function goTo (url) {
      $location.url(url);
      $rootScope.$digest();
    }

    beforeEach(function () {
      // using window because $window is redefined above
      mockTemplate(window.getStaticUrl('partials/dashboard/views/launch-pad.html'));
    });

    it('should be "launchPad" when path is empty', function () {
      goTo('');
      expect($state.current.name).toEqual('launchPad');
    });

    it('should be "launchPad" when path is "/"', function () {
      goTo('/');
      expect($state.current.name).toEqual('launchPad');
    });

    it(
      'should be "launchPad.exploration" when path is "/exploration"',
      function () {
        goTo('/exploration');
        expect($state.current.name).toEqual('launchPad.exploration');
      }
    );

    it('should be "launchPad.preview" when path is "/preview"', function () {
      goTo('/preview');
      expect($state.current.name).toEqual('launchPad.preview');
    });

    it('should be "launchPad" when path is not existing', function () {
      goTo('/someNonExistentUrl');
      expect($state.current.name).toEqual('launchPad');
    });
  });
});
