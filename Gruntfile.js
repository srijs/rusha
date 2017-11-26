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
        frameworks: ['browserify', 'mocha'],
        files: [
          'test/*.js'
        ],
        preprocessors: {
          'test/*.js': ['browserify']
        },
        browserify: {
          transform: ['brfs']
        },
        reporters: ['dots'],
        singleRun: true,
        customLaunchers: {
          FirefoxHeadless: {
            base: 'Firefox',
            flags: ['-headless'],
          },
        },
        browserNoActivityTimeout: 60000
      },
      test: {
        browsers: ['ChromeHeadless', 'FirefoxHeadless']
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

  grunt.registerTask('test', ['eslint', 'browserify', 'uglify', 'karma']);

  grunt.registerTask('build', ['eslint', 'browserify', 'uglify']);

};
