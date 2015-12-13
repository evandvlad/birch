/**
 * Autor: Evstigneev Andrey
 * Date: 12.11.2015
 * Time: 21:29
 */

'use strict';

var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    istanbul = require('gulp-istanbul'),
    codacy = require('gulp-codacy'),

    PATH_TO_SRC = './birch.js',
    PATH_TO_TESTS = './test/**.js',
    PATH_TO_COVERAGE_FOLDER = './coverage',
    PATH_TO_LCOV_FILE = PATH_TO_COVERAGE_FOLDER + '/lcov.info',
    CODACY_TOKEN = 'c65a118dc7434d519cbde3d0cd238916';

gulp.task('test.instrument', function(){
    return gulp.src(PATH_TO_SRC)
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire());
});

gulp.task('test', ['test.instrument'], function(){
    return gulp.src(PATH_TO_TESTS, {read : false})
        .pipe(mocha())
        .pipe(istanbul.writeReports({dir: PATH_TO_COVERAGE_FOLDER}));
});

gulp.task('codacy', function(){
    return gulp.src(PATH_TO_LCOV_FILE)
        .pipe(codacy({token : CODACY_TOKEN}));
});

gulp.task('deploy', ['test']);

gulp.task('after-deploy', ['codacy']);