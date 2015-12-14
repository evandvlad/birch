/**
 * Autor: Evstigneev Andrey
 * Date: 15.12.2015
 * Time: 1:03
 */

'use strict';

import BaseInstruction from './instructions/base';
import ValInstruction from './instructions/val';
import SafeValInstruction from './instructions/safe-val';
import ConditionalInstruction from './instructions/conditional';
import LoopInstruction from './instructions/loop';

export default {

    // params - parentInstr, env, body
    _operations : {

        '=' : (parentInstr, env, body) => {
            parentInstr.insert(new ValInstruction(env, body));
            return parentInstr;
        },

        '~' : (parentInstr, env, body) => {
            parentInstr.insert(new SafeValInstruction(env, body));
            return parentInstr;
        },

        '?' : (parentInstr, env, body) => {
            let instr = new ConditionalInstruction(env, body);
            parentInstr.insert(instr);
            return instr;
        },

        '!?' : (parentInstr) => {
            parentInstr.setElsePointer();
            return parentInstr;
        },

        '^' : (parentInstr, env, body) => {
            let instr = new LoopInstruction(env, body);
            parentInstr.insert(instr);
            return instr;
        },

        '/' : (parentInstr) => parentInstr.endInsertion()
    },

    createWrapperInstruction(...args){
        return new BaseInstruction(...args);
    },

    applyOperation(parentInstruction, opToken, env, body){
        if(!this._operations[opToken]){
            throw new Error('operation: + ' + opToken + ' not found');
        }

        return this._operations[opToken](parentInstruction, env, body);
    }
};