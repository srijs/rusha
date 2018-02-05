module.exports = function (grunt) {
  const browsers = ['ChromeHeadless', 'FirefoxHeadless'];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        compress: false
      },
      build: {
        src: 'dist/<%= pkg.name %>.js',
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    karma: {
      options: {
        basePath: '',
        singleRun: true,
        logLevel: 'WARN',
        files: [],
        reporters: ['mocha'],
        mochaReporter: {
          showDiff: true
        },
        customLaunchers: {
          FirefoxHeadless: {
            base: 'Firefox',
            flags: ['-headless'],
          },
        },
        browserNoActivityTimeout: 60000
      },
      unit: {
        options: {
          frameworks: ['browserify', 'mocha', 'chai'],
          files: ['test/unit/*.js'],
          preprocessors: {
            'test/unit/*.js': ['browserify']
          },
          browsers
        }
      },
      fuzz: {
        options: {
          frameworks: ['browserify', 'mocha', 'chai'],
          files: ['test/fuzz.js'],
          preprocessors: {
            'test/fuzz.js': ['browserify']
          },
          browsers
        }
      },
      functional: {
        options: {
          frameworks: ['browserify', 'mocha', 'chai-as-promised', 'chai'],
          files: ['test/functional/*.js'],
          preprocessors: {
            'test/functional/*.js': ['browserify']
          },
          browserify: {
            transform: ['brfs']
          },
          browsers
        }
      },
      compatibilityWithVanillaScript: {
        options: {
          frameworks: ['mocha', 'chai-as-promised', 'chai'],
          files: [
            'test/compat/vanilla_script.js',
            'dist/rusha.min.js'
          ],
          browsers
        }
      },
      compatibilityWithVanillaWorker: {
        options: {
          frameworks: ['mocha', 'chai-as-promised', 'chai'],
          files: [
            'test/compat/vanilla_worker.js',
            {pattern: 'dist/rusha.min.js', included: false, served: true}
          ],
          browsers
        }
      },
      compatibilityWithBrowserify: {
        options: {
          frameworks: ['mocha', 'chai-as-promised', 'chai', 'browserify'],
          files: [
            'test/compat/require.js',
          ],
          preprocessors: {
            'test/compat/require.js': ['browserify']
          },
          browsers
        }
      },
      compatibilityWithWebpack: {
        options: {
          frameworks: ['mocha', 'chai-as-promised', 'chai'],
          files: [
            'test/compat/require.js',
          ],
          preprocessors: {
            'test/compat/require.js': ['webpack']
          },
          browsers
        }
      },
      benchmark: {
        options: {
          frameworks: ['browserify', 'benchmark'],
          reporters: ['benchmark'],
          files: ['perf/benchmark.js'],
          preprocessors: {
            'perf/benchmark.js': ['browserify']
          },
          browsers
        }
      }
    },
    eslint: {
      target: [
        'src/*.js'
      ]
    }
  });

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('test', [
    'eslint',
    'buildWebpack',
    'uglify',
    'karma:unit',
    'karma:fuzz',
    'karma:functional',
    'karma:compatibilityWithVanillaScript',
    'karma:compatibilityWithVanillaWorker',
    'karma:compatibilityWithBrowserify',
    'karma:compatibilityWithWebpack'
  ]);

  grunt.registerTask('test:unit', [
    'eslint',
    'buildWebpack',
    'uglify',
    'karma:unit'
  ]);

  grunt.registerTask('benchmark', ['buildWebpack', 'uglify', 'karma:benchmark']);

  grunt.registerTask('build', ['eslint', 'buildWebpack', 'uglify']);

  grunt.registerTask('buildWebpack', 'create dist using Webpack', function() {
    var done = this.async();

    grunt.util.spawn({
      cmd: './node_modules/.bin/webpack',
    }, function() {
      grunt.log.ok('dist created');
      done();
    });
  });
};
