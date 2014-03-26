module.exports = (grunt) ->
  
  grunt.task.loadTasks 'misc/gruntcomponents/tasks'
  grunt.task.loadNpmTasks 'grunt-contrib-coffee'
  grunt.task.loadNpmTasks 'grunt-contrib-watch'
  grunt.task.loadNpmTasks 'grunt-contrib-concat'
  grunt.task.loadNpmTasks 'grunt-contrib-uglify'
  grunt.task.loadNpmTasks 'grunt-mocha'

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')
    banner: """
      /*! <%= pkg.name %> (<%= pkg.repository.url %>)
       * lastupdate: <%= grunt.template.today("yyyy-mm-dd") %>
       * version: <%= pkg.version %>
       * author: <%= pkg.author %>
       * License: MIT */

      """

    growl:

      ok:
        title: 'COMPLETE!!'
        msg: '＼(^o^)／'

    coffee:

      libself:
        src: [ 'jquery.deferredPipeLine.coffee' ]
        dest: 'jquery.deferredPipeLine.js'

      test_common:
        src: [ 'tests/mocha/common/test.coffee' ]
        dest: 'tests/mocha/common/test.js'

    concat:

      banner:
        options:
          banner: '<%= banner %>'
        src: [ '<%= coffee.libself.dest %>' ]
        dest: '<%= coffee.libself.dest %>'

    uglify:

      options:
        banner: '<%= banner %>'
      libself:
        src: '<%= concat.banner.dest %>'
        dest: 'jquery.deferredPipeLine.min.js'

    mocha:

      all: [ 'tests/mocha/**/*.html' ]
      
      common:
        src: [ 'tests/mocha/common/index.html' ]

    watch:

      libself:
        files: [
          '<%= coffee.libself.src %>'
        ]
        tasks: [
          'default'
        ]

      test_common:
        files: [ '<%= coffee.test_common.src %>' ]
        tasks: [
          'coffee:test_common'
          'mocha:common'
        ]

  grunt.registerTask 'default', [
    'coffee'
    'concat'
    'uglify'
    'mocha:all'
    'growl:ok'
  ]

