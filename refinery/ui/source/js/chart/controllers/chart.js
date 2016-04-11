'use strict';

function isValidUUID (uuid) {
  var isStr = typeof uuid === 'string' || uuid instanceof (String);

  if (!isStr) {
    return false;
  }

  if (uuid.length !== 36) {
    return false;
  }

  var split = uuid.split('-');

  if (split.length !== 5 &&
    split[0].length !== 8 &&
    split[1].length !== 4 &&
    split[2].length !== 4 &&
    split[3].length !== 4 &&
    split[4].length !== 12) {
    return false;
  }

  return true;
}

function ChartCtrl (
  $log, $, c3, $stateParams, fastqcDataService, refineryBoxPlotService
) {
  var that = this;

  that.$log = $log;
  that.$ = $;
  that.c3 = c3;
  that.$stateParams = $stateParams;
  that.fastqcDataService = fastqcDataService;
  that.refineryBoxPlotService = refineryBoxPlotService;
  that.uuid = that.$stateParams.uuid && isValidUUID(that.$stateParams.uuid) ?
    that.$stateParams.uuid : '';
  that.mode = that.$stateParams.mode || 'basic_statistics';

  if (that.$stateParams &&
    that.$stateParams.uuid &&
    isValidUUID(that.$stateParams.uuid)) {
    that.fastqcDataService
      .get({
        uuid: that.$stateParams.uuid
      })
      .$promise
      .then(function (data) {
        that.data = data.data;
        that.dataKeys = Object.keys(that.data.summary);
        that.plot(that.data, that.$stateParams.mode);
      })
      .catch(function () {
        that.errorMessage = 'Unable to display visualization for data. ' +
          'Only FastQC data formats can be displayed.';
      });
  } else {
    that.errorMessage = 'Incompatible or no analysis selected.';
  }
}

Object.defineProperty(
  ChartCtrl.prototype,
  'modeList', {
    enumerable: true,
    configurable: false,
    get: function () {
      return [
        'basic_statistics',
        'per_base_sequence_quality',
        'per_sequence_quality_scores',
        'per_base_sequence_content',
        'per_sequence_gc_content',
        'per_base_n_content',
        'sequence_length_distribution',
        'sequence_duplication_levels',
        'overrepresented_sequences',
        'adapter_content',
        'kmer_content'
      ];
    }
  }
);

Object.defineProperty(
  ChartCtrl.prototype,
  'bindto', {
    enumerable: true,
    configurable: false,
    get: function () {
      return '.fastqc-chart-drawspace';
    }
  }
);

ChartCtrl.prototype.plot = function (data, mode) {
  var _mode = mode && this.modeList.indexOf(mode) > -1 ?
    mode : 'basic_statistics';

  if (!data[_mode] && !(data[_mode] instanceof (Array))) {
    this.$log.error('Invalid data type returned');
    return;
  }

  if (_mode === 'per_base_sequence_quality') {
    this.draw_per_base_sequence_quality(data[_mode]);
  } else if (_mode === 'basic_statistics') {
    this.draw_basic_statistics_table(data[_mode]);
  } else if (_mode === 'per_sequence_quality_scores') {
    this.draw_generic_line(data[_mode]);
  } else if (_mode === 'per_base_sequence_content') {
    this.draw_generic_line(data[_mode], {
      ymin: 0,
      ymax: 0
    });
  } else if (_mode === 'per_sequence_gc_content') {
    this.draw_generic_line(data[_mode]);
  } else if (_mode === 'per_base_n_content') {
    this.draw_generic_line(data[_mode]);
  } else if (_mode === 'sequence_length_distribution') {
    this.draw_generic_line(data[_mode]);
  } else if (_mode === 'sequence_duplication_levels') {
    this.draw_generic_line(data[_mode].slice(1));
  } else if (_mode === 'overrepresented_sequences') {
    this.draw_generic_table(data[_mode]);
  } else if (_mode === 'adapter_content') {
    this.draw_generic_line(data[_mode]);
  } else if (_mode === 'kmer_content') {
    this.draw_generic_table(data[_mode]);
  } else {
    this.draw_basic_statistics_table(data.basic_statistics);
  }
};

ChartCtrl.prototype.draw_generic_bar = function () {};

ChartCtrl.prototype.draw_generic_table = function (data) {
  if (data.length === 0) {
    var message = '<div class="alert alert-warning">No data available for plotting.</div>';
    this.$(this.bindto).html(message);
  } else {
    var tableHTML = '' +
      '<table class="table">' +
      '<thead>' +
      '<tr>' + data[0].map(function (d) {
        return '<th>' + d + '</th>';
      }).join('') + '</tr>' +
      '</thead>' +
      '<tbody>' +
      data.slice(1).map(function (d) {
        return '<tr>' + d.map(function (f) {
          return '<td>' + f + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>';

    this.$(this.bindto).html(tableHTML);
  }
};

ChartCtrl.prototype.draw_basic_statistics_table = function (data) {
  var tableHTML = '' +
    '<table class="table">' +
    '<thead>' +
    '<tr>' +
    '<th>Measure</th>' +
    '<th>Value</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    Object.keys(data).map(function (k) {
      return '' +
      '<tr>' +
      '<td>' + k + '</td>' + '<td>' + data[k] + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody>' +
    '</table>';

  this.$(this.bindto).html(tableHTML);
};

ChartCtrl.prototype.draw_generic_line = function (data, _config_) {
  var config = _config_ || {};

  this.c3.generate({
    bindto: this.bindto,
    data: {
      x: data[0][0],
      rows: data
    },
    axis: {
      x: {
        type: 'category',
        tick: {
          count: 1 + data.length / 2
        }
      },
      y: {
        min: config.ymin || 0,
        max: config.ymax || null,
        padding: {
          bottom: config.bPad || 0,
          top: config.tPad || 0
        }
      }
    }
  });
};

ChartCtrl.prototype.draw_per_base_sequence_quality = function (data) {
  this.refineryBoxPlotService.generate({
    data: data.slice(1).map(function (d) {
      return {
        kind: 'A',
        label: d[0],
        mean: d[1],
        med: d[2],
        q1: d[3],
        q3: d[4],
        min: d[5],
        max: d[6]
      };
    }),
    config: {
      bindto: this.bindto
    }
  });
};

angular
  .module('refineryChart')
  .controller('refineryChartCtrl', [
    '$log',
    '$',
    'c3',
    '$stateParams',
    'fastqcDataService',
    'refineryBoxPlotService',
    ChartCtrl
  ]);

