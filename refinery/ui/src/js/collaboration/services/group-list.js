function GroupListService(groupMemberService) {
  this.groupMemberService = groupMemberService;
}

GroupListService.prototype.update = function () {
  return this.groupMemberService.query()
    .$promise
      .then(function (data) {
        this.list = data.objects.sort(function (a, b) {
          return a.id > b.id;
        });
        
        return this.list;
      }.bind(this));
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
  .module('refineryCollaboration')
  .service('groupListService', ['groupMemberService', GroupListService]);