'use strict';

describe('Active-Member-Service', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryCollaboration'));
  beforeEach(inject(function (_activeMemberService_) {
    service = _activeMemberService_;
  }));

  it('factory and tools variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.activeMember).toEqual({});
    expect(service.totalMembers).toEqual(0);
  });

  describe('Setter methods', function () {
    it('setActiveMember is a method', function () {
      expect(angular.isFunction(service.setActiveMember)).toBe(true);
    });

    it('setActiveMember updates activeMember', function () {
      var memberObj = {
        name: 'guest'
      };
      service.setActiveMember(memberObj);
      expect(service.activeMember).toEqual(memberObj);
    });

    it('setTotalMembers is a method', function () {
      expect(angular.isFunction(service.setTotalMembers)).toBe(true);
    });

    it('setTotalMembers updates totalMembers', function () {
      service.setTotalMembers(10);
      expect(service.totalMembers).toEqual(10);
    });
  });
});
