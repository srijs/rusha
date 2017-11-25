module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    sweetjs: {
      options: {
        readableNames: true
      },
      build: {
        src: '<%= pkg.name %>.sweet.js',
        dest: '<%= pkg.name %>.js'
      },
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        compress: false
      },
      build: {
        src: '<%= pkg.name %>.js',
        dest: '<%= pkg.name %>.min.js'
      }
    },
    karma: {
      options: {
        basePath: '',
        frameworks: ['browserify', 'mocha'],
        files: [
          'test.js'
        ],
        preprocessors: {
          'test.js': ['browserify']
        },
        browserify: {
          transform: ['brfs']
        },
        reporters: ['dots'],
        singleRun: true,
        customLaunchers: {
          FirefoxHeadless: {
            base: 'Firefox',
            flags: [ '-headless' ],
          },
        },
        browserNoActivityTimeout: 60000
      },
      test: {
        browsers: ['ChromeHeadless', 'FirefoxHeadless']
      }
    }
  });

  grunt.loadNpmTasks('grunt-sweet.js');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('test', ['sweetjs', 'uglify', 'karma']);

  grunt.registerTask('build', ['sweetjs', 'uglify']);

};
