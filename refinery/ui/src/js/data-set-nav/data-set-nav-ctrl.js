angular
  .module('refineryDataSetNav')
  .controller('DataSetNavCtrl',
              ['$rootScope','$scope', '$location', '$state', DataSetNavCtrl]);

function DataSetNavCtrl($rootScope, $scope, $location, $state){
  var vm = this;
  var allTabs = $('.tabClicker');
  var tabNames = [];

  $('.tabClicker').each(function(ind, link){
    tabNames.push(link.getAttribute('ui-sref'));
  });
  $scope.$state = $state;

  //when the url changes this hides/show
  $scope.$on('$stateChangeSuccess',function(e, to, toParams, from, fromParams){
    var tab = to.name;
    if(tabNames.indexOf(tab) >= 0){
      $(".tabContent").hide();
      $("#" + tab).show();

      if(tab === 'analyses') {
        $(window).unbind('hashchange');
        $rootScope.$broadcast('refinery/analyze-tab-active');

        $(window).bind('hashchange', function (e) {
          if (location.hash !== "#/analyses/") {
            $rootScope.$broadcast('refinery/analyze-tab-inactive');
            $(this).unbind();
          }
        });
      }
    }
  });
}
