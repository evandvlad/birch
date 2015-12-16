/**
 * Autor: Evstigneev Andrey
 * Date: 12.11.2015
 * Time: 21:29
 */

'use strict';

import gulp from 'gulp';
import mocha from 'gulp-mocha';
import istanbul from 'gulp-istanbul';
import jshint from 'gulp-jshint';
import sequence from 'gulp-sequence';
import codacy from 'gulp-codacy';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import header from 'gulp-header';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import rimraf from 'rimraf';
import {Instrumenter} from 'isparta';
import pkg from './package.json';

const PATH_TO_SRC = './src/**/*.js';
const PATH_TO_SRC_INDEX_FILE = './src/index.js';
const PATH_TO_COVERAGE_FOLDER = './coverage';
const PATH_TO_DIST = './dist';
const DIST_FILENAME = 'birch.js';
const PATH_TO_LCOV_FILE = PATH_TO_COVERAGE_FOLDER + '/lcov.info';
const SRC_TEST_RUNNER = './test/src-runner.js';
const DIST_TEST_RUNNER = './test/dist-runner.js';

const CODACY_TOKEN = 'c65a118dc7434d519cbde3d0cd238916';

gulp.task('test.instrument', () => {
    return gulp.src(PATH_TO_SRC)
        .pipe(istanbul({
            instrumenter: Instrumenter,
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire());
});

gulp.task('test', ['jshint', 'test.instrument'], () => {
    return gulp.src(SRC_TEST_RUNNER, {read : false})
        .pipe(mocha())
        .pipe(istanbul.writeReports({dir: PATH_TO_COVERAGE_FOLDER}));
});

gulp.task('dist-verification', () => {
    return gulp.src(DIST_TEST_RUNNER, {read: false})
        .pipe(mocha());
});

gulp.task('jshint', () => {
    return gulp.src(PATH_TO_SRC)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('build.clean', (callback) => {
    rimraf(PATH_TO_DIST, callback);
});

gulp.task('build.compile', () => {
    return browserify(PATH_TO_SRC_INDEX_FILE, {standalone : 'birch', debug : true})
        .transform(babelify)
        .bundle()
        .pipe(source(DIST_FILENAME))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(PATH_TO_DIST));
});

gulp.task('build.minify', () => {
    return gulp.src(PATH_TO_DIST + '/' + DIST_FILENAME)
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(rename({extname : '.min.js'}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(PATH_TO_DIST));
});

gulp.task('build.version', () => {
    return gulp.src(PATH_TO_DIST + '/*.js')
        .pipe(header(
            '// version: <%= version %>, timestamp: <%= timestamp %>\n\n',
            {version : pkg.version, timestamp : Date.now()})
        )
        .pipe(gulp.dest(PATH_TO_DIST));
});

gulp.task('build', sequence('build.clean', 'build.compile', 'build.minify', 'build.version'));

gulp.task('codacy', () => {
    return gulp.src(PATH_TO_LCOV_FILE)
        .pipe(codacy({token : CODACY_TOKEN}));
});

gulp.task('deploy', sequence('test', 'build', 'dist-verification'));

gulp.task('after-deploy', ['codacy']);