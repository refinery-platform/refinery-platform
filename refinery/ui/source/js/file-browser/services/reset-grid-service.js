angular.module('refineryFileBrowser')
    .service("resetGridService", [
      resetGridService
  ]
);

function resetGridService() {
  var vm = this;

  var resetGridFlag = false;

  vm.setResetGridFlag = function (state) {
    console.log('in setResetGridFlag');
     vm.resetGridFlag = state;
  };

}
