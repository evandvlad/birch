/**
 * Autor: Evstigneev Andrey
 * Date: 27.08.2014
 * Time: 22:07
 */

'use strict';

import BaseInstruction from './instructions/base';
import ValInstruction from './instructions/val';
import SafeValInstruction from './instructions/safe-val';
import ConditionalInstruction from './instructions/conditional';
import LoopInstruction from './instructions/loop';

function extend(src, dest){
    var prop;

    dest = dest || {};

    for(prop in src){
        if(src.hasOwnProperty(prop) && typeof dest[prop] === 'undefined'){
            dest[prop] = src[prop];
        }
    }

    return dest;
}

function Parser(pattern, options){
    this.options = options;
    this.tree = this._parse(pattern);
}

Parser.RE_EXPR = /^(\S+)\s*(.*?)\s*$/;
Parser.RE_SPACES = /[\r\t\n]+/g;

Parser.operations = {};

Parser.opRegister = function(opToken, handler){
    if(this.operations[opToken]){
        throw new Error('operation with token: ' + opToken + ' is already register');
    }

    this.operations[opToken] = handler;

    return this;
};

Parser.opApply = function(parentInstruction, opToken, env, body){
    if(!this.operations[opToken]){
        throw new Error('operation: + ' + opToken + ' not found');
    }

    return this.operations[opToken](parentInstruction, env, body);
};

Parser.prototype = {

    constructor : Parser,

    translate : function(data){
        return this.tree.evaluate(data);
    },

    _parse : function(template){
        var opCodes = template.replace(Parser.RE_SPACES, ' ').split(this.options.tag),
            tree = new BaseInstruction(this.options.env),
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
                    tree = tree.insert(this.options.trim ? opCode.trim() : opCode);
                }
            }
            else{
                tree = this._insert(tree, opCode);
            }
        }

        return tree;
    },

    _insert : function(parentInstr, expr){
        var matchExpr = expr.match(Parser.RE_EXPR);

        if(matchExpr === null){
            throw new Error('syntax error invalid expr: ' + expr);
        }

        return Parser.opApply(parentInstr, matchExpr[1], this.options.env, matchExpr[2]);
    }
};

Parser.opRegister('=', function(parentInstr, env, body){
    parentInstr.insert(new ValInstruction(env, body));
    return parentInstr;
}).opRegister('~', function(parentInstr, env, body){
    parentInstr.insert(new SafeValInstruction(env, body));
    return parentInstr;
}).opRegister('?', function(parentInstr, env, body){
    var instr = new ConditionalInstruction(env, body);
    parentInstr.insert(instr);
    return instr;
}).opRegister('!?', function(parentInstr, env, body){
    parentInstr.setElsePointer();
    return parentInstr;
}).opRegister('^', function(parentInstr, env, body){
    var instr = new LoopInstruction(env, body);
    parentInstr.insert(instr);
    return instr;
}).opRegister('/', function(parentInstr, env, body){
    return parentInstr.endInsertion();
});

export default {

    options : {
        tag : /\{{2}(.+?)\}{2}/,
        trim : false,
        env : {}
    },

    compile : function(pattern, options){
        var parser = new Parser(pattern, extend(this.options, options));

        return function(data){
            return parser.translate(data || {});
        };
    }
};