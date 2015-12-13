/**
 * Autor: Evstigneev Andrey
 * Date: 12.11.2015
 * Time: 21:29
 */

'use strict';

var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    istanbul = require('gulp-istanbul'),
    jshint = require('gulp-jshint'),
    sequence = require('gulp-sequence'),
    codacy = require('gulp-codacy'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    rimraf = require('rimraf'),

    PATH_TO_SRC = './src/index.js',
    PATH_TO_COVERAGE_FOLDER = './coverage',
    PATH_TO_DIST = './dist',
    DIST_FILENAME = 'birch.js',
    PATH_TO_LCOV_FILE = PATH_TO_COVERAGE_FOLDER + '/lcov.info',
    SRC_TEST_RUNNER = './test/src-runner.js',
    DIST_TEST_RUNNER = './test/dist-runner.js',
    CODACY_TOKEN = 'c65a118dc7434d519cbde3d0cd238916';

gulp.task('test.instrument', function(){
    return gulp.src(PATH_TO_SRC)
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire());
});

gulp.task('test', ['jshint', 'test.instrument'], function(){
    return gulp.src(SRC_TEST_RUNNER, {read : false})
        .pipe(mocha())
        .pipe(istanbul.writeReports({dir: PATH_TO_COVERAGE_FOLDER}));
});

gulp.task('dist-verification', function(){
    return gulp.src(DIST_TEST_RUNNER, {read: false})
        .pipe(mocha());
});

gulp.task('jshint', function(){
    return gulp.src(PATH_TO_SRC)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('build.clean', function(callback){
    rimraf(PATH_TO_DIST, callback);
});

gulp.task('build.compile', function(){
    return browserify(PATH_TO_SRC, {standalone : 'birch', debug : true})
        .bundle()
        .pipe(source(DIST_FILENAME))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(PATH_TO_DIST));
});

gulp.task('build.minify', function(){
    return gulp.src(PATH_TO_DIST + '/' + DIST_FILENAME)
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(rename({extname : '.min.js'}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(PATH_TO_DIST));
});

gulp.task('build', sequence('build.clean', 'build.compile', 'build.minify'));

gulp.task('codacy', function(){
    return gulp.src(PATH_TO_LCOV_FILE)
        .pipe(codacy({token : CODACY_TOKEN}));
});

gulp.task('deploy', sequence('test', 'build', 'dist-verification'));

gulp.task('after-deploy', ['codacy']);