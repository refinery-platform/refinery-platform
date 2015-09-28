describe('Dashboard module: Unit Testing', function () {

  var module;

  beforeEach(function () {
    module = angular.module('refineryDashboard');
  });

  it('should exist', function () {
    expect(module).not.toEqual(null);
  });
});
