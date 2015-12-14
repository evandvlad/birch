/**
 * Autor: Evstigneev Andrey
 * Date: 15.12.2015
 * Time: 0:03
 */

'use strict';

import instructionManager from './instructions-manager';

const RE_EXPR = /^(\S+)\s*(.*?)\s*$/;
const RE_SPACES = /[\r\t\n]+/g;

export default class {

    constructor(pattern, options){
        this._options = options;
        this._tree = this._parse(pattern);
    }

    translate(data){
        return this._tree.evaluate(data);
    }

    _parse(template){
        var opCodes = template.replace(RE_SPACES, ' ').split(this._options.tag),
            tree = instructionManager.createWrapperInstruction(this._options.env),
            len = opCodes.length,
            isPlainText,
            opCode,
            mod,
            i;

        for(i = 0; i < len; i += 1){
            mod = i % 2;
            isPlainText = !mod;
            opCode = opCodes[i];

            if(isPlainText){
                if(opCode){
                    tree = tree.insert(this._options.trim ? opCode.trim() : opCode);
                }
            }
            else{
                tree = this._insert(tree, opCode);
            }
        }

        return tree;
    }

    _insert(parentInstr, expr){
        var matchExpr = expr.match(RE_EXPR);

        if(matchExpr === null){
            throw new Error('syntax error invalid expr: ' + expr);
        }

        return instructionManager.applyOperation(parentInstr, matchExpr[1], this._options.env, matchExpr[2]);
    }
}