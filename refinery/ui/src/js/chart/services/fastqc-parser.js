function FastQCParserService() {
  // Index mapping.
  this.im = {
    meta: 0,
    per_base_sequence_quality: 1,
    per_tile_sequence_quality: 2,
    per_sequence_quality_scores: 3,
    per_base_sequence_content: 4,
    per_sequence_gc_content: 5,
    per_base_n_content: 6,
    sequence_length_distribution: 7,
    sequence_duplication_level: 8,
    overrepresented_sequences: 9,
    adapter_content: 10,
    kmer_content: 11
  };
}

// 0
function parse_meta(data) {
  var s = data.split('\n');
  var meta = {};
  meta.version = s[0].split('#').slice(-1)[0];
  meta.basic_statistics = s[1].split(' ').slice(-1)[0];
  meta.total_sequences = +s[6].split(' ').slice(-1)[0];
  meta.poor_quality_sequences = +s[7].split(' ').slice(-1)[0];
  meta.sequence_length = +s[8].split(' ').slice(-1)[0];
  meta.gc_ercent = +s[9].split(' ').slice(-1)[0];

  return meta;
}

// 1 - box plots
function parse_per_base_sequence_quality(data) {
  var s = data.split('\n');
  var per_base_sequence_quality = {};
  per_base_sequence_quality.result = s[0].split(' ').slice(-1)[0];
  per_base_sequence_quality.data = [];
  var data_section = s.slice(2);

  for (var i = 0; i < data_section.length; i++) {
    var line = data_section[i].split(' ');

    // We use percentile 10 / percentile 90 to simulate min / max.
    per_base_sequence_quality.data.push({
      kind: 'A',
      label: +line[0],
      mean: +line[1],
      med: +line[2],
      q1: +line[3],
      q3: +line[4],
      min: +line[5],
      max: + line[6]
    });
  }

  return per_base_sequence_quality;
}

// 2
function parse_per_tile_sequence_quality(data) {
  return {};
}

// 3 - line chart
function parse_per_sequence_quality_scores(data) {
  var s = data.split('\n');
  var per_sequence_quality_score = {};
  per_sequence_quality_score.result = s[0].split(' ').slice(-1)[0];
  per_sequence_quality_score.data = ['Quality'];
  var data_section = s.slice(2);

  for (var i = 0; i < data_section.length; i++) {
    var line = data_section[i].split(' ');
    per_sequence_quality_score.data.push(+line[1]);
  }

  return per_sequence_quality_score;
}

// 4 - line chart
function parse_per_base_sequence_content(data) {
  var s = data.split('\n');
  var per_base_sequence_content = {};
  per_base_sequence_content.result = s[0].split(' ').slice(-1)[0];
  per_base_sequence_content.data = {
    G: ['G'],
    A: ['A'],
    T: ['T'],
    C: ['C']
  };
  var data_section = s.slice(2);

  for (var i = 0; i < data_section.length; i++) {
    var line = data_section[i].split(' ');
    per_base_sequence_content.data.G.push(+line[1]);
    per_base_sequence_content.data.A.push(+line[2]);
    per_base_sequence_content.data.T.push(+line[3]);
    per_base_sequence_content.data.C.push(+line[4]);
  }

  return per_base_sequence_content;
}

// 5 - line chart; add normal distribution.
function parse_per_sequence_gc_content(data) {
  var s = data.split('\n');
  var per_sequence_gc_content = {};
  per_sequence_gc_content.result = s[0].split(' ').slice(-1)[0];
  per_sequence_gc_content.data = ['Content'];
  var data_section = s.slice(2);

  for (var i = 0; i < data_section.length; i++) {
    var line = data_section[i].split(' ');
    per_sequence_gc_content.data.push(+line[1]);
  }

  return per_sequence_gc_content;
}

// 6 - line chart
function parse_per_base_n_content(data) {
  var s = data.split('\n');
  var per_base_n_content = {};
  per_base_n_content.result = s[0].split(' ').slice(-1)[0];
  per_base_n_content.data = ['Content'];
  var data_section = s.slice(2);

  for (var i = 0; i < data_section.length; i++) {
    var line = data_section[i].split(' ');
    per_base_n_content.data.push(+line[1]);
  }

  return per_base_n_content;
}

// 7 - line chart
function parse_sequence_length_distribution(data) {
  return {};
}

// 8 - line chart
function parse_sequence_duplication_level(data) {
  var s = data.split('\n');
  var sequence_duplication_level = {};
  sequence_duplication_level.result = s[0].split(' ').slice(-1)[0];
  sequence_duplication_level.data = ['Percent'];
  var data_section = s.slice(3);

  // Assume only offers numbers 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50, 100, 500, 1k, 5k, 10k+
  for (var i = 0; i < 16; i++) {
    var line = data_section[i].split(' ');

    if (i < 10) {
      sequence_duplication_level.data.push(+line[1]);
    } else {
      // Account for initial 'Percent'
      sequence_duplication_level.data[10] += +line[1];
    }
  }

  return sequence_duplication_level;
}

// 9 - line chart
function parse_overrepresented_sequences(data) {
  return {};
}

// 10 - line chart
function parse_adapter_content(data) {
  return {};
}

// 11 - line chart
function parse_kmer_content(data) {
  return {};
}


// Takes a FastQC result and parses it to plottable custom and C3 chart types.
FastQCParserService.prototype.parse = function (data) {
  var s = data.split('>>END_MODULE').map(function (d) { return d.trim(); });

  var res = {
    meta:
      parse_meta(s[this.im.meta]),
    per_base_sequence_quality:
      parse_per_base_sequence_quality(s[this.im.per_base_sequence_quality]),
    per_tile_sequence_quality:
      parse_per_tile_sequence_quality(s[this.im.per_tile_sequence_quality]),
    per_sequence_quality_scores:
      parse_per_sequence_quality_scores(s[this.im.per_sequence_quality_scores]),
    per_base_sequence_content:
      parse_per_base_sequence_content(s[this.im.per_base_sequence_content]),
    per_sequence_gc_content:
      parse_per_sequence_gc_content(s[this.im.per_sequence_gc_content]),
    per_base_n_content:
      parse_per_base_n_content(s[this.im.per_base_n_content]),
    sequence_length_distribution:
      parse_sequence_length_distribution(s[this.im.sequence_length_distribution]),
    sequence_duplication_level:
      parse_sequence_duplication_level(s[this.im.sequence_duplication_level]),
    overrepresented_sequences:
      parse_overrepresented_sequences(s[this.im.overrepresented_sequences]),
    adapter_content:
      parse_adapter_content(s[this.im.adapter_content]),
    kmer_content:
      parse_kmer_content(s[this.im.kmer_content])
  };

  return res;
};

angular
  .module('refineryChart')
  .service('fastQCParserService', [FastQCParserService]);