'use strict';

describe('PubSub.service: unit tests', function () {
  var pubSub;

  beforeEach(function () {
    module('pubSub');

    inject(function (_pubSub_) {
      pubSub = _pubSub_;
    });
  });

  it('should contain the pubSub service', function () {
    expect(pubSub).not.toEqual(null);
  });

  it('should subscribe and trigger a callback', function () {
    var a = 0;

    pubSub.on('test', function () {
      a++;
    });

    pubSub.trigger('test');

    expect(a).toEqual(1);
  });

  it('should subscribe and trigger a callback for limited times', function () {
    var a = 0;

    pubSub.on('test', function () {
      a++;
    }, 2);

    pubSub.trigger('test');
    pubSub.trigger('test');
    pubSub.trigger('test');

    expect(a).toEqual(2);
  });

  it('should unsubscribe a callback', function () {
    var a = 0;

    var listener = pubSub.on('test', function () {
      a++;
    });

    pubSub.trigger('test');

    expect(a).toEqual(1);

    pubSub.off('test', listener);

    pubSub.trigger('test');

    expect(a).toEqual(1);
  });
});
