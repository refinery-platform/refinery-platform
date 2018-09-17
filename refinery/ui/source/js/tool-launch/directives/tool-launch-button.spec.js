(function () {
  'use strict';

  describe('rpToolLaunchButton component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;
    var $httpBackend;

    beforeEach(inject(function (
      _$httpBackend_,
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/partials/tool-launch-button.html'),
        '<button id="tool-launch-button"></button>'
      );
      $httpBackend = _$httpBackend_;
      var scope = $rootScope.$new();
      var template = '<rp-tool-launch-button></rp-tool-launch-button>';
      directiveElement = $compile(template)(scope);
      $httpBackend.whenGET('/api/v1/user_authentication/?format=json').respond(
        {
          id: -1,
          is_admin: false,
          is_logged_in: false,
          resource_uri: '',
          username: 'AnonymousUser'
        }
      );
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-launch-button');
      expect(directiveElement.html()).toContain('</button>');
    });
  });
})();
