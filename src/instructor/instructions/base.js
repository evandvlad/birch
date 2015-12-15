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

    static isInstruction(instr){
        return instr && typeof instr.evaluate === 'function';
    }

    insert(instruction){
        if(this.constructor.isInstruction(instruction)){
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

    _fold(instrs, data){
        return instrs.reduce((acc, instr) => acc + (this.constructor.isInstruction(instr) ? instr.evaluate(data) : instr), '');
    }
}