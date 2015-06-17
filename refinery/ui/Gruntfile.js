module.exports = function(grunt) {
  'use strict';

  // Auto-load all packages
  require('load-grunt-tasks')(grunt);

  // Timer
  require('time-grunt')(grunt);

  grunt.initConfig({
    /*
     * Add vendor prefixes to out CSS to ensure better browser support.
     */
    autoprefixer: {
      options: {
        browsers: [
          '> 5%',
          'last 2 versions',
          'Firefox ESR',
          'Explorer >= 10',
          'iOS >= 6',
          'Opera >= 12',
          'Safari >= 6'
        ]
      },
      styles: {
        files: [
          {
            expand: true,
            cwd: '<%= cfg.basePath.ui.src %>/styles',
            src: ['**/*.css'],
            dest: '<%= cfg.basePath.ui.tmp %>/styles'
          }
        ]
      }
    },

    /*
     * Read configs from `config.json`. Separating scripts and configs help
     * to keep things readable.
     */
    cfg: grunt.file.readJSON('config.json'),

    /*
     * Cleaning tasks for all non-source directory for building and compiling
     * assets.
     */
    clean: {
      options: {
        // We need this because the static dirs are outside of Grunt's root
        force: true
      },
      uiBuild: [
        '<%= cfg.basePath.ui.build %>'
      ],
      uiCompile: [
        '<%= cfg.basePath.ui.compile %>'
      ],
      uiTmp: [
        '<%= cfg.basePath.ui.tmp %>'
      ],
      staticBuild: [
        '<%= cfg.basePath.static.build %>'
      ],
      staticCompile: [
        '<%= cfg.basePath.static.compile %>'
      ]
    },

    /*
     *
     */
    copy: {
      uiBuildImages: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/images/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.ui.build %>/images/'
        }]
      },
      uiBuildScripts: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/js/',
          src: ['**/*.js'],
          dest: '<%= cfg.basePath.ui.build %>/js/'
        }]
      },
      uiBuildStyles: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/styles/',
          src: ['**/*.css'],
          dest: '<%= cfg.basePath.ui.build %>/styles/'
        }]
      },
      uiBuildTemplates: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/partials/',
          src: ['**/*.html'],
          dest: '<%= cfg.basePath.ui.build %>/partials/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/js/',
          src: ['**/*.html'],
          dest: '<%= cfg.basePath.ui.build %>/partials/'
        }]
      },
      uiBuildVendor: {
        files: [{
          expand: true,
          cwd: '<%= cfg.vendorPath %>/',
          src: ['<%= cfg.files.vendor %>'],
          dest: '<%= cfg.basePath.ui.build %>/vendor/'
        }]
      },
      uiCompileImages: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/images/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.ui.compile %>/images/'
        }]
      },
      uiCompileTemplates: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/partials/',
          src: ['**/*.html'],
          dest: '<%= cfg.basePath.ui.compile %>/partials/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/js/',
          src: ['**/*.html'],
          dest: '<%= cfg.basePath.ui.compile %>/partials/'
        }]
      },
      uiCompileVendor: {
        files: [{
          expand: true,
          cwd: '<%= cfg.vendorPath %>/',
          src: ['<%= cfg.files.vendor %>'],
          dest: '<%= cfg.basePath.ui.compile %>/vendor/'
        }]
      },
      staticBuild: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/images/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.build %>/images/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/js/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.build %>/js/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/styles/font/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.build %>/styles/font/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/styles/img/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.build %>/styles/img/'
        }]
      },
      staticCompile: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/images/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.compile %>/images/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/js/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.compile %>/js/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/styles/font/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.compile %>/styles/font/'
        }, {
          expand: true,
          cwd: '<%= cfg.basePath.static.src %>/styles/img/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.compile %>/styles/img/'
        }]
      }
    },

    /*
     * Minify CSS.
     */
    cssmin: {
      ui: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.tmp %>/styles',
          src: ['**/*.css'],
          dest: '<%= cfg.basePath.ui.compile %>/styles'
        }]
      }
    },

    /*
     * And for rapid development, we have a watch set up that checks to see if
     * any of the files listed below change, and then to execute the listed
     * tasks when they do. This just saves us from having to type "grunt" into
     * the command-line every time we want to see what we're working on; we can
     * instead just leave "grunt watch" running in a background terminal. Set it
     * and forget it, as Ron Popeil used to tell us.
     *
     * But we don't need the same thing to happen for all the files.
     */
    delta: {
      /*
       * By default, we want the Live Reload to work for all tasks; this is
       * overridden in some tasks (like this file) where browser resources are
       * unaffected. It runs by default on port 35729, which your browser
       * plugin should auto-detect.
       */
      options: {
        livereload: 35729
      },

      /*
       * When the Gruntfile changes, we just want to lint it. In fact, when
       * your Gruntfile changes, it will automatically be reloaded!
       */
      config: {
        files: 'config.json',
        tasks: [
          'build'
        ]
      },

      /*
       * When the Gruntfile changes, we just want to lint it. In fact, when
       * your Gruntfile changes, it will automatically be reloaded!
       */
      gruntfile: {
        files: 'Gruntfile.js',
        tasks: [
          'jshint:gruntfile',
          'build'
        ]
      },

      /*
       * When UI images change we copy them over.
       */
      uiImages: {
        files: [
          '<%= cfg.basePath.ui.src %>/images/**/*'
        ],
        tasks: [
          'copy:uiBuildImages'
        ]
      },

      /*
       * When UI script files change we lint them and copy them over.
       */
      uiScripts: {
        files: [
          '<%= cfg.basePath.ui.src %>/js/**/*.js'
        ],
        tasks: [
          'jshint:src',
          'copy:uiBuildScripts',
          'concat-by-feature:build'
        ]
      },

      /*
       * When UI styles change we copy them over.
       */
      uiStyles: {
        files: [
          '<%= cfg.basePath.ui.src %>/styles/**/*.css'
        ],
        tasks: [
          'copy:uiBuildStyles'
        ]
      },

      /*
       * When UI templates change we copy them over.
       */
      uiTemplates: {
        files: [
          '<%= cfg.basePath.ui.src %>/**/*.html'
        ],
        tasks: [
          'copy:uiBuildTemplates'
        ]
      },

      /*
       * When UI vendor assets change we copy them over.
       */
      uiVendor: {
        files: [
          '<%= cfg.vendorPath %>/**/*'
        ],
        tasks: [
          'copy:uiBuildVendor'
        ]
      },

      /*
       * When static script files change we copy them over.
       */
      staticScripts: {
        files: [
          '<%= cfg.basePath.static.src %>/js/**/*.js'
        ],
        tasks: [
          'copy:staticBuild'
        ]
      },

      /*
       * When static LESS files change we translate them.
       */
      staticStyles: {
        files: [
          '<%= cfg.basePath.static.src %>/styles/less/*.less'
        ],
        tasks: [
          'less:build'
        ]
      },

      /*
       * When any of the django templates changes we just trigger a page reload
       */
      djangoTemplates: {
        files: [
          '<%= cfg.basePath.djangoTemplates %>/**/*'
        ]
      },
    },

    /*
     * Lint source JS files to find possible flaws that could lead to errors.
     * Custom code
     */
    jshint: {
      src: [
        '<%= cfg.basePath.ui.src %>/js/**/*.js'
      ],
      gruntfile: [
        'Gruntfile.js'
      ],
      options: {
        curly: true,
        // This should actually be false to stop grunt from further execution
        force: true,
        immed: true,
        newcap: true,
        noarg: true,
        sub: true,
        boss: true,
        eqnull: true
      }
    },

    karma: {
      unit: {
      configFile: 'karma.conf.js'
      }
    },

    /*
     * Translate LESS into CSS. While compiling also minify and autoprefix.
     */
    less: {
      build: {
        options: {
          paths: [
            '<%= cfg.basePath.static.src %>/styles/less',
            '<%= cfg.basePath.static.src %>/js/bootstrap/less'
          ]
        },
        files: {
          '<%= cfg.basePath.static.build %>/styles/css/font-awesome-ie7.css': '<%= cfg.basePath.static.src %>/styles/less/font-awesome-ie7.less',
          '<%= cfg.basePath.static.build %>/styles/css/font-awesome.css': '<%= cfg.basePath.static.src %>/styles/less/font-awesome.less',
          '<%= cfg.basePath.static.build %>/styles/css/galaxy_connector.css': '<%= cfg.basePath.static.src %>/styles/less/galaxy_connector.less',
          '<%= cfg.basePath.static.build %>/styles/css/refinery-style-bootstrap-responsive.css': '<%= cfg.basePath.static.src %>/styles/less/refinery-style-bootstrap-responsive.less',
          '<%= cfg.basePath.static.build %>/styles/css/refinery-style-bootstrap.css': '<%= cfg.basePath.static.src %>/styles/less/refinery-style-bootstrap.less',
          '<%= cfg.basePath.static.build %>/styles/css/refinery-style.css': '<%= cfg.basePath.static.src %>/styles/less/refinery-style.less',
          '<%= cfg.basePath.static.build %>/styles/css/variables.css': '<%= cfg.basePath.static.src %>/styles/less/variables.less',
          '<%= cfg.basePath.static.build %>/styles/css/workflow_visualization.css': '<%= cfg.basePath.static.src %>/styles/less/workflow_visualization.less',
          '<%= cfg.basePath.static.build %>/styles/css/animate.css': '<%= cfg.basePath.static.src %>/styles/less/animate.less',
        }
      },
      compile: {
        options: {
          paths: [
            '<%= cfg.basePath.static.src %>/styles/less',
            '<%= cfg.basePath.static.src %>/js/bootstrap/less'
          ],
          plugins: [
            new (require('less-plugin-autoprefix'))({
              browsers: [
                '> 5%',
                'last 2 versions',
                'Firefox ESR',
                'Explorer >= 10',
                'iOS >= 6',
                'Opera >= 12',
                'Safari >= 6'
              ]
            }),
            new (require('less-plugin-clean-css'))()
          ]
        },
        files: {
          '<%= cfg.basePath.static.compile %>/styles/css/font-awesome.css': '<%= cfg.basePath.static.src %>/styles/less/font-awesome.less',
          '<%= cfg.basePath.static.compile %>/styles/css/font-awesome-ie7.css': '<%= cfg.basePath.static.src %>/styles/less/font-awesome-ie7.less',
          '<%= cfg.basePath.static.compile %>/styles/css/variables.css': '<%= cfg.basePath.static.src %>/styles/less/variables.less',
          '<%= cfg.basePath.static.compile %>/styles/css/refinery-style.css': '<%= cfg.basePath.static.src %>/styles/less/refinery-style.less',
          '<%= cfg.basePath.static.compile %>/styles/css/refinery-style-bootstrap.css': '<%= cfg.basePath.static.src %>/styles/less/refinery-style-bootstrap.less',
          '<%= cfg.basePath.static.compile %>/styles/css/refinery-style-bootstrap-responsive.css': '<%= cfg.basePath.static.src %>/styles/less/refinery-style-bootstrap-responsive.less'
        }
      }
    },

    /*
     * `ng-annotate` annotates the sources before minifying. That is, it
     * provides a back up solution if we forgot about the array syntax. Still
     * we should not trust the plugin to cover all cases.
     */
    ngAnnotate: {
      options: {
        singleQuotes: true
      },
      compile: {
        files: [
          {
            expand: true,
            cwd: '<%= cfg.basePath.ui.src %>/js',
            src: ['**/*.js'],
            dest: '<%= cfg.basePath.ui.tmp %>/js'
          }
        ]
      },
    },

    /*
     * Load `package.json` for meta data.
     */
    pkg: grunt.file.readJSON('package.json'),

    /*
     * Minify JS
     */
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        sourceMap: true
      },
      ui: {
        files: [
          {
            expand: true,
            cwd: '<%= cfg.basePath.ui.tmp %>/js',
            src: '**/*.js',
            dest: '<%= cfg.basePath.ui.compile %>/'
          }
        ]
      },
      vendor_assets: {
        files: [
          {
            '<%= cfg.vendorPath %>/angular-ui-select2/release/select2.min.js':
            ['<%= cfg.vendorPath %>/angular-ui-select2/src/select2.js']
          }
        ]
      }
    }
  });

  grunt.registerTask(
    'concat-by-feature',
    'Concat files by features excluding `spec` files',
    function(mode) {
      /*
       * A utility function for sorting JavaScript sources.
       */
      function importanceSortJS (a, b) {
        /*
         * Give each type of JavaScript file a category according to then they
         * should be loaded. The lower the number the earlier the files should
         * be loaded.
         */
        var objs = [a, b];
        for (var i = objs.length - 1; i >= 0; i--) {
          switch (true) {
            case objs[i].indexOf('vendor') >= 0:
              objs[i] = 0;
              break;
            case objs[i].indexOf('module') >= 0:
              objs[i] = 1;
              break;
            case objs[i].indexOf('settings') >= 0:
              objs[i] = 2;
              break;
            case objs[i].indexOf('config') >= 0:
              objs[i] = 3;
              break;
            case objs[i].indexOf('state') >= 0:
              objs[i] = 4;
              break;
            case objs[i].indexOf('controller') >= 0:
              objs[i] = 5;
              break;
            case objs[i].indexOf('directives') >= 0:
              objs[i] = 6;
              break;
            case objs[i].indexOf('services') >= 0:
              objs[i] = 7;
              break;
            case objs[i].indexOf('filters') >= 0:
              objs[i] = 8;
              break;
            case objs[i].indexOf('libraries') >= 0:
              objs[i] = 9;
              break;
            default:
              objs[i] = 10;
              break;
          }
        }
        return objs[0] - objs[1];
      }

      // Read config
      var cfg = grunt.file.readJSON('config.json'),
          concat = grunt.config.get('concat') || {},
          destination = mode === 'build' ? cfg.basePath.ui.build : cfg.basePath.ui.tmp,
          features = cfg.files.features,
          files,
          ngAnnotate = grunt.config.get('ngAnnotate') || {};

      // Loop over all features
      features.forEach(function (feature) {
        files = [];
        // Get all files within a feature
        grunt
          .file
          .expand([
            cfg.basePath.ui.src + '/js/' + feature + '/**/*.js',
            '!' + cfg.basePath.ui.src + '/js/' + feature + '/**/*.spec.js'
          ])
          .forEach(function (file) {
            files.push(file);
          });

        // Sort files
        files.sort(importanceSortJS);

        // Add module prefix and suffix
        files.unshift('module.prefix');
        files.push('module.suffix');

        concat[feature] = {
          options: {
            // Remove all 'use strict' statements
            process: function(src, filepath) {
              return '// Source: ' + filepath + '\n' +
                src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
            },
          },
          src: files,
          dest: destination + '/js/' + feature + '.js'
        };
      });
      // save the new concat configuration
      grunt.config.set('concat', concat);

      // when finished run the concatinations
      grunt.task.run('concat');

      // Make sure to annotate features in place.
      // ngAnnotate will be called by the compile script just after this task
      // has finished.
      if (mode === 'compile') {
        ngAnnotate.features = {
          files: [{
            expand: true,
            src: features.map(function (feature) {
              return feature + '.js';
            }),
            cwd: cfg.basePath.ui.tmp + '/js',
            dest: cfg.basePath.ui.tmp + '/js'
          }]
        };
        grunt.config.set('ngAnnotate', ngAnnotate);
      }
    }
  );

  // Default task.
  grunt.registerTask('default', ['compile']);

  // Do as little as possible to get Refinery running to keep grunt watch
  // responsive.
  grunt.registerTask('build', [
    'jshint',
    'clean:uiBuild',
    'clean:staticBuild',
    'less:build',
    'copy:uiBuildImages',
    'copy:uiBuildScripts',
    'copy:uiBuildStyles',
    'copy:uiBuildTemplates',
    'copy:uiBuildVendor',
    'copy:staticBuild',
    'concat-by-feature:build'
  ]);

  // Do all the heavy lifting to get Refinery ready for production.
  grunt.registerTask('compile', [
    'jshint',
    'clean:uiCompile',
    'clean:staticCompile',
    'less:compile',
    'autoprefixer',
    'cssmin',
    // IMPORTANT:
    // `concat-by-feature:compile` has to be called before `ngAnnotate` because
    // it adds features to the `ngAnnotate` task.
    'concat-by-feature:compile',
    'ngAnnotate',
    'uglify',
    'copy:uiCompileImages',
    'copy:uiCompileTemplates',
    'copy:uiCompileVendor',
    'copy:staticCompile',
    'clean:uiTmp'
  ]);

  grunt.renameTask('watch', 'delta');
  grunt.registerTask('watch', [
    'build',
    'delta'
  ]);
};
