/**
 * provvis Draw DOI Service
 * @namespace provvisDrawDOIService
 * @desc Service for drawing DOI view
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDrawDOIService', provvisDrawDOIService);

  provvisDrawDOIService.$inject = [
    '$',
    'provvisDeclService',
    'provvisInitDOIService',
    'provvisPartsService'
  ];

  function provvisDrawDOIService (
    $,
    provvisDeclService,
    provvisInitDOIService,
    provvisPartsService
  ) {
    var doiService = provvisInitDOIService;
    var partsService = provvisPartsService;
    var provvisDecl = provvisDeclService;
    var service = {
      drawDoiView: drawDoiView
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
  /**
   * Draws the DOI view.
   */
    function drawDoiView () {
      var innerSvg = d3.select('#provenance-doi-view')
          .select('svg').select('g').select('g').attr('transform', function () {
            return 'translate(0,0)';
          }).select('g');

      var doiFactors = d3.values(provvisDecl.DoiFactors.factors);
      var doiColorScale = d3.scale.category10();

      var updateDoiView = function (data) {
        var rectOffset = 0;
        var labelOffset = 30;
        var labelsStart = (300 - data.length * labelOffset) / 2;

        /* Data join. */
        var dComp = innerSvg.selectAll('g').data(data);

        /* Update. */
        var gDCompUpdate = dComp.attr('id', function (d, i) {
          return 'doiCompId-' + i;
        }).classed({
          doiComp: true
        });
        gDCompUpdate.select('.doiCompRect')
          .classed('doiCompRect', true)
          .attr('x', 0)
          .attr('y', function (d) {
            rectOffset += d.value * 300;
            return rectOffset - d.value * 300;
          }).attr('width', 40)
          .attr('height', function (d) {
            return d.value * 300;
          });
        gDCompUpdate.select('.doiCompHandle')
          .classed('doiCompHandle', true)
          .attr('x', 40 + labelOffset)
          .attr('y', function (d, i) {
            return labelsStart + labelOffset * i;
          }).attr('width', labelOffset)
          .attr('height', labelOffset)
          .style('fill', function (d, i) {
            return doiColorScale(10 - i);
          });
        rectOffset = 0;
        gDCompUpdate.select('.doiCompLine', true)
          .attr('x1', 40)
          .attr('y1', function (d) {
            rectOffset += d.value * 300;
            return rectOffset - (d.value * 300 / 2);
          }).attr('x2', 40 + labelOffset)
          .attr('y2', function (d, i) {
            return labelsStart + labelOffset * i + labelOffset / 2;
          })
          .style({
            stroke: function (d, i) {
              return doiColorScale(10 - i);
            },
            'stroke-opacity': 0.7,
            'stroke-width': '2px'
          });

        /* Enter. */
        var gDCompEnter = dComp.enter().append('g')
          .attr('id', function (d, i) {
            return 'doiCompId-' + i;
          }).classed({
            doiComp: true
          });
        gDCompEnter.append('rect')
          .classed('doiCompRect', true)
          .attr('x', 0)
          .attr('y', function (d) {
            rectOffset += d.value * 300;
            return rectOffset - d.value * 300;
          }).attr('width', 40)
          .attr('height', function (d) {
            return d.value * 300;
          }).style('fill', function (d, i) {
            return doiColorScale(10 - i);
          });
        rectOffset = 0;
        gDCompEnter.append('rect')
          .classed('doiCompHandle', true)
          .attr('x', 40 + labelOffset)
          .attr('y', function (d, i) {
            return labelsStart + labelOffset * i;
          }).attr('width', labelOffset)
          .attr('height', labelOffset)
          .style('fill', function (d, i) {
            return doiColorScale(10 - i);
          });
        rectOffset = 0;
        gDCompEnter.append('line').classed('doiCompLine', true)
          .attr('x1', 40)
          .attr('y1', function (d) {
            rectOffset += d.value * 300;
            return rectOffset - (d.value * 300 / 2);
          }).attr('x2', 40 + labelOffset)
          .attr('y2', function (d, i) {
            return labelsStart + labelOffset * i + labelOffset / 2;
          })
          .style({
            stroke: function (i) {
              return doiColorScale(10 - i);
            },
            'stroke-opacity': 0.7,
            'stroke-width': '2px'
          });

        dComp.exit().remove();

        $('#doiSpinners').css('padding-top', labelsStart);
      };

      updateDoiView(doiFactors);

      doiFactors.forEach(function (dc, i) {
        $('<div/>', {
          id: 'dc-form-' + i,
          class: 'form dc-form',
          style: 'height: 30px; position: absolute; left: 75px; top: ' +
            parseInt((10 - doiFactors.length) / 2 * 30 + (i + 1) * 30 - 1, 10) +
            'px;'
        }).appendTo('#' + 'doiVis');

        $('<input/>', {
          id: 'dc-checkbox-' + i,
          class: 'dc-checkbox',
          type: 'checkbox',
          checked: 'true',
          style: 'margin-top: 0px; margin-right: 2px; vertical-align: middle;'
        }).appendTo('#' + 'dc-form-' + i);

        $('<input/>', {
          id: 'dc-input-' + i,
          type: 'text',
          class: 'form-control dc-input',
          value: dc.value,
          style: 'display: inline; width: 27px; height: 30px; margin-bottom:' +
            ' 0px;' +
            'margin-right: 2px; text-align: left; padding: 0; margin-left: 2px;' +
            ' border-radius: 0px;'
        }).appendTo('#' + 'dc-form-' + i);

        $('<div/>', {
          id: 'btn-group-wrapper-' + i,
          class: 'btn-group',
          style: 'height: 32px'
        }).appendTo('#' + 'dc-form-' + i);

        $('<div/>', {
          id: 'dc-btn-group-' + i,
          class: 'input-group-btn-vertical',
          style: 'margin-right: 2px;'
        }).appendTo('#' + 'btn-group-wrapper-' + i);

        $('<button/>', {
          id: 'dc-carret-up-' + i,
          class: 'refinery-base btn btn-default',
          html: '<i class=\'fa fa-caret-up\'></i>'
        }).appendTo('#' + 'dc-btn-group-' + i);

        $('<button/>', {
          id: 'dc-carret-down-' + i,
          class: 'refinery-base btn btn-default',
          html: '<i class=\'fa fa-caret-down\'></i>'
        }).appendTo('#' + 'dc-btn-group-' + i);

        $('<span/>', {
          id: 'dc-label-' + i,
          class: 'label dc-label',
          html: dc.label,
          style: 'margin-left: 2px; opacity: 0.7; background-color: ' +
            doiColorScale(10 - i) + ';'
        }).appendTo('#' + 'dc-form-' + i);
      });

      $('<a/>', {
        id: 'prov-doi-view-reset',
        href: '#/provvis',
        html: 'Redistribute',
        style: 'width: 25px; position: absolute; left: 90px; top: ' +
          parseInt((10 - doiFactors.length) / 2 * 30 +
            (doiFactors.length + 1) * 30 + 10, 10) + 'px;'
      }).appendTo('#' + 'doiVis');

      /* TODO: Code cleanup. */
      /**
       * Toggle doi components.
       */
      var toggleDoiComps = function () {
        var numMaskedComps = d3.values(provvisDecl.DoiFactors.factors)
          .filter(function (dc) {
            return provvisDecl.DoiFactors.isMasked(dc.label);
          }).length;

        if (numMaskedComps > 0) {
          var accVal = d3.values(provvisDecl.DoiFactors.factors)
            .filter(function (dc) {
              return provvisDecl.DoiFactors.isMasked(dc.label);
            })
            .map(function (dc) {
              return dc.value;
            })
            .reduce(function (accVal, cur) { // eslint-disable-line no-shadow
              return accVal + cur;
            });

          var tar = 1.0;

          d3.values(provvisDecl.DoiFactors.factors)
            .forEach(function (dc, i) {
              if (provvisDecl.DoiFactors.isMasked(dc.label)) {
                var isMasked = $('#dc-checkbox-' + i)[0].checked;
                if (accVal === 0) {
                  provvisDecl.DoiFactors.set(
                    d3.keys(provvisDecl.DoiFactors.factors)[i],
                    1 / numMaskedComps, isMasked);
                  $('#dc-input-' + i).val(1 / numMaskedComps);
                } else {
                  provvisDecl.DoiFactors.set(
                    d3.keys(provvisDecl.DoiFactors.factors)[i],
                    (dc.value / accVal) * tar, isMasked);
                  $('#dc-input-' + i).val((dc.value / accVal) * tar);
                }
              }
            });
        }
        updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
      };

      /* Toggle component on svg click. */
      d3.selectAll('.doiComp').on('click', function () {
        var dcId = d3.select(this).attr('id').substr(d3.select(this).attr('id')
            .length - 1, 1);
        var val = 0.0;
        if ($('#dc-checkbox-' + dcId)[0].checked) {
          $('#dc-checkbox-' + dcId).prop('checked', false);
          $('#dc-label-' + dcId).css('opacity', 0.3);
          d3.select('#doiCompId-' + dcId)
            .select('.doiCompHandle')
            .classed('blendedDoiComp', true);
          d3.select('#doiCompId-' + dcId).select('.doiCompLine')
            .style('display', 'none');
          $('#dc-input-' + dcId).val(val);
          provvisDecl.DoiFactors.set(
            d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, false);
        } else {
          $($('#dc-checkbox-' + dcId)).prop('checked', true);
          $('#dc-label-' + dcId).css('opacity', 0.7);
          d3.select('#doiCompId-' + dcId)
            .select('.doiCompHandle')
            .classed('blendedDoiComp', false);
          d3.select('#doiCompId-' + dcId).select('.doiCompLine')
            .style('display', 'inline');
          provvisDecl.DoiFactors.set(
            d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);
        }
        toggleDoiComps();
      });

      /* Toggle component on checkbox click. */
      $('.dc-checkbox').click(function () {
        var dcId = $(this)[0].id[$(this)[0].id.length - 1];
        var val = 0.0;
        if ($(this)[0].checked) {
          $(this.parentNode).find('.dc-label').css('opacity', 0.7);
          d3.select('#doiCompId-' + dcId).select('.doiCompHandle')
            .classed('blendedDoiComp', false);
          d3.select('#doiCompId-' + dcId).select('.doiCompLine')
            .style('display', 'inline');
          val = 0.0;
          provvisDecl.DoiFactors.set(
            d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);
        } else {
          $(this.parentNode).find('.dc-label').css('opacity', 0.3);
          d3.select('#doiCompId-' + dcId).select('.doiCompHandle')
            .classed('blendedDoiComp', true);
          d3.select('#doiCompId-' + dcId).select('.doiCompLine')
            .style('display', 'none');
          val = 0.0;
          $('#dc-input-' + dcId).val(val);
          provvisDecl.DoiFactors.set(
            d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, false);
        }

        toggleDoiComps();
      });

      /* TODO: Clean up code duplication. */

      /* Increase component's influence. */
      $('.dc-form .btn:first-of-type').on('click', function () {
        var dcId = $(this)[0].id[$(this)[0].id.length - 1];
        var val = parseFloat($('#dc-input-' + dcId).val()) + 0.01;
        if ($('#dc-checkbox-' + dcId)[0].checked && val <= 1) {
          $('#dc-input-' + dcId).val(val);
          provvisDecl.DoiFactors.set(
            d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

          var accVal = d3.values(provvisDecl.DoiFactors.factors)
            .filter(function (dc, i) {
              // eslint-disable-next-line max-len
              return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);// eslint-disable-line eqeqeq
            })
            .map(function (dc) {
              return dc.value;
            })
            .reduce(function (accVal, cur) { // eslint-disable-line no-shadow
              return accVal + cur;
            });

          var tar = parseFloat(1 - val);

          d3.values(provvisDecl.DoiFactors.factors)
            .forEach(function (dc, i) {
              if (
                i != dcId && provvisDecl.DoiFactors.isMasked(dc.label) // eslint-disable-line eqeqeq
              ) {
                var isMasked = $('#dc-checkbox-' + i)[0].checked;
                provvisDecl.DoiFactors.set(
                  d3.keys(provvisDecl.DoiFactors.factors)[i],
                  (dc.value / accVal) * tar, isMasked);
                $('#dc-input-' + i).val((dc.value / accVal) * tar);
              }
            });
          updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
        }
      });

      /* Decrease component's influence. */
      $('.dc-form .btn:last-of-type').on('click', function () {
        var dcId = $(this)[0].id[$(this)[0].id.length - 1];
        var val = parseFloat($('#dc-input-' + dcId).val()) - 0.01;
        if ($('#dc-checkbox-' + dcId)[0].checked && val >= 0) {
          $('#dc-input-' + dcId).val(val);
          provvisDecl.DoiFactors.set(
            d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

          var accVal = d3.values(provvisDecl.DoiFactors.factors)
            .filter(function (dc, i) {
              // eslint-disable-next-line max-len
              return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);// eslint-disable-line eqeqeq
            })
            .map(function (dc) {
              return dc.value;
            })
            .reduce(function (accVal, cur) { // eslint-disable-line no-shadow
              return accVal + cur;
            });

          var tar = parseFloat(1 - val);

          d3.values(provvisDecl.DoiFactors.factors)
            .forEach(function (dc, i) {
              if (
                i != dcId && provvisDecl.DoiFactors.isMasked(dc.label)// eslint-disable-line eqeqeq
              ) {
                var isMasked = $('#dc-checkbox-' + i)[0].checked;
                provvisDecl.DoiFactors.set(
                  d3.keys(provvisDecl.DoiFactors.factors)[i],
                  (dc.value / accVal) * tar, isMasked);
                $('#dc-input-' + i).val((dc.value / accVal) * tar);
              }
            });
          updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
        }
      });

      $('.dc-input').keypress(function (e) {
        if (e.which == 13) {  // eslint-disable-line eqeqeq
          var dcId = $(this)[0].id[$(this)[0].id.length - 1];
          var val = parseFloat($('#dc-input-' + dcId).val());

          if (val > 1) {
            val = 1;
          } else if (val < 0) {
            val = 0;
          }

          $(this).val(val);
          $($('#dc-checkbox-' + dcId)).prop('checked', true);
          $('#doiCompId-' + dcId).find('.dc-label').css('opacity', 0.7);
          d3.select('#doiCompId-' + dcId).select('.doiCompHandle')
            .classed('blendedDoiComp', false);
          d3.select('#doiCompId-' + dcId).select('.doiCompLine')
            .style('display', 'inline');
          provvisDecl.DoiFactors.set(
            d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

          var accVal = d3.values(provvisDecl.DoiFactors.factors) // eslint-disable-line no-shadow
            .filter(function (dc, i) {
              // eslint-disable-next-line max-len
              return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label); // eslint-disable-line eqeqeq
            })
            .map(function (dc) {
              return dc.value;
            })
            .reduce(function (accVal, cur) { // eslint-disable-line no-shadow
              return accVal + cur;
            });

          var tar = parseFloat(1 - val);

          d3.values(provvisDecl.DoiFactors.factors).forEach(function (dc, i) {
            if (
              i != dcId && provvisDecl.DoiFactors.isMasked(dc.label) // eslint-disable-line eqeqeq
            ) {
              var isMasked = $('#dc-checkbox-' + i)[0].checked;
              provvisDecl.DoiFactors.set(
                d3.keys(provvisDecl.DoiFactors.factors)[i],
                (dc.value / accVal) * tar, isMasked);
              $('#dc-input-' + i).val((dc.value / accVal) * tar);
            }
          });
          updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
        }
      });

      $('#prov-doi-view-apply').on('click', function () {
        /* Recompute doi. */
        doiService.recomputeDOI();
      });

      $('#prov-doi-view-reset').on('click', function () {
        var val = parseFloat(1 / d3.values(provvisDecl.DoiFactors.factors)
            .filter(function (dc) {
              return provvisDecl.DoiFactors.isMasked(dc.label);
            }).length);

        d3.values(provvisDecl.DoiFactors.factors)
          .forEach(function (dc, i) {
            if (!provvisDecl.DoiFactors.isMasked(dc.label)) {
              $('#dc-input-' + i).val(0.0);
              provvisDecl.DoiFactors.set(
                d3.keys(provvisDecl.DoiFactors.factors)[i], 0.0, false);
            } else {
              $('#dc-input-' + i).val(val);
              provvisDecl.DoiFactors.set(
                d3.keys(provvisDecl.DoiFactors.factors)[i], val, true);
            }
          });
        updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
      });

      /* Toggle DOI auto update. */
      $('#prov-doi-trigger').click(function () {
        if ($(this).find('input[type=\'checkbox\']').prop('checked')) {
          partsService.doiAutoUpdate = true;
        } else {
          partsService.doiAutoUpdate = false;
        }
      });

      /* Show and hide doi labels. */
      $('#prov-doi-view-show').click(function () {
        if ($(this).find('input[type=\'checkbox\']').prop('checked')) {
          d3.selectAll('.nodeDoiLabel').style('display', 'inline');
        } else {
          d3.selectAll('.nodeDoiLabel').style('display', 'none');
        }
      });
    }
  }
})();
