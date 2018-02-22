'use strict';

var fs = require('fs');
var hasbin = require('hasbin');
var isBinaryFile = require('isbinaryfile');

/*
 * A utility function for sorting JavaScript sources.
 */
var importanceSortJS = function (a, b) {
  /*
   * Give each type of JavaScript file a category according to then they
   * should be loaded. The lower the number the earlier the files should
   * be loaded.
   */
  var objs = [a, b];
  for (var i = objs.length - 1; i >= 0; i--) {
    switch (true) {
      case objs[i].indexOf('refinery.js') >= 0:
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
      case objs[i].indexOf('route') >= 0:
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
};

module.exports = function (grunt) {
  // Auto-load all packages
  require('load-grunt-tasks')(grunt);

  // Timer
  require('time-grunt')(grunt);

  var config = grunt.file.readJSON('config.json');

  var lessPlugins = [];

  // `--autoprefix` will enable autoprefixing of CSS files for `grunt build`
  if (grunt.option('autoprefix')) {
    lessPlugins.push(
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
      })
    );
  }

  // Enable using `--fast`.
  // Double `!!` converts a value into a Boolean representation and third `!`
  // flips its value.
  var spawn = !!!grunt.option('fast');

  // Local testing, i.e. triggered on your host machine, starts all major
  // browsers and can be invoked with `--host`.
  var browsers = !!grunt.option('host') ?
    ['Chrome', 'Firefox', 'Safari'] : ['PhantomJS'];

  // Specify file globbing, e.g. `--files 'source/js/commons/**/*.js'` would get
  // all `.js` files from `source/js/commons/`. This is used for `esformatter`
  // because we might not want to alter all js files at once.
  var fileGlob = grunt.option('files') || '';

  var jsFilesByImportance = function (spec) {
    var files = [];

    // Get all files within a feature
    grunt
      .file
      .expand([
        config.basePath.ui.src + '/js/**/*.js',
        '!' + config.basePath.ui.src + '/js/**/*.spec.js'
      ])
      .forEach(function (file) {
        files.push(file);
      });

    // Sort files
    files.sort(importanceSortJS);

    if (spec) {  // Get all files within a feature
      grunt
        .file
        .expand([
          fileGlob || config.basePath.ui.src + '/js/**/*.spec.js'
        ])
        .forEach(function (file) {
          files.push(file);
        });
    }

    return files;
  };

  grunt.initConfig({
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
      uiBuildSampleFiles: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/sample-files/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.ui.build %>/sample-files/'
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
          cwd: '<%= cfg.vendorPath %>',
          src: [
            '<%= cfg.files.vendor.css %>',
            '<%= cfg.files.vendor.images %>',
            '<%= cfg.files.vendor.js %>',
            '<%= cfg.files.vendor.maps %>',
            '<%= cfg.files.vendor.font %>'
          ],
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
      uiCompileSampleFiles: {
        files: [{
          expand: true,
          cwd: '<%= cfg.basePath.ui.src %>/sample-files/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.ui.compile %>/sample-files/'
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
          cwd: '<%= cfg.vendorPath %>',
          src: [
            '<%= cfg.files.vendor.css %>',
            '<%= cfg.files.vendor.images %>',
            '<%= cfg.files.vendor.js %>',
            '<%= cfg.files.vendor.maps %>',
            '<%= cfg.files.vendor.font %>'
          ],
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
          cwd: '<%= cfg.basePath.static.src %>/sample-files/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.build %>/sample-files/'
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
          cwd: '<%= cfg.basePath.static.src %>/sample-files/',
          src: ['**/*'],
          dest: '<%= cfg.basePath.static.compile %>/sample-files/'
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
          'eslint:gruntfile',
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
          'newer:copy:uiBuildImages'
        ]
      },

      /*
       * When UI sample-files change we copy them over.
       */
      uiSampleFiles: {
        files: [
          '<%= cfg.basePath.ui.src %>/sample-files/**/*'
        ],
        tasks: [
          'newer:copy:uiBuildSampleFiles'
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
          'newer:eslint:sourceCode',
          'newer:copy:uiBuildScripts',
          'concat-by-feature:build'
        ],
        options: {
          spawn: spawn
        }
      },

      /*
       * When UI styles change we copy them over.
       */
      uiStyles: {
        files: [
          '<%= cfg.basePath.ui.src %>/styles/**/*.less'
        ],
        tasks: [
          'newer:less:build'
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
          'newer:copy:uiBuildTemplates'
        ]
      },

      /*
       * When UI vendor assets change we copy them over.
       */
      uiVendor: {
        files: [].concat.apply(
          [],
          Object.keys(config.files.vendor).map(
            function (key) {
              return config.files.vendor[key];
            }
          )
        ),
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
          'newer:copy:staticBuild'
        ]
      },

      /*
       * When any of the django templates changes we just trigger a page reload
       */
      djangoTemplates: {
        files: [
          '<%= cfg.basePath.djangoTemplates %>/**/*'
        ]
      }
    },

    /*
     * Set environmental variables
     */
    env: {
      compile: {
        PHANTOMJS_BIN: function () {
          var localPhantomJS =
            'node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs';

          // Look for a phantomjs binary of the VM by default when no `--host`
          // flag is passed to grunt
          if (fs.existsSync(localPhantomJS) &&
              isBinaryFile.sync(localPhantomJS) &&
              !!!grunt.option('host')) {
            return localPhantomJS;
          }

          if (!!grunt.option('host') && !hasbin.sync('phantomjs')) {
            throw new Error(
              'No global phantomjs binary found on your host machine.'
            );
          }

          // Use global phantomjs if it's in $path
          return 'phantomjs';
        }
      }
    },

    /*
     * Lint source JS files to find possible flaws that could lead to errors.
     */
    eslint: {
      custom: {
        src: fileGlob || ''
      },
      sourceCode: {
        src: [
          '<%= cfg.basePath.ui.src %>/js/**/*.js'
        ]
      },
      gruntfile: {
        src: 'Gruntfile.js'
      }
    },

    /*
     * Generate documentation
     */
    jsdoc: {
      dist: {
        src: [
          '<%= cfg.basePath.ui.src %>/**/!(*spec).js'
        ],
        options: {
          // Doesn't seem to work right now, so we have to specify the right
          // location manually
          // destination: '<%= cfg.basePath.ui.docs %>'
          destination: 'docs'
        }
      }
    },

    /*
     * The Karma configurations.
     */
    karma: {
      options: {
        browsers: browsers,
        configFile: 'karma.config.js',
        files: [].concat.apply(
          [],
          [
            config.files.vendor.js.map(function (script) {
              var include = true;
              if (
                script.indexOf('graphlib') >= 0 || script.indexOf('dagre') >= 0
              ) {
                include = false;
              }
              return {
                pattern: config.vendorPath + '/' + script,
                watched: false,
                included: include
              };
            }),
            [{
              pattern: 'bower_components/angular-mocks/angular-mocks.js',
              watched: false
            }],
            [{
              pattern: './karma.lodash.noConflict.js',
              watched: false
            }],
            'node_modules/phantomjs-polyfill/bind-polyfill.js',
            jsFilesByImportance(true),
            config.basePath.ui.src + '/**/*.html'
          ]
        )
      },
      unit: {}
    },

    /*
     * Translate LESS into CSS. While compiling also minify and autoprefix.
     */
    less: {
      build: {
        options: {
          paths: [
            '<%= cfg.basePath.ui.src %>/styles',
            '<%= cfg.basePath.bower_components %>/bootstrap/less'
          ],
          plugins: lessPlugins
        },
        files: {
          '<%= cfg.basePath.ui.build %>/styles/galaxy-connector.css':
            '<%= cfg.basePath.ui.src %>/styles/galaxy-connector.less',
          '<%= cfg.basePath.ui.build %>/styles/refinery-style-bootstrap-responsive.css':
            '<%= cfg.basePath.ui.src %>/styles/refinery-style-bootstrap-responsive.less',
          '<%= cfg.basePath.ui.build %>/styles/refinery-style-bootstrap.css':
            '<%= cfg.basePath.ui.src %>/styles/refinery-style-bootstrap.less',
          '<%= cfg.basePath.ui.build %>/styles/refinery-style.css':
            '<%= cfg.basePath.ui.src %>/styles/refinery-style.less',
          '<%= cfg.basePath.ui.build %>/styles/variables.css':
            '<%= cfg.basePath.ui.src %>/styles/variables.less',
          '<%= cfg.basePath.ui.build %>/styles/workflow-visualization.css':
            '<%= cfg.basePath.ui.src %>/styles/workflow-visualization.less',
          '<%= cfg.basePath.ui.build %>/styles/animate.css':
            '<%= cfg.basePath.ui.src %>/styles/animate.less',
          '<%= cfg.basePath.ui.build %>/styles/treemap.css':
            '<%= cfg.basePath.ui.src %>/styles/treemap.less',
          '<%= cfg.basePath.ui.build %>/styles/dashboard.css':
            '<%= cfg.basePath.ui.src %>/styles/dashboard.less',
          '<%= cfg.basePath.ui.build %>/styles/provenance-visualization.css':
            '<%= cfg.basePath.ui.src %>/styles/provenance-visualization.less',
          '<%= cfg.basePath.ui.build %>/styles/file-browser.css':
            '<%= cfg.basePath.ui.src %>/styles/file-browser.less'
        }
      },
      compile: {
        options: {
          paths: [
            '<%= cfg.basePath.ui.src %>/styles',
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
          '<%= cfg.basePath.ui.compile %>/styles/galaxy-connector.css':
            '<%= cfg.basePath.ui.src %>/styles/galaxy-connector.less',
          '<%= cfg.basePath.ui.compile %>/styles/refinery-style-bootstrap-responsive.css':
            '<%= cfg.basePath.ui.src %>/styles/refinery-style-bootstrap-responsive.less',
          '<%= cfg.basePath.ui.compile %>/styles/refinery-style-bootstrap.css':
            '<%= cfg.basePath.ui.src %>/styles/refinery-style-bootstrap.less',
          '<%= cfg.basePath.ui.compile %>/styles/refinery-style.css':
            '<%= cfg.basePath.ui.src %>/styles/refinery-style.less',
          '<%= cfg.basePath.ui.compile %>/styles/variables.css':
            '<%= cfg.basePath.ui.src %>/styles/variables.less',
          '<%= cfg.basePath.ui.compile %>/styles/workflow-visualization.css':
            '<%= cfg.basePath.ui.src %>/styles/workflow-visualization.less',
          '<%= cfg.basePath.ui.compile %>/styles/animate.css':
            '<%= cfg.basePath.ui.src %>/styles/animate.less',
          '<%= cfg.basePath.ui.compile %>/styles/treemap.css':
            '<%= cfg.basePath.ui.src %>/styles/treemap.less',
          '<%= cfg.basePath.ui.compile %>/styles/dashboard.css':
            '<%= cfg.basePath.ui.src %>/styles/dashboard.less',
          '<%= cfg.basePath.ui.compile %>/styles/provenance-visualization.css':
            '<%= cfg.basePath.ui.src %>/styles/provenance-visualization.less',
          '<%= cfg.basePath.ui.compile %>/styles/file-browser.css':
            '<%= cfg.basePath.ui.src %>/styles/file-browser.less'
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
            src: ['**/*.js', '!**/*.spec.js'],
            dest: '<%= cfg.basePath.ui.tmp %>/js'
          }
        ]
      }
    },

    /*
     * Load `package.json` for meta data.
     */
    pkg: grunt.file.readJSON('package.json'),

    /*
     * Minify JS
     */
    uglify: {
      ui: {
        options: {
          banner: '/*! <%= pkg.name %> ' +
            '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
          sourceMap: true
        },
        files: [
          {
            expand: true,
            cwd: '<%= cfg.basePath.ui.tmp %>/js',
            src: '**/*.js',
            dest: '<%= cfg.basePath.ui.compile %>/js'
          }
        ]
      },
      vendorAssets: {
        files: [
          {
          }
        ]
      }
    }
  });

  grunt.registerTask(
    'concat-by-feature',
    'Concat files by features excluding `spec` files',
    function (mode) {
      // Read config
      var cfg = grunt.file.readJSON('config.json');
      var concat = grunt.config.get('concat') || {};
      var destination = mode === 'build' ?
            cfg.basePath.ui.build : cfg.basePath.ui.tmp;
      var features = cfg.files.features;
      var files;
      var ngAnnotate = grunt.config.get('ngAnnotate') || {};

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
            process: function (src, filepath) {
              return '// Source: ' + filepath + '\n' +
                src.replace(
                  /(^|\n)[ \t]*('use strict'|"use strict");?\s*/g,
                  '$1'
                );
            }
          },
          src: files,
          dest: destination + '/js/' + feature.replace('/', '.') + '.js'
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

  // Event handling
  // if (!spawn) {
  //   grunt.event.on('watch', function (action, filepath) {
  //     // Update the config to only build the changed less file.
  //     grunt.config(['eslint', 'src'], filepath);
  //   });
  // }

  // Default task.
  grunt.registerTask('default', ['make', 'test']);

  // Task for running unit tests
  grunt.registerTask('test', ['env:compile', 'karma']);

  // Complete build
  grunt.registerTask('make', ['uglify:vendorAssets', 'build', 'compile']);

  // Do as little as possible to get Refineryrunning to keep grunt watch
  // responsive.
  grunt.registerTask('build', [
    'newer:eslint:sourceCode',
    'newer:eslint:gruntfile',
    'clean:uiBuild',
    'clean:staticBuild',
    'newer:less:build',
    'newer:copy:uiBuildImages',
    'newer:copy:uiBuildSampleFiles',
    'newer:copy:uiBuildScripts',
    'newer:copy:uiBuildTemplates',
    'newer:copy:uiBuildVendor',
    'newer:copy:staticBuild',
    'concat-by-feature:build'
  ]);

  // Do all the heavy lifting to get Refinery ready for production.
  grunt.registerTask('compile', [
    'env:compile',
    'eslint:sourceCode',
    'clean:uiCompile',
    'clean:staticCompile',
    'less:compile',
    // IMPORTANT:
    // `concat-by-feature:compile` has to be called before `ngAnnotate` because
    // it adds features to the `ngAnnotate` task.
    'concat-by-feature:compile',
    'ngAnnotate',
    'uglify:ui',
    'copy:uiCompileImages',
    'copy:uiCompileSampleFiles',
    'copy:uiCompileTemplates',
    'copy:uiCompileVendor',
    'copy:staticCompile',
    'clean:uiTmp',
    'jsdoc'
  ]);

  grunt.renameTask('watch', 'delta');
  grunt.registerTask('watch', [
    'build',
    'delta'
  ]);
};
