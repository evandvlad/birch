/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 22:12
 */

'use strict';

import BaseInstruction from './base';
import ValInstruction from './val';

const RE_INSTRUCTION_PARTS = /^(\S+?)\s*->\s*([^, ]+)\s*,*\s*(\S+)?$/;

export default class extends BaseInstruction {

    constructor(...args){
        super(...args);

        let matchExpr = this._data.match(RE_INSTRUCTION_PARTS);

        if(matchExpr === null){
            throw new Error('syntax error for iteration');
        }

        this._list = new ValInstruction(this._env, matchExpr[1]);
        this._valueName = matchExpr[2];
        this._keyName = matchExpr[3];
    }

    evaluate(data){
        let list = this._list.evaluate(data),
            len = list.length,
            result = '',
            i;

        for(i = 0; i < len; i += 1){
            result += this._fold(this._instructions, this._createNewScope(data, list[i], i));
        }

        return result;
    }

    _createNewScope(data, value, index){
        let newScope = Object.create(data);

        newScope[this._valueName] = value;

        if(typeof this._keyName !== 'undefined'){
            newScope[this._keyName] = index;
        }

        return newScope;
    }
}