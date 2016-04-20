'use strict';

describe('Controller: FileBrowserCtrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (
    $rootScope, _$controller_, _fileBrowserFactory_, $window
  ) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('FileBrowserCtrl', {
      $scope: scope
    });
    factory = _fileBrowserFactory_;
    $window.externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  }));

  it('FileBrowserCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.assayFiles).toEqual([]);
    expect(ctrl.assayAttributes).toEqual([]);
    expect(ctrl.attributeFilter).toEqual([]);
    expect(ctrl.analysisFilter).toEqual([]);
    expect(ctrl.filesParam).toBeDefined();
  });


  describe('Refresh AssayFiles from Factory', function () {
    it('refreshAssayFiles is method', function () {
      expect(angular.isFunction(ctrl.refreshAssayFiles)).toBe(true);
    });

    it('refreshAssayFiles returns promise', function () {
      var mockAssayFiles = false;
      spyOn(factory, 'getAssayFiles').and.callFake(function () {
        return {
          then: function () {
            mockAssayFiles = true;
          }
        };
      });

      ctrl.refreshAssayFiles();
      expect(mockAssayFiles).toEqual(true);
    });
  });
});
