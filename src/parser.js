/**
 * Autor: Evstigneev Andrey
 * Date: 15.12.2015
 * Time: 0:03
 */

'use strict';

const RE_EXPR = /^(\S+)\s*(.*?)\s*$/;
const RE_SPACES = /[\r\t\n]+/g;
const SPACES_REPLACER = ' ';

export default class {

    constructor(instructor, pattern, options){
        this._instructor = instructor;
        this._options = options;
        this._tree = this._parse(pattern);
    }

    translate(data){
        return this._tree.evaluate(data);
    }

    _parse(template){
        let templateParts = template.replace(RE_SPACES, SPACES_REPLACER).split(this._options.tag),
            root = this._instructor.createRootInstruction(this._options.env);

        return templateParts.reduce((tree, part, indx) => {
            let mod2 = indx % 2,
                isTerminal = !mod2;

            if(isTerminal){
                part = this._options.trim ? part.trim() : part;
                return part !== '' ? tree.insert(part) : tree;
            }

            return this._insert(tree, part);
        }, root);
    }

    _insert(parentInstruction, expr){
        let exprMatch = expr.match(RE_EXPR);

        if(exprMatch === null){
            throw new Error(`syntax error invalid expr: ${expr}`);
        }

        let [, token, body] = exprMatch;

        return this._instructor.applyInstruction(parentInstruction, token, this._options.env, body);
    }
}