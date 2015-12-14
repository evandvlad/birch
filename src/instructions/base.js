/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 21:36
 */

'use strict';

export default class {

    constructor(env, data){
        this._env = env;
        this._data = data;
        this._parent = null;
        this._instructions = [];
    }

    insert(instruction){
        if(this._isIObject(instruction)){
            instruction.setParent(this);
        }

        this._instructions.push(instruction);

        return this;
    }

    setParent(parent){
        this._parent = parent;
        return this;
    }

    endInsertion(){
        return this._parent;
    }

    evaluate(data){
        return this._fold(this._instructions, data);
    }

    _isIObject(instr){
        return instr && typeof instr.evaluate === 'function';
    }

    _fold(instrs, data){
        let len = instrs.length,
            result = '',
            instr,
            i;

        for(i = 0; i < len; i += 1){
            instr = instrs[i];
            result += this._isIObject(instr) ? instr.evaluate(data) : instr;
        }

        return result;
    }
}