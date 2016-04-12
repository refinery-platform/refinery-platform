'use strict';

/** Unit Tests **/

//Global variable for both test and ctrl.
var externalAssayUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

describe('Controller: FileBrowserCtrl', function () {
  var ctrl;
  var scope;
  var factory;
  var $controller;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function ($rootScope, _$controller_, _fileBrowserFactory_) {
    scope = $rootScope.$new();
    $controller = _$controller_;
    ctrl = $controller('FileBrowserCtrl', {
      $scope: scope
    });
    factory = _fileBrowserFactory_;
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

  describe('Update AssayFiles from Factory', function () {
    it('updateAssayFiles is method', function () {
      expect(angular.isFunction(ctrl.updateAssayFiles)).toBe(true);
    });

    it('updateAssayFiles returns promise', function () {
      var mockAssayFiles = false;
      spyOn(factory, 'getAssayFiles').and.callFake(function () {
        return {
          then: function () {
            mockAssayFiles = true;
          }
        };
      });

      expect(typeof ctrl.timerList).toEqual('undefined');
      ctrl.updateAssayFiles();
      expect(typeof ctrl.timerList).toBeDefined();
      expect(mockAssayFiles).toEqual(true);
    });

    it('updateAssayAttributes is  method', function () {
      expect(angular.isFunction(ctrl.updateAssayAttributes)).toBe(true);
    });

    it('updateAssayAttributes returns promise', function () {
      var mockGetAssayAttributes = false;
      spyOn(factory, 'getAssayAttributeOrder').and.callFake(function () {
        return {
          then: function () {
            mockGetAssayAttributes = true;
          }
        };
      });

      ctrl.updateAssayAttributes();
      expect(mockGetAssayAttributes).toEqual(true);
    });

  });

});
