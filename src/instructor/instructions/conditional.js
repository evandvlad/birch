/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 22:07
 */

'use strict';

import BaseInstruction from './base';
import ValInstruction from './val';

const NULL_ELSE_POINTER_VALUE = -1;

export default class extends BaseInstruction {

    constructor(...args){
        super(...args);
        this._pointerElse = NULL_ELSE_POINTER_VALUE;
        this._cond = new ValInstruction(this._env, this._data);
    }

    setElsePointer(){
        this._pointerElse = this._instructions.length;
        return this;
    }

    endInsertion(){
        let isNotSetPointerElse = this._pointerElse === NULL_ELSE_POINTER_VALUE,
            instrListEndPosition = isNotSetPointerElse ? this._instructions.length : this._pointerElse;

        this._trueInstr = this._instructions.slice(0, instrListEndPosition);
        this._falseInstr = isNotSetPointerElse ? [] : this._instructions.slice(this._pointerElse);

        return super.endInsertion();
    }

    evaluate(data){
        return this._fold(this._cond.evaluate(data) ? this._trueInstr : this._falseInstr, data);
    }
}