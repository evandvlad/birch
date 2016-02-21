/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 1:31
 */

'use strict';

var tests = require('./spec/birch'),
    examples = require('./spec/examples'),
    Birch = require('../dist/birch'),
    BirchMin = require('../dist/birch.min');

tests.run(Birch);
tests.run(BirchMin);

examples.run(BirchMin);
