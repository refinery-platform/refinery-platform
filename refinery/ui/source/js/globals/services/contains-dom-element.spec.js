'use strict';

describe('ContainsDomElement.service: unit tests', function () {
  var containsDomElement;
  var html;

  beforeEach(function () {
    module('containsDomElement');

    inject(function (_containsDomElement_) {
      containsDomElement = _containsDomElement_;
    });

    // Unfortunately `angular.element` is not able to create a `body` element so
    // we have to do that outselves...
    html = document.implementation
      .createDocument(
        'http://www.w3.org/1999/xhtml',
        'html',
        null
    )
      .createElement('body');
    html.innerHTML = '<div id="a"><div id="b"></div></div><div id="c"></div>';
  });

  it('should contain the containsDomElement service', function () {
    expect(containsDomElement).not.toEqual(null);
  });

  it('should identify contained element', function () {
    var a = html.querySelector('#a');
    var b = html.querySelector('#b');

    expect(containsDomElement(a, b)).toEqual(true);
  });

  it('should not identify uncontained element', function () {
    var a = html.querySelector('#a');
    var c = html.querySelector('#c');

    expect(containsDomElement(a, c)).not.toEqual(true);
  });
});
