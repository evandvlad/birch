/**
 * Autor: Evstigneev Andrey
 * Date: 27.08.2014
 * Time: 22:07
 */

'use strict';

import Parser from './parser';
import instructor from './instructor';
import std from './libs/std';

export default {

    options : {
        tag : /\{{2}(.+?)\}{2}/,
        trim : false,
        env : {}
    },

    compile(pattern, options = {}){
        let parser = new Parser(instructor, pattern, std.extend(this.options, options));
        return (data = {}) => parser.translate(data);
    }
};