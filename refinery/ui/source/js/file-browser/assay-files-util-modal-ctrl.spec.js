/** Unit Tests **/

//Global variable for both test and ctrl.
var externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

describe('Controller: Assay Files Util Modal Ctrl', function(){
  var ctrl,
      scope,
      factory;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function($rootScope, _$controller_, _fileBrowserFactory_) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('FileBrowserCtrl', {$scope: scope});
    factory = _fileBrowserFactory_;
  }));

  it('FileBrowserCtrl ctrl should exist', function() {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function() {
    expect(ctrl.assayFiles).toEqual([]);
    expect(ctrl.assayAttributes).toEqual([]);
    expect(ctrl.attributeFilter).toEqual([]);
    expect(ctrl.analysisFilter).toEqual([]);
    expect(ctrl.filesParam).toBeDefined();
  });

  describe('Update AssayFiles from Factory', function(){


    it("refreshAssayFiles is method", function(){
      expect(angular.isFunction(ctrl.refreshAssayFiles)).toBe(true);
    });

    it("refreshAssayFiles returns promise", function(){
      var mockAssayFiles = false;
      spyOn(factory, "getAssayFiles").and.callFake(function() {
        return {
          then: function () {
            mockAssayFiles = true;
          }
        };
      });

      ctrl.refreshAssayFiles();
      expect(mockAssayFiles).toEqual(true);
    });

    it("refreshAssayAttributes is  method", function(){
      expect(angular.isFunction(ctrl.refreshAssayAttributes)).toBe(true);
    });

    it("refreshAssayAttributes returns promise", function(){
      var mockGetAssayAttributes = false;
      spyOn(factory, "getAssayAttributeOrder").and.callFake(function() {
        return {
          then: function () {
            mockGetAssayAttributes = true;
          }
        };
      });

      ctrl.refreshAssayAttributes();
      expect(mockGetAssayAttributes).toEqual(true);
    });

  });

});
