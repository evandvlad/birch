/**
 * Autor: Evstigneev Andrey
 * Date: 16.12.2015
 * Time: 1:31
 */

'use strict';

const RE_PARENTHESIS = /\s*(\(|\))\s*/;
const RE_SQUARE_BRACKETS = /\[([^\]]+)\]/g;

export default {

    compile(str){
        let valStr = str.replace(RE_SQUARE_BRACKETS, '.$1');

        return valStr.indexOf('(') === -1 ?
            this._processProperties(valStr) :
            this._processPropertiesAndMethods(valStr);
    },

    _processProperties(str){
        return str.trim().split('.').reduce((acc, prop) => {
            prop = prop.trim();

            if(prop){
                acc.push(this._createChunkItem(false, prop));
            }

            return acc;
        }, []);
    },

    _processPropertiesAndMethods(str){
        let parts = str.split(RE_PARENTHESIS),
            result = this._processProperties(parts.shift()),
            len = parts.length,
            argsStr = '',
            parenthesis = 0;

        for(let i = 0; i < len; i += 1){
            let part = parts[i];

            if(!part){
                continue;
            }

            if(part === '('){
                parenthesis += 1;

                if(parenthesis === 1){
                    continue;
                }
            }

            if(part === ')'){
                parenthesis -= 1;

                if(parenthesis === 0){
                    result.push(this._createChunkItem(true, this._convertArgsStringToList(argsStr)));
                    argsStr = '';
                    continue;
                }
            }

            if(parenthesis === 0){
                result = result.concat(this._processProperties(part));
            }
            else{
                argsStr += part;
            }
        }

        return result;
    },

    _convertArgsStringToList(str){
        return str.trim().split(',').reduce((acc, arg) => {
            arg = arg.trim();

            if(arg){
                acc.push(arg);
            }

            return acc;
        }, []);
    },

    _createChunkItem(isMethod, data){
        return {
            isMethod : isMethod,
            [isMethod ? 'args' : 'value'] : data
        };
    }
};