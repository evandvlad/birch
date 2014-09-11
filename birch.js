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

    function Instruction(env, data){
        this.env = env;
        this.data = data;
        this.parent = null;
        this.instructions = [];
    }

    Instruction.prototype = {

        insert : function(instruction){
            this._isIObject(instruction) && instruction.setParent(this);
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

        evaluate : function(data){
            return this._fold(this.instructions, data);
        },

        _isIObject : function(instr){
            return instr && typeof instr.evaluate === 'function';
        },

        _fold : function(items, data){
            var len = items.length,
                ret = '',
                item,
                i;

            for(i = 0; i < len; i += 1){
                item = items[i];
                ret += this._isIObject(item) ? item.evaluate(data) : item;
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

        translate : function(data){
            return this.tree.evaluate(data);
        },

        _parse : function(str){
            var chunks = str.replace(Parser.RE_SPACES, ' ').split(this.options.tag),
                acc = new Instruction(this.options.env),
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

            return Parser.opApply(parentInstr, match[1], this.options.env, match[2]);
        }
    };

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

    Parser.ConditionalInstruction = inherit(Instruction, {

        constructor : function(){
            Instruction.apply(this, arguments);
            this.pointerElse = null;
            this.cond = new Parser.ValInstruction(this.env, this.data);
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
            return this._fold(this.cond.evaluate(scope) ? this.tinstr : this.finstr, scope);
        }
    });

    Parser.ValInstruction = inherit(Instruction, {

        RE_PARENTHESIS : /\s*(\(|\))\s*/,
        RE_SQUARE_BRACKETS : /\[([^\]]+)\]/g,

        ATOM_TOKEN : '`',
        ENV_VAL_TOKEN : '@',

        constructor : function(data){
            Instruction.apply(this, arguments);

            if(!this.data){
                throw new Error('syntax error value is empty');
            }

            this.code = this._genCode(this.data);
        },

        evaluate : function(data){
            return this.code(data);
        },

        _genCode : function(str){
            var self = this,
                val;

            switch(str.charAt(0)){
                case this.ATOM_TOKEN :
                    val = str.slice(1);

                    return function(data){
                        return val;
                    };

                case this.ENV_VAL_TOKEN :
                    val = this._splitToChunks(str.slice(1));

                    return function(data){
                        return self._evalComplexVal(val, self.env, data);
                    };

                default :
                    val = this._splitToChunks(str);

                    return function(data){
                        return self._evalComplexVal(val, data, data);
                    };
            }
        },

        _evalComplexVal : function(value, scope, data){
            var chunks = value.slice(),
                ctx = scope,
                chunk;

            while(chunks.length && !isNullOrUndefined(ctx)){
                chunk = chunks.shift();
                ctx = chunk.isMethod ? ctx.apply(null, this._evaluateArguments(chunk.args, data)) : ctx[chunk.value];
            }

            return isNullOrUndefined(ctx) ? '' : ctx;
        },

        _splitToChunks : function(data){
            var str = data.replace(this.RE_SQUARE_BRACKETS, '.$1');

            return str.indexOf('(') === -1 ?
                this._parseProps(str) :
                this._parsePropsAndMeths(str);
        },

        _parsePropsAndMeths : function(str){
            var chunks = str.split(this.RE_PARENTHESIS),
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

        _parseProps : function(str){
            var ret = [],
                len,
                props,
                i;

            if(!str){
                return str;
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
                arg && ret.push(new this.constructor(this.env, arg));
            }

            return ret;
        },

        _evaluateArguments : function(args, data){
            var len = args.length,
                ret = [],
                i;

            for(i = 0; i < len; i += 1){
                ret.push(args[i].evaluate(data));
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

            this.source = new Parser.ValInstruction(this.env, match[1]);
            this.valueName = match[2];
            this.keyName = match[3];
        },

        evaluate : function(data){
            var source = this.source.evaluate(data),
                len = source.length,
                ret = '',
                i;

            for(i = 0; i < len; i += 1){
                ret += this._fold(this.instructions, this._createNewScope(data, source[i], i));
            }

            return ret;
        },

        _createNewScope : function(data, value, index){
            var nscope = Object.create(data);
            nscope[this.valueName] = value;
            !isUndefined(this.keyName) && (nscope[this.keyName] = index);
            return nscope;
        }
    });

    Parser.opRegister('=', function(parentInstr, env, body){
        parentInstr.insert(new Parser.ValInstruction(env, body));
        return parentInstr;
    }).opRegister('~', function(parentInstr, env, body){
        parentInstr.insert(new Parser.SafeValInstruction(env, body));
        return parentInstr;
    }).opRegister('?', function(parentInstr, env, body){
        var instr = new Parser.ConditionalInstruction(env, body);
        parentInstr.insert(instr);
        return instr;
    }).opRegister('!?', function(parentInstr, env, body){
        parentInstr.setElsePointer();
        return parentInstr;
    }).opRegister('^', function(parentInstr, env, body){
        var instr = new Parser.LoopInstruction(env, body);
        parentInstr.insert(instr);
        return instr;
    }).opRegister('/', function(parentInstr, env, body){
        return parentInstr.endInsertion();
    });

    return {

        version : '1.1.0',

        options : {
            tag : /\{{2}(.+?)\}{2}/,
            trim : true,
            env : {}
        },

        compile : function(pattern, options){
            var parser = new Parser(pattern, extend(this.options, options));

            return function(data){
                return parser.translate(data || {});
            };
        }
    };
}));