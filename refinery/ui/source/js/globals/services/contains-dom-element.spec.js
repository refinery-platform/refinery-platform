describe('ContainsDomElement.service: unit tests', function () {
  'use strict';

  var containsDomElement;
  var html;

  beforeEach(function () {
    module('containsDomElement');

    inject(function (_containsDomElement_, _$compile_) {
      containsDomElement = _containsDomElement_;
    });

    html = angular.element(
      '<body><div id="a"><div id="b"></div></div><div id="c"></div></body>'
    );
  });

  it('should contain the containsDomElement service', function () {
    expect(containsDomElement).not.toEqual(null);
  });

  it('should identify contained element', function () {
    var a = html.find('#a');
    var b = html.find('#b');

    console.log(html, a, b);

    expect(containsDomElement(a, b)).toEqual(true);
  });

  it('should not identify uncontained element', function () {
    var a = html.find('#a');
    var c = html.find('#c');

    expect(containsDomElement(a, c)).not.toEqual(true);
  });
});
