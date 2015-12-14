/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 21:41
 */

'use strict';

import BaseInstruction from './base';

const ATOM_TOKEN = '`';
const ENV_VAL_TOKEN = '@';

const RE_PARENTHESIS = /\s*(\(|\))\s*/;
const RE_SQUARE_BRACKETS = /\[([^\]]+)\]/g;

function isUndefined(v){
    return typeof v === 'undefined';
}

function isNull(v){
    return v === null;
}

function isNullOrUndefined(v){
    return isUndefined(v) || isNull(v);
}

export default class extends BaseInstruction {

    constructor(...args){
        super(...args);

        if(!this._data){
            throw new Error('syntax error value is empty');
        }

        this._code = this._generateCode(this._data);
    }

    evaluate(data){
        return this._code(data);
    }

    _generateCode(str){
        let value;

        switch(str.charAt(0)){
            case ATOM_TOKEN :
                value = str.slice(1);
                return (data) => value;

            case ENV_VAL_TOKEN :
                value = this._stringToTokens(str.slice(1));
                return (data) => this._evalComplexVal(value, this._env, data);

            default :
                value = this._stringToTokens(str);
                return (data) => this._evalComplexVal(value, data, data);
        }
    }

    _evalComplexVal(tokens, scope, data){
        let len = tokens.length,
            frame = scope,
            frames = [frame],
            token,
            i;

        for(i = 0; i < len && !isNullOrUndefined(frame); i += 1){
            token = tokens[i];
            frame = token.isMethod ?
                frame.apply(this._lookupFCallContext(frames, tokens, i), this._evalArguments(token.args, data)) :
                frame[token.value];

            frames.push(frame);
        }

        return isNullOrUndefined(frame) ? '' : frame;
    }

    _stringToTokens(rawValStr){
        let valStr = rawValStr.replace(RE_SQUARE_BRACKETS, '.$1');

        return valStr.indexOf('(') === -1 ?
            this._parseProps(valStr) :
            this._parsePropsAndMeths(valStr);
    }

    _parsePropsAndMeths(str){
        let chunks = str.split(RE_PARENTHESIS),
            len = chunks.length,
            result = this._parseProps(chunks[0]),
            argsStr = '',
            parenthesis = 0,
            chunk,
            i;

        for(i = 1; i < len; i += 1){
            chunk = chunks[i];

            if(chunk === '('){
                parenthesis += 1;

                if(parenthesis === 1){
                    continue;
                }
            }

            if(chunk === ')'){
                parenthesis -= 1;

                if(parenthesis === 0){
                    result.push(this._parseFCall(argsStr));
                    argsStr = '';
                    continue;
                }
            }

            if(parenthesis === 0){
                if(chunk){
                    result = result.concat(this._parseProps(chunk));
                }
            }
            else{
                argsStr += chunk;
            }
        }

        return result;
    }

    _parseFCall(argsStr){
        return {
            isMethod : true,
            args : this._argsStringToInstructions(argsStr)
        };
    }

    _lookupFCallContext(frames, chunks, index){
        let prevIndex = index - 1;
        return chunks[prevIndex].isMethod ? null : frames[prevIndex];
    }

    _parseProps(propsStr){
        let propsData = [],
            len,
            props,
            i;

        if(!propsStr){
            return propsStr;
        }

        props = propsStr.split('.');
        len = props.length;

        for(i = 0; i < len; i += 1){
            if(props[i]){
                propsData.push({
                    isMethod : false,
                    value : props[i]
                });
            }
        }

        return propsData;
    }

    _argsStringToInstructions(argsStr){
        let instrs = [],
            args,
            arg,
            len,
            i;

        if(!argsStr){
            return instrs;
        }

        args = argsStr.split(',');
        len = args.length;

        for(i = 0; i < len; i += 1){
            arg = args[i].trim();

            if(arg){
                instrs.push(new this.constructor(this._env, arg));
            }
        }

        return instrs;
    }

    _evalArguments(args, data){
        let len = args.length,
            argsResult = [],
            i;

        for(i = 0; i < len; i += 1){
            argsResult.push(args[i].evaluate(data));
        }

        return argsResult;
    }
}