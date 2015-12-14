/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 22:07
 */

'use strict';

import BaseInstruction from './base';
import ValInstruction from './val';

export default class extends BaseInstruction {

    constructor(...args){
        super(...args);
        this._pointerElse = null;
        this._cond = new ValInstruction(this._env, this._data);
    }

    setElsePointer(){
        this._pointerElse = this._instructions.length;
        return this;
    }

    endInsertion(){
        let isNotSetPointerElse = this._pointerElse === null;

        this._tinstr = this._instructions.slice(0, isNotSetPointerElse ? this._instructions.length : this._pointerElse);
        this._finstr = isNotSetPointerElse ? [] : this._instructions.slice(this._pointerElse);

        return super.endInsertion();
    }

    evaluate(data){
        return this._fold(this._cond.evaluate(data) ? this._tinstr : this._finstr, data);
    }
}