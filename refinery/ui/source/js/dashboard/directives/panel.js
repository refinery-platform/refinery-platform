function RefineryPanelCtrl (_$element_, _pubSub_) {
  var wrapper = (function (_$element_, _pubSub_) {
    // Wrapper is called every time a new controller is instanciated and creates
    // a new private scope.
    var ELEMENT = _$element_;
    var PUB_SUB = _pubSub_;

    var originalHeight;

    function RefineryPanel () {

      var that = this;

      function checkHeight () {
        if (!originalHeight) {
          originalHeight = parseInt(ELEMENT.css('height'));
        }
      }

      PUB_SUB.on('dashboardPanelHalve', function (event) {
        checkHeight();
        if (event.id === that.id) {
          ELEMENT.css(
            'height', (event.size || Math.floor(originalHeight / 2)) + 'px'
          );
          if (event.halvish) {
            PUB_SUB.trigger('dashboardPanelHalve', {
              id: event.halvish,
              size: Math.floor(originalHeight / 2)
            });
          }
          PUB_SUB.trigger('dashboardReloadAdapter', {
            adapterId: that.id
          });
        }
      });

      PUB_SUB.on('dashboardPanelFull', function (event) {
        checkHeight();
        if (event.id === that.id) {
          ELEMENT.css('height', originalHeight + 'px');
          if (event.zeroish) {
            PUB_SUB.trigger('dashboardPanelZero', { id: event.zeroish });
          }
          PUB_SUB.trigger('dashboardReloadAdapter', {
            adapterId: that.id
          });
        }
      });

      PUB_SUB.on('dashboardPanelZero', function (event) {
        checkHeight();
        if (event.id === that.id) {
          ELEMENT.css('height', '0px');
        }
      });
    }

    Object.defineProperty(
      RefineryPanel.prototype,
      'originalHeight', {
        enumerable: true,
        get: function () {
          return originalHeight;
        }
    });

    return new RefineryPanel();
  }(_$element_, _pubSub_));

  return wrapper;
}

function refineryPanelDirective () {
  return {
    bindToController: {
      id: '@refineryPanelId'
    },
    controller: 'RefineryPanelCtrl',
    controllerAs: 'panel',
    restrict: 'A'
  };
}

angular
  .module('refineryDashboard')
  .controller('RefineryPanelCtrl', ['$element', 'pubSub', RefineryPanelCtrl])
  .directive('refineryPanel', [
    refineryPanelDirective
  ]);
