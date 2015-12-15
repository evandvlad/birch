/**
 * Autor: Evstigneev Andrey
 * Date: 15.12.2015
 * Time: 1:17
 */

'use strict';

let hasProp = Object.prototype.hasOwnProperty;

export default {

    extend(src, dest = {}){
        for(let prop in src){
            if(hasProp.call(src, prop) && typeof dest[prop] === 'undefined'){
                dest[prop] = src[prop];
            }
        }

        return dest;
    }
};