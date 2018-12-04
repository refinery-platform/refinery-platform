'use strict';

describe('Controller: AnalysisDeleteModalCtrl', function () {
  var ctrl;
  var mockAnalysis = { uuid: 5, name: 'Analysis 1' };
  var promise;
  var scope;
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(inject(function (
    $componentController,
    $rootScope,
    deletionService,
    $q
  ) {
    scope = $rootScope.$new();
    service = deletionService;
    promise = $q;
    ctrl = $componentController(
      'rpAnalysisDeleteModal',
      { $scope: scope },
      { resolve: { config: { analysis: mockAnalysis } } }
    );
    // when using $componentController, need to call lifecycle hooks
    ctrl.$onInit();
  }));

  it('AnalysisDeleteModalCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.alertType).toEqual('info');
    expect(ctrl.responseMessage).toEqual('');
    expect(ctrl.isDeleting).toEqual(false);
  });

  it('analysis should be initialized', function () {
    expect(ctrl.analysis.uuid).toEqual(mockAnalysis.uuid);
  });

  it('Helper Methods exist', function () {
    expect(angular.isFunction(ctrl.close)).toBe(true);
  });

  describe('Test deleteAnalysis', function () {
    it('deleteAnalysis is method', function () {
      expect(angular.isFunction(ctrl.deleteAnalysis)).toBe(true);
    });

    it('deleteAnalysis calls deletionService', function () {
      var successResponse = false;
      spyOn(service, 'delete').and.callFake(function () {
        var deferred = promise.defer();
        successResponse = true;
        return {
          $promise: deferred.promise
        };
      });
      ctrl.deleteAnalysis();
      expect(successResponse).toEqual(true);
    });
  });
});
