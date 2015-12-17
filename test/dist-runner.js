/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 1:31
 */

'use strict';

var tests = require('./spec/birch'),
    examples = require('./spec/examples'),
    birch = require('../dist/birch'),
    birchMin = require('../dist/birch.min');

tests.run(birch);
tests.run(birchMin);

examples.run(birchMin);