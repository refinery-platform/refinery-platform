function refineryDashboardVisWrapper () {
  'use strict';

  function VisWrapperCtrl ($q, pubSub, dashboardVisData, treemapContext) {
    this.$q = $q;
    this.pubSub = pubSub;

    // Absolute root node: OWL:Thing
    // Useful for:
    // - EFO
    this.roots = ['http://www.w3.org/2002/07/owl#Thing'];

    // Relative root node for Cell Ontology (CL):
    // this.roots = ['http://purl.obolibrary.org/obo/CL_0000003'];

    this.propertyValue = 'dataSets';

    // Trigger preloading / precomputing of D3 data for exploration.
    dashboardVisData.load(this.roots[0], this.propertyValue);

    var graph = this.$q.defer();
    this.graph = graph.promise;

    var treemap = this.$q.defer();
    this.treemap = treemap.promise;

    var annotations = this.$q.defer();
    this.annotations = annotations.promise;

    dashboardVisData.data
      .then(function (results) {
        this.roots = [results.root];
        graph.resolve({
          graph: results.graph,
          rootIds: [results.root]
        });
        treemap.resolve(results.treemap);
        annotations.resolve(results.annotations);
      }.bind(this))
      .catch(function (error) {
        this.loading = false;
        if (error.number === 0) {
          this.error = true;
        } else {
          this.noData = true;
        }
        console.log(error, this.error, this.noData);
      }.bind(this));

    this.loading = true;
    this.treemapLoading = $q.defer();

    this.pubSub.on('expandFinished', function () {
      this.ready = true;
    }.bind(this));

    this.pubSub.on('vis.show', function () {
      this.ready = true;
      this.invisible = false;
    }.bind(this));

    this.pubSub.on('collapsing', function () {
      this.ready = false;
    }.bind(this));

    this.pubSub.on('vis.hide', function () {
      this.ready = false;
    }.bind(this));

    this.pubSub.on('vis.tempHide', function () {
      this.invisible = true;
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
      'dashboardVisData',
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
