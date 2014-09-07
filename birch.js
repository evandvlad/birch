/**
 * Autor: Evstigneev Andrey
 * Date: 27.08.2014
 * Time: 22:07
 */

(function(global, initializer){

    global.birch = initializer();

    if(typeof module !== 'undefined' && module.exports){
        module.exports = global.birch;
    }

}(this, function(){

    'use strict';

    function inherit(Parent, ext){
        var Ctor = Object.hasOwnProperty.call(ext, 'constructor') ?
            ext.constructor :
            function(){
                Parent.apply(this, arguments);
            };

        Ctor.prototype = Object.create(Parent.prototype);

        Object.keys(ext).forEach(function(prop){
            Ctor.prototype[prop] = ext[prop];
        });

        return Ctor;
    }

    function isNull(v){
        return v === null;
    }

    function isUndefined(v){
        return typeof v === 'undefined';
    }

    function isNullOrUndefined(v){
        return isUndefined(v) || isNull(v);
    }

    function Instruction(data){
        this.data = data;
        this.parent = null;
        this.instructions = [];
    }

    Instruction.prototype = {

        insert : function(instruction){
            this._isInstructionObject(instruction) && instruction.setParent(this);
            this.instructions.push(instruction);
            return this;
        },

        setParent : function(parent){
            this.parent = parent;
            return this;
        },

        endInsertion : function(){
            return this.parent;
        },

        evaluate : function(scope){
            return this._collectResult(this.instructions, scope);
        },

        _isInstructionObject : function(instr){
            return instr && typeof instr.evaluate === 'function';
        },

        _collectResult : function(items, scope){
            var len = items.length,
                ret = '',
                item,
                i;

            for(i = 0; i < len; i += 1){
                item = items[i];
                ret += this._isInstructionObject(item) ? item.evaluate(scope) : item;
            }

            return ret;
        }
    };

    function Parser(pattern, tag){
        this.tree = this._parse(pattern, tag);
    }

    Parser.prototype = {

        constructor : Parser,

        translate : function(scope){
            return this.tree.evaluate(scope);
        },

        _parse : function(str, delimiter){
            var chunks = str.replace(Parser.RE_SPACES, ' ').split(delimiter),
                len = chunks.length,
                acc = new Instruction(),
                isPlainText,
                chunk,
                i;

            for(i = 0; i < len; i += 1){
                isPlainText = !(i % 2);
                chunk = chunks[i];
                isPlainText ? (chunk && (acc = acc.insert(chunk))) : (acc = this._insert(acc, chunk));
            }

            return acc;
        },

        _insert : function(parentInstr, expr){
            var match = expr.match(Parser.RE_EXPR);

            if(isNull(match)){
                throw new Error('syntax error invalid expr: ' + expr);
            }

            return Parser.applyOperation(parentInstr, match[1], match[2]);
        }
    };

    Parser.RE_EXPR = /^(\S+)\s*(.*?)\s*$/;
    Parser.RE_SPACES = /[\r\t\n]/g;

    Parser.operations = {};

    Parser.registerOperation = function(opToken, handler){
        if(this.operations[opToken]){
            throw new Error('operation with token: ' + opToken + ' is already register');
        }

        this.operations[opToken] = handler;

        return this;
    };

    Parser.applyOperation = function(parentInstruction, opToken, body){
        if(!this.operations[opToken]){
            throw new Error('operation: + ' + opToken + ' not found');
        }

        return this.operations[opToken](parentInstruction, body);
    };

    Parser.ConditionalInstruction = inherit(Instruction, {

        constructor : function(){
            Instruction.apply(this, arguments);
            this.pointerElse = null;
            this.cond = new Parser.ValInstruction(this.data);
        },

        setElsePointer : function(){
            this.pointerElse = this.instructions.length;
            return this;
        },

        endInsertion : function(){
            var isNotSetPointerElse = isNull(this.pointerElse);

            this.tinstr = this.instructions.slice(0, isNotSetPointerElse ? this.instructions.length : this.pointerElse);
            this.finstr = isNotSetPointerElse ? [] : this.instructions.slice(this.pointerElse);

            return Instruction.prototype.endInsertion.call(this);
        },

        evaluate : function(scope){
            return this._collectResult(this.cond.evaluate(scope) ? this.tinstr : this.finstr, scope);
        }
    });

    Parser.ValInstruction = inherit(Instruction, {

        RE_SQUARE_BRACKETS : /\[([^\]]+)\]/g,
        RE_FCALL : /\(([^)]*)\)/,
        RE_HTML_ESC : /[&<>"'\/]/g,

        SAFE_HTML_MAP : {
            '&' : '&amp;',
            '<' : '&lt;',
            '>' : '&gt;',
            '"' : '&quot;',
            "'" : '&#39;',
            '/' : '&#x2F;'
        },

        constructor : function(data, isEscape){
            Instruction.apply(this, arguments);
            this.isEscape = isEscape;

            if(!this.data){
                throw new Error('syntax error value is empty');
            }

            this.chunks = this._splitToChunks(this.data);
        },

        evaluate : function(scope){
            var chunks = this.chunks.slice(),
                ctx = scope,
                chunk,
                ret;

            while(chunks.length && !isNullOrUndefined(ctx)){
                chunk = chunks.shift();
                ctx = chunk.isMethod ? ctx.apply(scope, this._evaluateArguments(chunk.args, scope)) : ctx[chunk.value];
            }

            ret = isNullOrUndefined(ctx) ? '' : ctx;

            return this.isEscape ? this._toSafeHtml(ret) : ret;
        },

        _toSafeHtml : function(value){
            var self = this;

            return value.replace(this.RE_HTML_ESC, function(ch){
                return self.SAFE_HTML_MAP[ch];
            });
        },

        _splitToChunks : function(data){
            var chunks = data.replace(this.RE_SQUARE_BRACKETS, '.$1').split(this.RE_FCALL),
                len = chunks.length,
                ret = [],
                isArgsData,
                chunk,
                i;

            for(i = 0; i < len; i += 1){
                isArgsData = i % 2;
                chunk = chunks[i].trim();
                isArgsData ? ret.push(this._parseFCall(chunk)) : (ret = ret.concat(this._parseProps(chunk)));
            }

            return ret;
        },

        _parseFCall : function(chunk){
            return {isMethod : true, args : this._parseArguments(chunk)};
        },

        _parseProps : function(str){
            var ret = [],
                len,
                props,
                i;

            if(!str){
                return ret;
            }

            props = str.split('.');

            for(i = 0, len = props.length; i < len; i += 1){
                props[i] && ret.push({isMethod : false, value : props[i]});
            }

            return ret;
        },

        _parseArguments : function(str){
            var ret = [],
                args,
                arg,
                len,
                i;

            if(!str){
                return ret;
            }

            args = str.split(',');

            for(i = 0, len = args.length; i < len; i += 1){
                arg = args[i].trim();
                arg && ret.push(new this.constructor(arg));
            }

            return ret;
        },

        _evaluateArguments : function(args, scope){
            var len = args.length,
                ret = [],
                i;

            for(i = 0; i < len; i += 1){
                ret.push(args[i].evaluate(scope));
            }

            return ret;
        }
    });

    Parser.LoopInstruction = inherit(Instruction, {

        RE_INSTRUCTION_PARTS : /^(\S+?)\s*->\s*([^, ]+)\s*,*\s*(\S+)?\s*$/,

        constructor : function(){
            var match;

            Instruction.apply(this, arguments);
            match = this.data.match(this.RE_INSTRUCTION_PARTS);

            if(isNull(match)){
                throw new Error('syntax error for iteration');
            }

            this.source = new Parser.ValInstruction(match[1]);
            this.valueName = match[2];
            this.keyName = match[3];
        },

        evaluate : function(scope){
            var source = this.source.evaluate(scope),
                len = source.length,
                ret = '',
                i;

            for(i = 0; i < len; i += 1){
                ret += this._collectResult(this.instructions, this._createNewScope(scope, source[i], i));
            }

            return ret;
        },

        _createNewScope : function(scope, value, index){
            var nscope = Object.create(scope);
            nscope[this.valueName] = value;
            !isUndefined(this.keyName) && (nscope[this.keyName] = index);
            return nscope;
        }
    });

    Parser.registerOperation('=', function(parentInstr, body){
        parentInstr.insert(new Parser.ValInstruction(body, false));
        return parentInstr;
    }).registerOperation('~', function(parentInstr, body){
        parentInstr.insert(new Parser.ValInstruction(body, true));
        return parentInstr;
    }).registerOperation('?', function(parentInstr, body){
        var instr = new Parser.ConditionalInstruction(body);
        parentInstr.insert(instr);
        return instr;
    }).registerOperation('!?', function(parentInstr, body){
        parentInstr.setElsePointer();
        return parentInstr;
    }).registerOperation('/?', function(parentInstr, body){
        return parentInstr.endInsertion();
    }).registerOperation('^', function(parentInstr, body){
        var instr = new Parser.LoopInstruction(body);
        parentInstr.insert(instr);
        return instr;
    }).registerOperation('/^', function(parentInstr, body){
        return parentInstr.endInsertion();
    });

    return {

        version : '0.0.2',

        tag : /\{{2}(.+?)\}{2}/,

        compile : function(pattern){
            var parser = new Parser(pattern, this.tag);

            return function(data){
                return parser.translate(data || {});
            };
        }
    };
}));