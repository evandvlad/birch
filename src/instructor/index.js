/**
 * Autor: Evstigneev Andrey
 * Date: 15.12.2015
 * Time: 22:30
 */

'use strict';

import BaseInstruction from './instructions/base';
import ValInstruction from './instructions/val';
import SafeValInstruction from './instructions/safe-val';
import ConditionalInstruction from './instructions/conditional';
import LoopInstruction from './instructions/loop';

export default {

    _tokenHandlers : {

        '=' : (parentInstruction, env, body) => {
            parentInstruction.insert(new ValInstruction(env, body));
            return parentInstruction;
        },

        '~' : (parentInstruction, env, body) => {
            parentInstruction.insert(new SafeValInstruction(env, body));
            return parentInstruction;
        },

        '?' : (parentInstruction, env, body) => {
            let instruction = new ConditionalInstruction(env, body);
            parentInstruction.insert(instruction);
            return instruction;
        },

        '!?' : (parentInstruction) => {
            parentInstruction.setElsePointer();
            return parentInstruction;
        },

        '^' : (parentInstruction, env, body) => {
            let instruction = new LoopInstruction(env, body);
            parentInstruction.insert(instruction);
            return instruction;
        },

        '/' : (parentInstruction) => parentInstruction.endInsertion()
    },

    createRootInstruction(...args){
        return new BaseInstruction(...args);
    },

    applyInstruction(parentInstruction, token, env, body){
        if(!this._tokenHandlers[token]){
            throw new Error(`birch error: incorrect operation "${token}"`);
        }

        return this._tokenHandlers[token](parentInstruction, env, body);
    }
};