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

    function extend(src, dest){
        var prop;

        dest = dest || {};

        for(prop in src){
            if(src.hasOwnProperty(prop) && isUndefined(dest[prop])){
                dest[prop] = src[prop];
            }
        }

        return dest;
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

    function Parser(pattern, options){
        this.options = options;
        this.tree = this._parse(pattern);
    }

    Parser.prototype = {

        constructor : Parser,

        translate : function(scope){
            return this.tree.evaluate(scope);
        },

        _parse : function(str){
            var chunks = str.replace(Parser.RE_SPACES, ' ').split(this.options.tag),
                acc = new Instruction(),
                len = chunks.length,
                isPlainText,
                chunk,
                i;

            for(i = 0; i < len; i += 1){
                isPlainText = !(i % 2);
                chunk = chunks[i];
                isPlainText ?
                    (chunk && (acc = acc.insert(this.options.trim ? chunk.trim() : chunk))) :
                    (acc = this._insert(acc, chunk));
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
    Parser.RE_SPACES = /[\r\t\n]+/g;

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

        RE_PARENTHESIS : /\s*(\(|\))\s*/,
        RE_SQUARE_BRACKETS : /\[([^\]]+)\]/g,

        ATOM_TOKEN : '`',

        constructor : function(data){
            Instruction.apply(this, arguments);

            if(!this.data){
                throw new Error('syntax error value is empty');
            }

            this.isAtom = this._isAtom(this.data);
            this.val = this.isAtom ? this._parseAtom(this.data) : this._splitToChunks(this.data);
        },

        evaluate : function(scope){
            return this.isAtom ? this.val : this._evalComplexVal(scope);
        },

        _isAtom : function(value){
            return value.charAt(0) === this.ATOM_TOKEN;
        },

        _evalComplexVal : function(scope){
            var chunks = this.val.slice(),
                ctx = scope,
                chunk;

            while(chunks.length && !isNullOrUndefined(ctx)){
                chunk = chunks.shift();
                ctx = chunk.isMethod ? ctx.apply(scope, this._evaluateArguments(chunk.args, scope)) : ctx[chunk.value];
            }

            return isNullOrUndefined(ctx) ? '' : ctx;
        },

        _splitToChunks : function(data){
            var code = data.replace(this.RE_SQUARE_BRACKETS, '.$1');

            if(code.charAt(0) === this.ATOM_TOKEN){
                return this._parseAtom(code);
            }

            return code.indexOf('(') === -1 ?
                this._parseProps(code) :
                this._parsePropsAndMeths(code);
        },

        _parsePropsAndMeths : function(code){
            var chunks = code.split(this.RE_PARENTHESIS),
                len = chunks.length,
                ret = this._parseProps(chunks[0]),
                argsStr = '',
                br = 0,
                val,
                i;

            for(i = 1; i < len; i += 1){
                val = chunks[i];

                if(val === '('){
                    br += 1;

                    if(br === 1){
                        continue;
                    }
                }

                if(val === ')'){
                    br -= 1;

                    if(br === 0){
                        ret.push(this._parseFCall(argsStr));
                        argsStr = '';
                        continue;
                    }
                }


                if(br === 0){
                    val && (ret = ret.concat(this._parseProps(val)));
                }
                else{
                    argsStr += val;
                }
            }

            return ret;
        },

        _parseFCall : function(chunk){
            return {isMethod : true, args : this._parseArguments(chunk)};
        },

        _parseAtom : function(value){
            return value.slice(1);
        },

        _parseProps : function(code){
            var ret = [],
                len,
                props,
                i;

            if(!code){
                return code;
            }

            props = code.split('.');

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

    Parser.SafeValInstruction = inherit(Parser.ValInstruction, {

        RE_HTML_ESC : /[&<>"'\/]/g,
        SAFE_HTML_MAP : {
            '&' : '&amp;',
            '<' : '&lt;',
            '>' : '&gt;',
            '"' : '&quot;',
            "'" : '&#39;',
            '/' : '&#x2F;'
        },

        evaluate : function(){
            var self = this;

            return Parser.ValInstruction.prototype.evaluate
                .apply(this, arguments)
                .replace(this.RE_HTML_ESC, function(ch){
                    return self.SAFE_HTML_MAP[ch];
                });
        }
    });

    Parser.LoopInstruction = inherit(Instruction, {

        RE_INSTRUCTION_PARTS : /^(\S+?)\s*->\s*([^, ]+)\s*,*\s*(\S+)?$/,

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
        parentInstr.insert(new Parser.ValInstruction(body));
        return parentInstr;
    }).registerOperation('~', function(parentInstr, body){
        parentInstr.insert(new Parser.SafeValInstruction(body));
        return parentInstr;
    }).registerOperation('?', function(parentInstr, body){
        var instr = new Parser.ConditionalInstruction(body);
        parentInstr.insert(instr);
        return instr;
    }).registerOperation('!?', function(parentInstr, body){
        parentInstr.setElsePointer();
        return parentInstr;
    }).registerOperation('^', function(parentInstr, body){
        var instr = new Parser.LoopInstruction(body);
        parentInstr.insert(instr);
        return instr;
    }).registerOperation('/', function(parentInstr, body){
        return parentInstr.endInsertion();
    });

    return {

        version : '1.0.0',

        options : {
            tag : /\{{2}(.+?)\}{2}/,
            trim : true
        },

        compile : function(pattern, options){
            var parser = new Parser(pattern, extend(this.options, options));

            return function(data){
                return parser.translate(data || {});
            };
        }
    };
}));