'use strict';

describe('rpSelectWorkflow directive unit test', function () {
  beforeEach(module('refineryApp'));
  beforeEach(module('refineryWorkflows'));

  var compile;
  var rootScope;
  var scope;
  var template;
  var directiveElement;

  beforeEach(inject(function (
    _$compile_,
    _$rootScope_,
    $templateCache,
    $httpBackend
  ) {
    $httpBackend
      .expectGET('/api/v1/workflow/?format=json').respond(200, '');

    $templateCache.put(
      '/static/partials/workflows/partials/select-workflow.html',
      '<div id="select-workflow-dropdown"></div>'
    );
    compile = _$compile_;
    rootScope = _$rootScope_;
    scope = rootScope.$new();
    template = '<rp-select-workflow></rp-select-workflow>';
    directiveElement = compile(template)(scope);
    scope.$digest();
  }));

  it('generates the appropriate HTML', function () {
    expect(directiveElement.html()).toContain('select-workflow-dropdown');
    expect(directiveElement.html()).toContain('</div>');
  });
});
