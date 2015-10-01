function refineryDashboardVisWrapper () {
  'use strict';

  function VisWrapperCtrl ($q, pubSub, dashboardTreemapData, treemapContext) {
    this.$q = $q;
    this.pubSub = pubSub;

    // Trigger preloading / precomputing of D3 data for exploration.
    dashboardTreemapData.load();

    this.loading = true;
    this.treemapLoading = $q.defer();

    this.pubSub.on('expandFinished', function () {
      this.ready = true;
    }.bind(this));

    this.pubSub.on('collapsing', function () {
      this.ready = false;
    }.bind(this));

    this.pubSub.on('treemap.loaded', function () {
      this.treemapLoading.resolve();
    }.bind(this));

    // Will be useful in the future when multiple services need to load.
    this.$q.all([this.treemapLoading.promise]).then(function () {
      this.loading = false;
    }.bind(this));
  }

  return {
    bindToController: {
      active: '='
    },
    controller: [
      '$q',
      'pubSub',
      'dashboardTreemapData',
      'treemapContext',
      VisWrapperCtrl
    ],
    controllerAs: 'visWrapper',
    restrict: 'E',
    replace: true,
    scope: {
      active: '='
    },
    templateUrl: '/static/partials/dashboard/directives/vis-wrapper.html'
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryDashboardVisWrapper', [
    refineryDashboardVisWrapper
  ]);
