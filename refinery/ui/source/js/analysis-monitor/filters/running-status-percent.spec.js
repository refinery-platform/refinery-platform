'use strict';

describe('Filter: AnalysisMonitorRunningStatusPercent', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisMonitorRunningStatusPercent');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  var emptyParam = {};
  var startedParam = {
    refineryImport: {
      state: 'RUNNING',
      percent_done: 50
    },
    galaxyImport: {
      state: 'PENDING'
    },
    galaxyAnalysis: {
      state: 'PENDING'
    },
    galaxyExport: {
      state: 'PENDING'
    }
  };
  var partialParam1 = {
    refineryImport: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyImport: {
      state: 'PROGRESS',
      percent_done: 25
    },
    galaxyAnalysis: {
      state: 'PENDING'
    },
    galaxyExport: {
      state: 'PENDING'
    }
  };
  var partialParam2 = {
    refineryImport: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyImport: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyAnalysis: {
      state: 'PROGRESS',
      percent_done: 35
    },
    galaxyExport: {
      state: 'PENDING'
    }
  };
  var partialParam3 = {
    refineryImport: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyImport: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyAnalysis: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyExport: {
      state: 'PROGRESS',
      percent_done: 78
    }
  };
  var completedParam = {
    refineryImport: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyImport: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyAnalysis: {
      state: 'SUCCESS',
      percent_done: 100
    },
    galaxyExport: {
      state: 'SUCCESS',
      percent_done: 100
    }
  };

  it('should return percent_done depending on completed state', function () {
    expect(filter(emptyParam))
      .toBe('...');
    expect(filter(startedParam))
      .toBe(50);
    expect(filter(partialParam1))
      .toBe(25);
    expect(filter(partialParam2))
      .toBe(35);
    expect(filter(partialParam3))
      .toBe(78);
    expect(filter(completedParam))
      .toBe(0);
  });
});
