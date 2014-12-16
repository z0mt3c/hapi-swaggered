module.exports = function(grunt) {
    // load grunt tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Project configuration.
    grunt.initConfig({
        watch: {
            scripts: {
                files: ['<%= jshint.all %>'],
                tasks: ['jshint']
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish'),
                force: true
            },
            all: [
                'Gruntfile.js',
                'lib/*.js',
                'test/*.js',
                'index.js'
            ]
        }
    });

    // Default task.
    grunt.registerTask('default', ['jshint', 'watch']);
};