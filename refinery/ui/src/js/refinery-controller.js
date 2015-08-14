function AppCtrl (pubSub) {
  this.pubSub = pubSub;
}

AppCtrl.prototype.globalClick = function ($event) {
  this.pubSub.trigger('globalClick', $event);
};

angular
  .module('refineryApp')
  .controller('AppCtrl', ['pubSub', AppCtrl]);
