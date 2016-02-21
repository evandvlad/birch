/**
 * Autor: Evstigneev Andrey
 * Date: 27.08.2014
 * Time: 22:07
 */

'use strict';

import Parser from './parser';
import instructor from './instructor';
import std from './libs/std';

const defaultOptions = {
    tag : /\{{2}(.+?)\}{2}/,
    trim : false,
    env : {}
};
    
export default function(options = {}){
     
    let opts = std.extend(defaultOptions, options);

    return {

        compile(pattern){
            let parser = new Parser(instructor, pattern, opts);
            return (data = {}) => parser.translate(data);
        }
    };
}
