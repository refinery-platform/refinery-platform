function AppCtrl ($window, $, _, pubSub, settings) {
  this.$window = $window;
  this.$ = $;
  this._ = _;
  this.pubSub = pubSub;
  this.settings = settings;

  this.$(this.$window).on(
    'resize orientationchange',
    this._.debounce(
      function () {
        this.pubSub.trigger('resize');
      }.bind(this),
      this.settings.debounceWindowResize
    )
  );
}

AppCtrl.prototype.globalClick = function ($event) {
  this.pubSub.trigger('globalClick', $event);
};

angular
  .module('refineryApp')
  .controller('AppCtrl', [
    '$window',
    '$',
    '_',
    'pubSub',
    'settings',
    AppCtrl
  ]);
