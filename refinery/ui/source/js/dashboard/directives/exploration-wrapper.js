function refineryExplorationWrapper () {
  'use strict';

  function ExplorationWrapperCtrl ($q, pubSub) {
    var that = this;

    this.$q = $q;
    this.pubSub = pubSub;

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
    controller: ['$q', 'pubSub', ExplorationWrapperCtrl],
    controllerAs: 'explorationWrapper',
    restrict: 'E',
    replace: true,
    scope: {
      active: '='
    },
    templateUrl: '/static/partials/dashboard/directives/exploration-wrapper.html'
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryExplorationWrapper', [
    refineryExplorationWrapper
  ]);
