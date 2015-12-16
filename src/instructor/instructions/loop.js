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
            throw new Error(`birch error: incorrect syntax for iteration in expression "${this._data}"`);
        }

        let [, list, valueName, keyName] = matchExpr;

        this._list = new ValInstruction(this._env, list);
        this._valueName = valueName;
        this._keyName = keyName;
    }

    evaluate(data){
        return this._list.evaluate(data).reduce((acc, iter, indx) => {
            return acc + this._fold(this._instructions, this._createNewScope(data, iter, indx));
        }, '');
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