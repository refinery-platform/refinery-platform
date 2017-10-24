'use strict';

describe('RefineryDataSetNav.state: unit tests', function () {
  var basePath = '/data_sets/whatever/';

  var $location;
  var $state;
  var $templateCache;
  var $rootScope;
  var $window = {
    location: {
      pathname: basePath
    }
  };

  function goTo (url) {
    $location.url(url);
    $rootScope.$digest();
  }

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
    module('refineryDataSetNav');

    inject(function ($injector) {
      $location = $injector.get('$location');
      $state = $injector.get('$state');
      $templateCache = $injector.get('$templateCache');
      $rootScope = $injector.get('$rootScope');
    });
  });

  beforeEach(function () {
    mockTemplate(
      window.getStaticUrl('partials/analysis-monitor/views/analyses-tab.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/file-browser/views/files-tab.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/data-set-about/views/details-tab.html')
    );
  });

  describe('state "/data_set/<UUID>/"', function () {
    beforeEach(function () {
      $window = {
        location: {
          pathname: basePath
        }
      };
    });

    it('should be "files" when path is empty', function () {
      goTo('');
      expect($state.current.name).toEqual('files');
    });

    it('should be "files" when path is "/"', function () {
      goTo('/');
      expect($state.current.name).toEqual('files');
    });

    it('should be "files" when path is "/files/"', function () {
      goTo('/files/');
      expect($state.current.name).toEqual('files');
    });

    it('should be "analyses" when path is "/analyses"', function () {
      goTo('/analyses');
      expect($state.current.name).toEqual('analyses');
    });

    it('should be "about" when path is "/about"', function () {
      goTo('/about');
      expect($state.current.name).toEqual('about');
    });

    it('should be "files" when path is not existing', function () {
      goTo('/someNonExistentUrl');
      expect($state.current.name).toEqual('files');
    });
  });
});
