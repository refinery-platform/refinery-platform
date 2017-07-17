(function () {
  'use strict';
  describe('Filter: Tool Type Icon', function () {
    var filter;

    beforeEach(function () {
      module('refineryToolLaunch');

      inject(function ($filter) {
        filter = $filter('toolTypeIcon');
      });
    });

    it('filter should exist', function () {
      expect(filter).toBeDefined();
    });

    it('should return correct status depending on VISUALIZATION', function () {
      expect(filter('VISUALIZATION')).toEqual('fa fa-bar-chart');
    });

    it('should return correct status depending on WORKFLOW', function () {
      expect(filter('WORKFLOW')).toEqual('fa fa-cog');
    });

    it('should returns workflow by default', function () {
      expect(filter('ABC')).toEqual('fa fa-cog');
    });
  });
})();
