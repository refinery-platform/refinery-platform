(function () {
  // Unit test for assay filter
  'use strict';

  describe('rpAssayFiles directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    var compile;
    var directiveElement;
    var jQuery;
    var scope;
    var service;
    var template;

    beforeEach(inject(function (
      $,
      $compile,
      $rootScope,
      $templateCache,
      $window,
      selectedFilterService
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/file-browser/partials/assay-filters.html'),
        '<div id="attribute-filter">' +
        '<div id="Analysis" class="collapse">' +
        '<div id="attribute-panel-Analysis" class="fa fa-caret-right"></div>' +
        '</div>' +
        '</div>'
      );
      compile = $compile;
      scope = $rootScope.$new();
      service = selectedFilterService;
      jQuery = $;
      template = '<rp-file-browser-assay-filters></rp-file-browser-assay-filters>';
      directiveElement = compile(template)(scope);
      angular.element(document.body).append(directiveElement);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('attribute-filter');
      expect(directiveElement.html()).toContain('attribute-panel-Analysis');
      expect(directiveElement.html()).toContain('</div>');
    });

    it('dropAttributePanel test, add the correct class name', function () {
      var attributeObj = {
        facetObj: [{ name: '1', count: '5' },
          { name: 'Test Work', count: '8' }],
        internal_name: 'Analysis'
      };

      var mockEvent = jQuery.Event('click');  // eslint-disable-line new-cap
      spyOn(mockEvent, 'preventDefault');
      var domElement = angular.element(document.querySelector('#Analysis'));
      var domElementPanel = angular.element(document.querySelector('#attribute-panel-Analysis'));
      // start condition
      expect(domElement.hasClass('in')).toEqual(false);
      expect(domElementPanel.hasClass('fa-caret-right')).toEqual(true);

      // if condition, opening panel (nothing is selected)
      scope.dropAttributePanel(
        mockEvent,
        'Analysis',
        attributeObj
      );
      expect(domElement.hasClass('in')).toEqual(true);
      expect(domElementPanel.hasClass('fa-caret-down')).toEqual(true);

      // else condition, closing panel (nothing is selected)
      scope.dropAttributePanel(
        mockEvent,
        'Analysis',
        attributeObj
      );
      expect(domElement.hasClass('in')).toEqual(false);
      expect(domElementPanel.hasClass('fa-caret-down')).toEqual(false);
      expect(domElementPanel.hasClass('fa-caret-right')).toEqual(true);
    });

    it('test showFields', function () {
      service.attributeSelectedFields = {
        REFINERY_ANALYSIS_UUID_92_46_s: ['N/A', 'Test Workflow', '3']
      };
      // Test default, panel is closed and not selected
      var response = scope.showField(
        'notSelectedAnalysis', 'REFINERY_ANALYSIS_UUID_92_46_s', 'Analysis'
      );
      expect(response).toEqual(false);

      // Panel is closed and item is selected
      response = scope.showField(
        'Test Workflow', 'REFINERY_ANALYSIS_UUID_92_46_s', 'Analysis');
      expect(response).toEqual(true);

      // Test default, Panel is open
      angular.element(document.querySelector('#attribute-panel-Analysis'))
        .removeClass('fa-caret-right');
      angular.element(document.querySelector('#attribute-panel-Analysis'))
        .addClass('fa-caret-down');
      response = scope.showField(
        'notSelectedAnalysis', 'REFINERY_ANALYSIS_UUID_92_46_s', 'Analysis');
      expect(response).toEqual(true);
    });
  });
})();
