'use strict';

describe('Tooltip.directive: unit tests', function () {
  var $rootScope;
  var directiveEl;
  var TooltipCtrl;
  var tooltipEl;

  beforeEach(function () {
    module('refineryApp');
    module('tooltip');

    var $compile;
    var $controller;

    inject(function (_$compile_, _$controller_, _$rootScope_) {
      $compile = _$compile_;
      $controller = _$controller_;
      $rootScope = _$rootScope_;
    });

    directiveEl = $compile(
      angular.element(
        '<div id="base">' +
        '  <div id="tooltip-el"' +
        '       refinery-tooltip' +
        '       refinery-tooltip-container="body"' +
        '       refinery-tooltip-placement="left"' +
        '       title="test"> ' +
        '  </div>' +
        '</div>'
      )
    )($rootScope.$new());

    tooltipEl = angular.element(directiveEl[0].querySelector('#tooltip-el'));

    TooltipCtrl = $controller('TooltipCtrl', {
      $element: tooltipEl
    }, {
      container: 'body',
      placement: 'left'
    });
  });

  describe('tooltip element', function () {
    it('should be found', function () {
      expect(tooltipEl).toBeTruthy();
    });

    it(
      'should have custom _attr_ `data-container` with the container value',
      function () {
        expect(tooltipEl.attr('data-container')).toBe(TooltipCtrl.container);
      }
    );

    it('should initialize tooltip on mouseenter', function () {
      var times = 0;
      var timesOne = 0;

      spyOn(tooltipEl, 'on').and.callThrough();

      function counter () {
        times++;
      }
      function counterOne () {
        timesOne++;
      }

      tooltipEl.on('mouseenter', counter);
      tooltipEl.one('mouseenter', counterOne);
      tooltipEl.trigger('mouseenter');

      $rootScope.$digest();

      expect(tooltipEl.on).toHaveBeenCalledWith('mouseenter', counter);
      // Not sure why `.one()` is actually called 3 times because according to
      // the docs (https://api.jquery.com/one/) is should be called only once...
      expect(timesOne).toBe(3);
      expect(times).toBe(timesOne + 1);
    });
  });
});
