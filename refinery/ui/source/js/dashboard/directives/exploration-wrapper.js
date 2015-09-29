function refineryExplorationWrapper () {
  'use strict';

  function ExplorationWrapperCtrl (pubSub) {
    var that = this;

    this.pubSub = pubSub;

    this.pubSub.on('expandFinished', function () {
      this.ready = true;
      console.log('ready');
    }.bind(this));

    this.pubSub.on('collapsing', function () {
      this.ready = false;
      console.log('ratting');
    }.bind(this));
  }

  return {
    bindToController: {
      active: '='
    },
    controller: ['pubSub', ExplorationWrapperCtrl],
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
