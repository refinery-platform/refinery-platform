function GroupListService(groupMemberService) {
  this.groupMemberService = groupMemberService;
}

GroupListService.prototype.update = function () {
  this.groupMemberService.query()
  .$promise
  .then(function (data) {
    this.list = data.objects.sort(function (a, b) {
      return a.id > b.id;
    });
  }.bind(this))
  .catch(function (error) {
    console.error(error);
  });
};

Object.defineProperty(
  GroupListService.prototype,
  'list', {
    enumerable: true,
    configurable: false,
    value: [],
    writable: true
  }
);

angular
  .module('refineryApp')
  .service('groupListService', ['groupMemberService', GroupListService]);