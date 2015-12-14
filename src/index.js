/**
 * Autor: Evstigneev Andrey
 * Date: 27.08.2014
 * Time: 22:07
 */

'use strict';

import Parser from './parser.js';
import ext from './libs/ext';

export default {

    options : {
        tag : /\{{2}(.+?)\}{2}/,
        trim : false,
        env : {}
    },

    compile(pattern, options = {}){
        let parser = new Parser(pattern, ext.extend(this.options, options));
        return (data = {}) => parser.translate(data);
    }
};