module.exports = function(grunt) {
    // load grunt tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-shell');

    // Project configuration.
    grunt.initConfig({
        watch: {
            scripts: {
                files: ['<%= jshint.all %>'],
                tasks: ['test']
            }
        },
        shell: {
            test: {
                options: {
                    failOnError: false
                },
                command: 'make test'
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
    grunt.registerTask('coverage', ['shell:coverage']);
    grunt.registerTask('report', ['shell:report']);
    grunt.registerTask('test', ['jshint', 'shell:test']);
    grunt.registerTask('default', ['test', 'watch']);
};