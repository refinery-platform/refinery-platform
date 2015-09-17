describe('Module: RefineryRouter', function(){

  var module;

  beforeEach(function(){
    module = angular.module('refineryRouter');
  });

  it('module should exist', function(){
    expect(module).toBeDefined();
  });

  it('module should be registered', function(){
    expect(module).not.toEqual(null);
  });

});
