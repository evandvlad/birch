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

    var ValInstruction,
        SafeValInstruction,
        ConditionalInstruction,
        LoopInstruction;

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

        constructor : Instruction,

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

        _fold : function(instrs, data){
            var len = instrs.length,
                result = '',
                instr,
                i;

            for(i = 0; i < len; i += 1){
                instr = instrs[i];
                result += this._isIObject(instr) ? instr.evaluate(data) : instr;
            }

            return result;
        }
    };

    ValInstruction = inherit(Instruction, {

        RE_PARENTHESIS : /\s*(\(|\))\s*/,
        RE_SQUARE_BRACKETS : /\[([^\]]+)\]/g,

        ATOM_TOKEN : '`',
        ENV_VAL_TOKEN : '@',

        constructor : function(data){
            Instruction.apply(this, arguments);

            if(!this.data){
                throw new Error('syntax error value is empty');
            }

            this.code = this._generateCode(this.data);
        },

        evaluate : function(data){
            return this.code(data);
        },

        _generateCode : function(str){
            var self = this,
                value;

            switch(str.charAt(0)){
                case this.ATOM_TOKEN :
                    value = str.slice(1);

                    return function(data){
                        return value;
                    };

                case this.ENV_VAL_TOKEN :
                    value = this._stringToTokens(str.slice(1));

                    return function(data){
                        return self._evalComplexVal(value, self.env, data);
                    };

                default :
                    value = this._stringToTokens(str);

                    return function(data){
                        return self._evalComplexVal(value, data, data);
                    };
            }
        },

        _evalComplexVal : function(tokens, scope, data){
            var len = tokens.length,
                frame = scope,
                frames = [frame],
                token,
                i;

            for(i = 0; i < len && !isNullOrUndefined(frame); i += 1){
                token = tokens[i];
                frame = token.isMethod ?
                    frame.apply(this._lookupFCallContext(frames, tokens, i), this._evalArguments(token.args, data)) :
                    frame[token.value];

                frames.push(frame);
            }

            return isNullOrUndefined(frame) ? '' : frame;
        },

        _stringToTokens : function(rawValStr){
            var valStr = rawValStr.replace(this.RE_SQUARE_BRACKETS, '.$1');

            return valStr.indexOf('(') === -1 ?
                this._parseProps(valStr) :
                this._parsePropsAndMeths(valStr);
        },

        _parsePropsAndMeths : function(str){
            var chunks = str.split(this.RE_PARENTHESIS),
                len = chunks.length,
                result = this._parseProps(chunks[0]),
                argsStr = '',
                parenthesis = 0,
                chunk,
                i;

            for(i = 1; i < len; i += 1){
                chunk = chunks[i];

                if(chunk === '('){
                    parenthesis += 1;

                    if(parenthesis === 1){
                        continue;
                    }
                }

                if(chunk === ')'){
                    parenthesis -= 1;

                    if(parenthesis === 0){
                        result.push(this._parseFCall(argsStr));
                        argsStr = '';
                        continue;
                    }
                }


                if(parenthesis === 0){
                    chunk && (result = result.concat(this._parseProps(chunk)));
                }
                else{
                    argsStr += chunk;
                }
            }

            return result;
        },

        _parseFCall : function(argsStr){
            return {isMethod : true, args : this._argsStringToInstructions(argsStr)};
        },

        _lookupFCallContext : function(frames, chunks, index){
            var prevIndex = index - 1;
            return chunks[prevIndex].isMethod ? null : frames[prevIndex];
        },

        _parseProps : function(propsStr){
            var propsData = [],
                len,
                props,
                i;

            if(!propsStr){
                return propsStr;
            }

            props = propsStr.split('.');

            for(i = 0, len = props.length; i < len; i += 1){
                props[i] && propsData.push({isMethod : false, value : props[i]});
            }

            return propsData;
        },

        _argsStringToInstructions : function(argsStr){
            var instrs = [],
                args,
                arg,
                len,
                i;

            if(!argsStr){
                return instrs;
            }

            args = argsStr.split(',');

            for(i = 0, len = args.length; i < len; i += 1){
                arg = args[i].trim();
                arg && instrs.push(new this.constructor(this.env, arg));
            }

            return instrs;
        },

        _evalArguments : function(args, data){
            var len = args.length,
                argsResult = [],
                i;

            for(i = 0; i < len; i += 1){
                argsResult.push(args[i].evaluate(data));
            }

            return argsResult;
        }
    });

    SafeValInstruction = inherit(ValInstruction, {

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

            return ValInstruction.prototype.evaluate
                .apply(this, arguments)
                .replace(this.RE_HTML_ESC, function(chr){
                    return self.SAFE_HTML_MAP[chr];
                });
        }
    });

    ConditionalInstruction = inherit(Instruction, {

        constructor : function(){
            Instruction.apply(this, arguments);
            this.pointerElse = null;
            this.cond = new ValInstruction(this.env, this.data);
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

        evaluate : function(data){
            return this._fold(this.cond.evaluate(data) ? this.tinstr : this.finstr, data);
        }
    });

    LoopInstruction = inherit(Instruction, {

        RE_INSTRUCTION_PARTS : /^(\S+?)\s*->\s*([^, ]+)\s*,*\s*(\S+)?$/,

        constructor : function(){
            var matchExpr;

            Instruction.apply(this, arguments);
            matchExpr = this.data.match(this.RE_INSTRUCTION_PARTS);

            if(isNull(matchExpr)){
                throw new Error('syntax error for iteration');
            }

            this.list = new ValInstruction(this.env, matchExpr[1]);
            this.valueName = matchExpr[2];
            this.keyName = matchExpr[3];
        },

        evaluate : function(data){
            var list = this.list.evaluate(data),
                len = list.length,
                result = '',
                i;

            for(i = 0; i < len; i += 1){
                result += this._fold(this.instructions, this._createNewScope(data, list[i], i));
            }

            return result;
        },

        _createNewScope : function(data, value, index){
            var newScope = Object.create(data);
            newScope[this.valueName] = value;
            !isUndefined(this.keyName) && (newScope[this.keyName] = index);
            return newScope;
        }
    });

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
                tree = new Instruction(this.options.env),
                len = opCodes.length,
                isPlainText,
                opCode,
                i;

            for(i = 0; i < len; i += 1){
                isPlainText = !(i % 2);
                opCode = opCodes[i];
                isPlainText ?
                    (opCode && (tree = tree.insert(this.options.trim ? opCode.trim() : opCode))) :
                    (tree = this._insert(tree, opCode));
            }

            return tree;
        },

        _insert : function(parentInstr, expr){
            var matchExpr = expr.match(Parser.RE_EXPR);

            if(isNull(matchExpr)){
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

    return {

        version : '1.2.0',

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