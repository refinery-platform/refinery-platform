(function () {
  'use strict';

  describe('Controller: Home Ctrl', function () {
    var ctrl;
    var markdown;
    var scope;
    var window;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $controller,
      MarkdownJS,
      $rootScope,
      $window
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('HomeCtrl', {
        $scope: scope
      });
      markdown = MarkdownJS;
      window = $window;
      window.djangoApp = {
        refineryIntro: 'Test text for the refinery intro paragraph.   Contact.'
      };
    }));

    it('HomeCtrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('sets intro paragraph', function () {
      ctrl.$onInit();
      expect(ctrl.htmlIntros[0]).toEqual(
        markdown.toHTML(window.djangoApp.refineryIntro.split('   ')[0])
      );
      expect(ctrl.htmlIntros[1]).toEqual(
        markdown.toHTML(window.djangoApp.refineryIntro.split('   ')[1])
      );
    });
  });
})();
