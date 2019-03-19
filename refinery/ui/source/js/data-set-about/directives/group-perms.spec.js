(function () {
  'use strict';

  describe('rpDataSetGroupPerms directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetAbout'));

    var compile;
    var scope;

    beforeEach(inject(function (
      $compile,
      $httpBackend,
      $rootScope,
      $templateCache,
      $window,
      mockParamsFactory,
      settings
    ) {
      $window.dataSetUuid = mockParamsFactory.generateUuid();
      $httpBackend.expectGET(
        settings.appRoot + settings.refineryApiV2
        + '/groups/?dataSetUuid=' + $window.dataSetUuid
      ).respond(200, {});

      $templateCache.put(
        $window.getStaticUrl('partials/data-set-about/partials/group-perms.html'),
        '<div class="refinery-header"> ' +
        '<span class="refinery-header-left"> ' +
        '<h3>Group Perms</h3> </span> </div>'
      );
      compile = $compile;
      scope = $rootScope.$new();
    }));
    it('generates the appropriate HTML', function () {
      var template = '<rp-data-set-group-perms></rp-data-set-group-perms>';
      var directiveElement = compile(template)(scope);
      expect(directiveElement.html()).not.toContain('refinery-header-left');
      expect(directiveElement.html()).not.toContain('<h3>Sharing</h3>');
      scope.$digest();
      expect(directiveElement.html()).toContain('refinery-header-left');
      expect(directiveElement.html()).toContain('<h3>Group Perms</h3>');
    });
  });
})();
