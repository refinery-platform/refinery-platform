// Unit test for assay filter
'use strict';

describe('rpAssayFiles directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));

  var compile;
  var rootScope;
  var scope;
  var template;
  var directiveElement;
  var jQuery;
  var $timeout;

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    $templateCache,
    _$_,
    _$timeout_
  ) {
    $templateCache.put(
      '/static/partials/file-browser/partials/assay-filters.html',
      '<div id="attribute-filter">' +
      '<div id="Analysis" class="collapse">' +
      '<div id="attribute-panel-Analysis" class="fa fa-caret-right"></div>' +
      '</div>' +
      '</div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    jQuery = _$_;
    $timeout = _$timeout_;
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
      internal_name: 'Analysis' };

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
    scope.FBCtrl.selectedFieldList = {
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

  it('test generate Filter Drop Selection, ensure updateDomDropdown', function () {
    scope.FBCtrl.analysisFilter.Analysis = undefined;
    scope.FBCtrl.attributeFilter = {
      Title: { facet_obj: [
        {
          count: 129,
          name: 'Device independent graphical display description'
        }, {
          count: 18,
          name: 'Graphics Facilities at Ames Research Center'
        }],
          internal_name: 'Title_Characteristics_92_46_s' } };


    var filters = scope.generateFilterDropSelection();
    $timeout.flush();
    // test filters response
    expect(filters).toEqual(scope.FBCtrl.attributeFilter);
    scope.FBCtrl.analysisFilter.Analysis = [{
      count: 5, name: 'Test Work Analysis' }];
    // test filters merge
    filters = scope.generateFilterDropSelection();
    scope.FBCtrl.attributeFilter.Analysis = scope.FBCtrl.analysisFilter.Analysis;
    expect(filters).toEqual(scope.FBCtrl.attributeFilter);
  });

  it('test broadcast triggers watcher', function () {
    spyOn(scope, 'generateFilterDropSelection');
    scope.$broadcast('rf/attributeFilter-ready');
    expect(scope.generateFilterDropSelection).toHaveBeenCalled();
  });
});
