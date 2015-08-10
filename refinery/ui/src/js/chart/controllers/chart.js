function ChartCtrl($, $stateParams, fastqcDataService, refineryBoxPlotService) {
  var that = this;
  that.$ = $;
  that.$stateParams = $stateParams;
  that.fastqcDataService = fastqcDataService;
  that.refineryBoxPlotService = refineryBoxPlotService;
  that.uuid = this.$stateParams.uuid && isValidUUID(this.$stateParams.uuid) ? 
    this.$stateParams.uuid : '';
  that.mode = this.$stateParams.mode || 'basic_statistics';

  if (this.$stateParams &&
      this.$stateParams.uuid &&
      isValidUUID(this.$stateParams.uuid)) {
    this.fastqcDataService.get({
      uuid: that.$stateParams.uuid
    }).$promise.then(function (data) {
        that.data = data.data;
        that.dataKeys = Object.keys(that.data.summary);
        that.plot(that.data, that.$stateParams.mode);
      }).catch(function (error) {
        that.errorMessage = 'Unable to display visualization for data. ' +
          'Only FastQC data formats can be displayed.';
        console.error(error);
      }
    );
  } else {
    that.errorMessage = 'Improper or no analysis uuid.';
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

function isValidUUID(uuid) {
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

function make_array(size) {
  return Array.apply(null, new Array(size)).map(function (a, i) {
    return i + 1;
  });
}

ChartCtrl.prototype.plot = function (data, mode) {
  var that = this;
  mode = mode && this.modeList.indexOf(mode) > -1 ?
    mode : 'basic_statistics';

  if (!data[mode] && !(data[mode] instanceof (Array))) {
    console.error("Invalid data type returned");
    return;
  }

  if (mode === 'per_base_sequence_quality') {
    this.draw_per_base_sequence_quality(data[mode]);
  } else if (mode === 'basic_statistics') {
    this.draw_basic_statistics_table(data[mode]);
  } else if (mode === 'per_sequence_quality_scores') {
    this.draw_generic_line(data[mode]);
  } else if (mode === 'per_base_sequence_content') {
    this.draw_generic_line(data[mode], {ymin: 0, ymax: 0});
  } else if (mode === 'per_sequence_gc_content') {
    this.draw_generic_line(data[mode]);
  } else if (mode === 'per_base_n_content') {
    this.draw_generic_line(data[mode]);
  } else if (mode === 'sequence_length_distribution') {
    this.draw_generic_line(data[mode]);
  } else if (mode === 'sequence_duplication_levels') {
    this.draw_generic_line(data[mode].slice(1));
  } else if (mode === 'overrepresented_sequences') {
    this.draw_generic_table(data[mode]);
  } else if (mode === 'adapter_content') {
    this.draw_generic_line(data[mode]);
  } else if (mode === 'kmer_content') {
    this.draw_generic_table(data[mode]);
  } else {
    this.draw_basic_statistics_table(data['basic_statistics']);
  }
};

ChartCtrl.prototype.draw_generic_bar = function (data, config) {
  config = config || {};
};

ChartCtrl.prototype.draw_generic_table = function (data, config) {
  config = config || {};

  var tableHTML = '' +
    '<table class="table">'+
      '<thead>' +
        '<tr>' + data[0].map(function (d) { return '<th>' + d + '</th>'; }) + '</tr>' +
      '</thead>' +
      '<tbody>' +
        data.slice(1).map(function (d) {
          return '<tr>' + d.map(function (f) { return '<td>' + f + '</td>'; }) + '</tr>';
        }) +
      '</tbody>' + 
    '</table>';

  $(this.bindto).html(tableHTML);
};

ChartCtrl.prototype.draw_basic_statistics_table = function (data, config) {
  config = config || {};

  var tableHTML = '' +
    '<table class="table">'+
      '<thead>' +
        '<tr>' +
          '<th>Measure</th>' + 
          '<th>Value</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        Object.keys(data).map(function (k) {
          return '' +
            '<tr>'+
              '<td>' + k + '</td>' + '<td>' + data[k] + '</td>' +
            '</tr>';
        }) +
      '</tbody>' + 
    '</table>';

  $(this.bindto).html(tableHTML);
};

ChartCtrl.prototype.draw_generic_line = function (data, config) {
  config = config || {};

  var chart = c3.generate({
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
  var chart = this.refineryBoxPlotService.generate({
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
  .controller("refineryChartCtrl", [
    '$',
    '$stateParams',
    'fastqcDataService',
    'refineryBoxPlotService',
    ChartCtrl
  ]);

