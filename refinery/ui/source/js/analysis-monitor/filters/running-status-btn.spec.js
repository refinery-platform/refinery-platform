'use strict';

describe('Filter: RunningStatusBtn', function () {
  var filter;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisMonitorRunningStatusBtn');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  var emptyParam = {};
  var startedParam = {
    refineryImport: {
      state: 'PROGRESS'
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
      state: 'SUCCESS'
    },
    galaxyImport: {
      state: 'PROGRESS'
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
      state: 'SUCCESS'
    },
    galaxyImport: {
      state: 'SUCCESS'
    },
    galaxyAnalysis: {
      state: 'PROGRESS'
    },
    galaxyExport: {
      state: 'PENDING'
    }
  };
  var partialParam3 = {
    refineryImport: {
      state: 'SUCCESS'
    },
    galaxyImport: {
      state: 'SUCCESS'
    },
    galaxyAnalysis: {
      state: 'SUCCESS'
    },
    galaxyExport: {
      state: 'PROGRESS'
    }
  };
  var completedParam = {
    refineryImport: {
      state: 'SUCCESS'
    },
    galaxyImport: {
      state: 'SUCCESS'
    },
    galaxyAnalysis: {
      state: 'SUCCESS'
    },
    galaxyExport: {
      state: 'SUCCESS'
    }
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
