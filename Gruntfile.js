module.exports = function (grunt) {

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
    browserify: {
      options: {
        transform: ['sweetify'],
        browserifyOptions: {
          standalone: 'Rusha'
        }
      },
      build: {
        files: {
          'dist/rusha.js': ['src/index.js']
        }
      }
    },
    karma: {
      options: {
        basePath: '',
        singleRun: true,
        files: [],
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
          frameworks: ['browserify', 'mocha'],
          reporters: ['dots'],
          files: ['test/unit/*.js'],
          preprocessors: {
            'test/unit/*.js': ['browserify']
          },
          browsers: ['ChromeHeadless', 'FirefoxHeadless']
        }
      },
      functional: {
        options: {
          frameworks: ['browserify', 'mocha'],
          reporters: ['dots'],
          files: ['test/functional/*.js'],
          preprocessors: {
            'test/functional/*.js': ['browserify']
          },
          browserify: {
            transform: ['brfs']
          },
          browsers: ['ChromeHeadless', 'FirefoxHeadless']
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
          browsers: ['ChromeHeadless', 'FirefoxHeadless']
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
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('test', ['eslint', 'browserify', 'uglify', 'karma:unit', 'karma:functional']);
  grunt.registerTask('benchmark', ['browserify', 'uglify', 'karma:benchmark']);

  grunt.registerTask('build', ['eslint', 'browserify', 'uglify']);

};
