module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    source_dir: 'src',
    vendor_dir: 'bower_components',
    release_dir: 'app',
    styles_dir: '../static/styles',

    source_files: {
      js: ['**/*.js'],
      css: ['**/*.css'],
      html: ['**/*.html'],
    },
    vendor_files: {
      js: [
        'select2/select2.min.js',
        'jquery/dist/jquery.min.js',
        'angular/angular.min.js',
        'angular-ui-select2/release/select2.min.js',
        'angular-bootstrap/ui-bootstrap-tpls.min.js',
        'angular-resource/angular-resource.min.js',
        'angular-ui-router/release/angular-ui-router.min.js',
        'angular-bootstrap/ui-bootstrap-tpls.min.js',
        'angular-bootstrap/ui-bootstrap.min.js',
        'tipsy/src/javascripts/jquery.tipsy.js',
        'd3/d3.min.js',
        'c3/c3.min.js',
        'resumablejs/resumable.js',
        'ng-file-upload/angular-file-upload.min.js',
        'ng-grid/build/ng-grid.min.js',
      ],
      map: [
        // uncompressed source is required along with map for debugging
        // http://stackoverflow.com/a/18365316
        'jquery/dist/jquery.min.map',
        'jquery/dist/jquery.js',
        'angular/angular.min.js.map',
        'angular/angular.js',
        'angular-resource/angular-resource.min.js.map',
        'angular-resource/angular-resource.js',
      ],
      css: [
        'select2/select2.css',
        'tipsy/src/stylesheets/tipsy.css',
        'c3/c3.css',
        'ng-grid/ng-grid.css',
      ],
      img: [
        'select2/select2.png',
        'select2/select2-spinner.gif',
        'tipsy/src/images/tipsy.gif',
      ],
    },

    less: {
      development: {
        options: {
          compress: true,
          yuicompress: true,
          ieCompat: false,
          optimization: 2,
          paths: ["<%= styles_dir %>/less", "../static/js/bootstrap/less"]
        },
        files: {
          // target.css file: source.less file
          "<%= styles_dir %>/css/font-awesome.css": "<%= styles_dir %>/less/font-awesome.less",
          "<%= styles_dir %>/css/font-awesome-ie7.css": "<%= styles_dir %>/less/font-awesome-ie7.less",
          "<%= styles_dir %>/css/variables.css": "<%= styles_dir %>/less/variables.less",
          "<%= styles_dir %>/css/refinery-style.css": "<%= styles_dir %>/less/refinery-style.less",
          // the following fail to compile:
          //"<%= styles_dir %>/css/refinery-style-bootstrap.css": "<%= styles_dir %>/less/refinery-style-bootstrap.less",
          //"<%= styles_dir %>/css/refinery-style-bootstrap-responsive.css": "<%= styles_dir %>/less/refinery-style-bootstrap-responsive.less",
        }
      }
    },

    jshint: {
      files: [
        'Gruntfile.js',
        '<%= source_dir %>/<%= source_files.js %>'
      ],
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      app_scripts: {
        files: [
          {
            expand: true,
            cwd: '<%= source_dir %>/',
            src: '<%= source_files.js %>',
            dest: '<%= release_dir %>/',
            ext: '.min.js',
          },
        ]
      },
      vendor_assets: {
        files: [
          {
            '<%= vendor_dir %>/angular-ui-select2/release/select2.min.js':
            ['<%= vendor_dir %>/angular-ui-select2/src/select2.js']
          },
        ]
      },
    },

    copy: {
      app_scripts: {
        files: [
          {
            expand: true,
            cwd: '<%= source_dir %>/',
            src: ['<%= source_files.js %>'],
            dest: '<%= release_dir %>/',
          },
        ],
      },
      app_styles: {
        files: [
          {
            expand: true,
            cwd: '<%= source_dir %>/',
            src: ['<%= source_files.css %>'],
            dest: '<%= release_dir %>/',
          },
        ],
      },
      app_templates: {
        files: [
          {
            expand: true,
            cwd: '<%= source_dir %>/',
            src: ['<%= source_files.html %>'],
            dest: '<%= release_dir %>/',
          },
        ],
      },
      vendor_assets: {
        files: [
          {
            expand: true,
            cwd: 'bower_components/',
            src: [
              '<%= vendor_files.js %>',
              '<%= vendor_files.map %>',
              '<%= vendor_files.css %>',
              '<%= vendor_files.img %>',
            ],
            dest: '<%= release_dir %>/vendor/',
          },
        ],
      },
    },

    clean: {
      app_scripts: ['<%= release_dir %>/js'],
      app_styles: ['<%= release_dir %>/styles'],
      app_templates: ['<%= release_dir %>/partials'],
      vendor_assets: ['<%= release_dir %>/vendor'],
    },

    watch: {
      app_scripts: {
        files: ['<%= source_dir %>/<%= source_files.js %>'],
        tasks: ['jshint', 'clean:app_scripts', 'uglify:app_scripts', 'copy:app_scripts'],
      },
      app_styles: {
        files: ['<%= source_dir %>/<%= source_files.css %>'],
        tasks: ['clean:app_styles', 'copy:app_styles'],
      },
      app_templates: {
        files: ['<%= source_dir %>/<%= source_files.html %>'],
        tasks: ['clean:app_templates', 'copy:app_templates'],
      },
      vendor_assets: {
        files: ['<%= vendor_dir %>/<%= vendor_files.js %>',
                '<%= vendor_dir %>/<%= vendor_files.map %>',
                '<%= vendor_dir %>/<%= vendor_files.css %>',
                '<%= vendor_dir %>/<%= vendor_files.img %>'],
        tasks: ['clean:vendor_assets', 'uglify:vendor_assets', 'copy:vendor_assets'],
      },
      styles: {
        files: ['<%= styles_dir %>/less/*.less'],
        tasks: ['less'],
        options: {
          nospawn: true
        }
      }      
    },
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-less');  

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'clean', 'uglify', 'less', 'copy']);
};
