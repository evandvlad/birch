/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 21:41
 */

'use strict';

import BaseInstruction from '../base';

import chunksEvaluator from './chunks-evaluator';
import chunksCompiler from './chunks-compiler';

const ATOM_TOKEN = '`';
const ENV_VAL_TOKEN = '@';

export default class extends BaseInstruction {

    constructor(...args){
        super(...args);

        if(!this._data){
            throw new Error(`birch error: value is empty`);
        }

        this._code = this._generateCode(this._data);
    }

    evaluate(data){
        return this._code(data);
    }

    _generateCode(str){
        let value,
            chunks;

        switch(str.charAt(0)){
            case ATOM_TOKEN :
                value = str.slice(1);
                return () => value;

            case ENV_VAL_TOKEN :
                chunks = this._prepareChunksForEvaluation(chunksCompiler.compile(str.slice(1)));
                return (data) => chunksEvaluator.evaluate(chunks, this._env, data);

            default :
                chunks = this._prepareChunksForEvaluation(chunksCompiler.compile(str));
                return (data) => chunksEvaluator.evaluate(chunks, data, data);
        }
    }

    _prepareChunksForEvaluation(chunks){
        return chunks.map(chunk => {
            if(chunk.isMethod){
                chunk.args = chunk.args.map(arg => new this.constructor(this._env, arg));
            }

            return chunk;
        });
    }
}