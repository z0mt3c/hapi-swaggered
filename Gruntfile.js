module.exports = function (grunt) {
    // load grunt tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-release');
    grunt.loadNpmTasks('grunt-lab');

    // Project configuration.
    grunt.initConfig({
        release: {
            options: {
                tagName: 'v<%= version %>'
            }
        },
        watch: {
            scripts: {
                files: ['<%= jshint.all %>'],
                tasks: ['test']
            }
        },
        lab: {
            color: true,
            coverage: true,
            minCoverage: 99
            //reporter: 'html',
            //reportFile: './coverage.html'
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
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
    grunt.registerTask('test', ['jshint', 'lab:report']);
    grunt.registerTask('default', ['test', 'watch']);
};