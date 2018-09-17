(function () {
  'use strict';

  describe('rpUserPermsIcon component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/file-browser/partials/user-perms-icon.html'),
        '<div id="user-perms-icon"></div>'
      );
      $httpBackend
        .whenGET('/api/v1/data_sets/' + $window.dataSetUuid + '/sharing/?format=json')
        .respond(200);

      var scope = $rootScope.$new();
      var template = '<rp-user-perms-icon></rp-user-perms-icon>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('user-perms-icon');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
