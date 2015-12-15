/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 21:41
 */

'use strict';

import BaseInstruction from '../base';

const ATOM_TOKEN = '`';
const ENV_VAL_TOKEN = '@';

const RE_PARENTHESIS = /\s*(\(|\))\s*/;
const RE_SQUARE_BRACKETS = /\[([^\]]+)\]/g;

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
                return () => value;

            case ENV_VAL_TOKEN :
                value = this._convertStringOperandToChunks(str.slice(1));
                return (data) => this._evaluateComplexValue(value, this._env, data);

            default :
                value = this._convertStringOperandToChunks(str);
                return (data) => this._evaluateComplexValue(value, data, data);
        }
    }

    _evaluateComplexValue(chunks, scope, data){
        let len = chunks.length,
            frame = scope,
            frames = [frame];

        for(let i = 0; i < len && this._isActiveFrameInChain(frame); i += 1){
            let chunk = chunks[i];

            if(chunk.isMethod){
                let context = this._lookupFunctionContext(frames, chunks, i),
                    args = this._evaluateFunctionArguments(chunk.args, data);

                frame = frame.apply(context, args);
            }
            else{
                frame = frame[chunk.value];
            }

            frames.push(frame);
        }

        return this._isActiveFrameInChain(frame) ? frame : '';
    }

    _isActiveFrameInChain(frame){
        return frame !== null && typeof frame !== 'undefined';
    }

    _convertStringOperandToChunks(operandStr){
        let valStr = operandStr.replace(RE_SQUARE_BRACKETS, '.$1');

        return valStr.indexOf('(') === -1 ?
            this._convertPropertiesStringToChunks(valStr) :
            this._convertPropertiesAndMethodsStringToChunks(valStr);
    }

    _convertPropertiesAndMethodsStringToChunks(str){
        let chunks = str.split(RE_PARENTHESIS),
            len = chunks.length,
            result = this._convertPropertiesStringToChunks(chunks[0]),
            argsStr = '',
            parenthesis = 0;

        for(let i = 1; i < len; i += 1){
            let chunk = chunks[i];

            if(chunk === '('){
                parenthesis += 1;

                if(parenthesis === 1){
                    continue;
                }
            }

            if(chunk === ')'){
                parenthesis -= 1;

                if(parenthesis === 0){
                    result.push(this._convertMethodArgsStringToChunk(argsStr));
                    argsStr = '';
                    continue;
                }
            }

            if(parenthesis === 0){
                if(chunk){
                    result = result.concat(this._convertPropertiesStringToChunks(chunk));
                }
            }
            else{
                argsStr += chunk;
            }
        }

        return result;
    }

    _convertMethodArgsStringToChunk(str){
        return {
            isMethod : true,
            args : this._convertArgsStringToInstructionsList(str)
        };
    }

    _lookupFunctionContext(frames, chunks, index){
        let prevIndex = index - 1;
        return chunks[prevIndex].isMethod ? null : frames[prevIndex];
    }

    _convertPropertiesStringToChunks(str){
        str = str.trim();

        if(!str){
            return '';
        }

        return str.split('.').reduce((acc, prop) => {
            prop = prop.trim();

            if(prop){
                acc.push({
                    isMethod : false,
                    value : prop
                });
            }

            return acc;
        }, []);
    }

    _convertArgsStringToInstructionsList(str){
        str = str.trim();

        if(!str){
            return [];
        }

        return str.split(',').reduce((acc, arg) => {
            arg = arg.trim();

            if(arg){
                acc.push(new this.constructor(this._env, arg));
            }

            return acc;
        }, []);
    }

    _evaluateFunctionArguments(args, data){
        return args.map(arg => arg.evaluate(data));
    }
}