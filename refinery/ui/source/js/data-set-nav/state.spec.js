'use strict';

describe('RefineryDataSetNav.state: unit tests', function () {
  var basePath = '/provenance/whatever/';

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
    // using window because $window is redefined above
    mockTemplate(
      window.getStaticUrl('partials/data-set-nav/partials/data-set-ui-mode-browse.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/data-set-nav/partials/data-set-ui-mode-visualize.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/data-set-nav/partials/data-set-ui-mode-mapping.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/analysis-monitor/partials/analyses-list.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/file-browser/partials/assay-files.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/data-set-nav/partials/analyses-tab.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/data-set-nav/partials/details-tab.html')
    );
    mockTemplate(
      window.getStaticUrl('partials/data-set-nav/partials/files-tab.html')
    );
  });

  describe('state "/data_set/<UUID>/"', function () {
    beforeEach(function () {
      basePath = '/provenance/whatever/';
      $window = {
        location: {
          pathname: basePath
        }
      };
    });

    it('should be "browse" when path is empty', function () {
      goTo('');
      expect($state.current.name).toEqual('browse');
    });

    it('should be "browse" when path is "/"', function () {
      goTo('/');
      expect($state.current.name).toEqual('browse');
    });

    it('should be "files" when path is "/files/"', function () {
      goTo('/files/');
      expect($state.current.name).toEqual('files');
    });

    it('should be "browse" when path is "/files/browse"', function () {
      goTo('/files/browse');
      expect($state.current.name).toEqual('browse');
    });

    it('should be "visualize" when path is "/files/visualize"', function () {
      goTo('/files/visualize');
      expect($state.current.name).toEqual('visualize');
    });

    it('should be "analyses" when path is "/analyses"', function () {
      goTo('/analyses');
      expect($state.current.name).toEqual('analyses');
    });

    it('should be "attributes" when path is "/attributes"', function () {
      goTo('/attributes');
      expect($state.current.name).toEqual('attributes');
    });

    it('should be "details" when path is "/details"', function () {
      goTo('/details');
      expect($state.current.name).toEqual('details');
    });

    it('should be "sharing" when path is "/sharing"', function () {
      goTo('/sharing');
      expect($state.current.name).toEqual('sharing');
    });

    it('should be "browse" when path is not existing', function () {
      goTo('/someNonExistentUrl');
      expect($state.current.name).toEqual('browse');
    });
  });
});
