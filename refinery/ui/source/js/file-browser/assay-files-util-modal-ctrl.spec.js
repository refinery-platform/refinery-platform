/** Unit Tests **/

//Global variable for both test and ctrl.
var externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

describe('Controller: Assay Files Util Modal Ctrl', function(){
  var ctrl,
      scope,
      factory;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function( $rootScope, _$controller_, _fileBrowserFactory_) {
    scope = $rootScope.$new();
    //Create mock version of dependency
    var $uibModalInstance = { close: function() {} };
    $controller = _$controller_;
    ctrl = $controller(
      'AssayFilesUtilModalCtrl',
      {
        $scope: scope,
        $uibModalInstance: $uibModalInstance
      });
    factory = _fileBrowserFactory_;
  }));

  it('AssayFilesUtilModalCtrl ctrl should exist', function() {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function() {
    expect(ctrl.assayAttributeOrder ).toEqual([]);
  });

  describe('Update AssayFilter from Factory', function(){


    it("refreshAssayFilter is method", function(){
      expect(angular.isFunction(ctrl.refreshAssayAttributes)).toBe(true);
    });

    it("refreshAssayFiles returns promise", function(){
      var mockAssayFiles = false;
      spyOn(factory, "getAssayAttributeOrder").and.callFake(function() {
        return {
          then: function () {
            mockAssayAttributes = true;
          }
        };
      });

      ctrl.refreshAssayAttributes();
      expect(mockAssayAttributes).toEqual(true);
    });

    it("updateAssayAttributes is  method", function(){
      expect(angular.isFunction(ctrl.updateAssayAttributes)).toBe(true);
    });

    it("updateAssayAttributes returns promise", function(){
      var mockGetAssayAttributes = false;
      spyOn(factory, "postAssayAttributeOrder").and.callFake(function() {
        return {
          then: function () {
            mockPostAssayAttributes = true;
          }
        };
      });

      ctrl.updateAssayAttributes();
      expect(mockPostAssayAttributes).toEqual(true);
    });

  });

});
