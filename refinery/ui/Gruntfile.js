module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    source_dir: 'src',
    release_dir: 'release',

    app_files: {
      js: ['<%= source_dir %>/**/*.js'],
      css: ['<%= source_dir %>/**/*.css'],
    },
    vendor_files: {
      js: [
        'select2/select2.js',
        'jquery/jquery.js',
        'angular/angular.js',
        'angular-ui-select2/src/select2.js',        
      ],
      css: [
        'select2/select2.css',
      ],
      img: [
        'select2/select2.png', 'select2/select2-spinner.gif',
      ],
    },

    jshint: {
      files: ['Gruntfile.js', '<%= app_files.js %>'],
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      files: {
        expand: true,
        cwd: 'src/',
        src: 'js/**/*.js',
        dest: '<%= release_dir %>/',
        ext: '.min.js',
      },
    },

    copy: {
      app_assets: {
        files: [
          {
            expand: true,
            cwd: '<%= source_dir %>/',
            src: ['**'],
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
              '<%= vendor_files.css %>',
              '<%= vendor_files.img %>',
            ],
            dest: '<%= release_dir %>/vendor/',
          },
        ],
      },
    },

    clean: ['<%= release_dir %>'],

    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'uglify'],
    },
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'uglify', 'copy']);

};
