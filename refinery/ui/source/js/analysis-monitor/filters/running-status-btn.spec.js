describe('Filter: RunningStatusBtn', function () {

  var filter;

  beforeEach(function () {
    module('refineryApp');
    var params = {

    }

    inject(function ($filter) {
      filter = $filter('analysisMonitorRunningStatusBtn');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  var emptyParam = {};
  var startedParam = {
    'refineryImport': 'RUNNING',
    'galaxyImport': 'PENDING',
    'galaxyAnalysis': 'PENDING',
    'galaxyExport': 'PENDING'
  };
  var partialParam1 = {
    'refineryImport': 'SUCCESS',
    'galaxyImport': 'RUNNING',
    'galaxyAnalysis': 'PENDING',
    'galaxyExport': 'PENDING'
  };
  var partialParam2 = {
    'refineryImport': 'SUCCESS',
    'galaxyImport': 'SUCCESS',
    'galaxyAnalysis': 'RUNNING',
    'galaxyExport': 'PENDING'
  };
  var partialParam3 = {
    'refineryImport': 'SUCCESS',
    'galaxyImport': 'SUCCESS',
    'galaxyAnalysis': 'SUCCESS',
    'galaxyExport': 'RUNNING'
  };
  var completedParam = {
    'refineryImport': 'SUCCESS',
    'galaxyImport': 'SUCCESS',
    'galaxyAnalysis': 'SUCCESS',
    'galaxyExport': 'SUCCESS'
  };

  it('should return correct icon depending on completed state', function () {
      expect(filter(emptyParam))
        .toBe('refinery-spinner analyses-view');
      expect(filter(startedParam))
        .toBe('fa fa-arrow-circle-down');
      expect(filter(partialParam1))
        .toBe('fa fa-arrow-circle-left');
      expect(filter(partialParam2))
        .toBe('fa fa-cog');
      expect(filter(partialParam3))
        .toBe('fa fa-arrow-circle-right');
      expect(filter(completedParam))
        .toBe('fa fa-question-circle');
  });
});
