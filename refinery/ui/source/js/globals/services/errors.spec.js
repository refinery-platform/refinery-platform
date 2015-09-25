describe('errors: Errors (unit testing)', function () {
  'use strict';

  var errors,
      rootScope;

  beforeEach(function () {
    module('errors');

    inject(function (_errors_, $injector) {
      errors = _errors_;
      rootScope = $injector.get('$rootScope');
      spyOn(rootScope, '$broadcast');
    });
  });

  it('should contain the errors service', function () {
    expect(errors).not.toEqual(null);
  });

  it('should contain a get method', function () {
    expect(errors.get).not.toEqual(null);
  });

  it('should contain a catch method', function () {
    expect(errors.catch).not.toEqual(null);
  });

  it('should broadcast a custom error event', inject(function ($q) {
    $q.reject('error')
      .catch(errors.catch('type', 'message'));

    rootScope.$digest();

    expect(rootScope.$broadcast).toHaveBeenCalledWith('error:type', 0);
  }));

  it('should broadcast a custom error event with increasing error IDs',
    inject(function ($q) {
      var iter = 3;

      for (var i = iter - 1; i >= 0; i--) {
        $q.reject('error')
          .catch(errors.catch('type', 'message'));

        rootScope.$digest();
      }

      expect(rootScope.$broadcast).toHaveBeenCalledWith('error:type', iter - 1);
    })
  );

  it('should provide an error object',
    inject(function ($q) {
      var error = {
            type: 'type',
            message: 'message',
            reason: 'error'
          },
          returnedErrId;

      $q.reject(error.reason)
        .catch(errors.catch(error.type, error.message));

      rootScope.$digest();

      expect(rootScope.$broadcast).toHaveBeenCalledWith('error:type', 0);

      expect(errors.get(0)).toEqual(error);
    })
  );

});
