(function () {
  'use strict';

  describe('rpToolLaunchWarning component unit test', function () {
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
        $window.getStaticUrl('partials/tool-launch/partials/tool-launch-warning.html'),
        '<div id="tool-launch-warning"></div>'
      );
      $httpBackend = _$httpBackend_;
      var scope = $rootScope.$new();
      var template = '<rp-tool-launch-warning></rp-tool-launch-warning>';
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
      expect(directiveElement.html()).toContain('tool-launch-warning');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
