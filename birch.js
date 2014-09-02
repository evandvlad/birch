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

        insertInstruction : function(instruction){
            instruction.setParent(this);
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
            throw new Error('method must be overridden');
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
            return str.replace(Parser.RE_SPACES, ' ').split(delimiter).reduce(function(acc, expr, i){
                var isPlainText = !(i % 2);
                return (isPlainText && !expr) ? acc : this._insertInstruction(acc, expr);
            }.bind(this), new Parser.RootInstruction());
        },

        _insertInstruction : function(parentInstr, expr){
            var match = expr.match(Parser.RE_EXPR),
                isMatch = !isNull(match),
                operation = isMatch ? match[1] : null,
                body = isMatch ? match[2] : expr,
                instr;

            switch(operation){
                case Parser.TOKEN_OPERATION_PRINT :
                case Parser.TOKEN_OPERATION_SAFE_PRINT :
                    parentInstr.insertInstruction(
                        new Parser.ValInstruction(body, operation === Parser.TOKEN_OPERATION_SAFE_PRINT)
                    );
                    return parentInstr;

                case Parser.TOKEN_OPERATION_IF :
                    instr = new Parser.ConditionalInstruction(body);
                    parentInstr.insertInstruction(instr);
                    return instr;

                case Parser.TOKEN_OPERATION_ELSE :
                    parentInstr.setElsePointer();
                    return parentInstr;

                case Parser.TOKEN_OPERATION_END_IF :
                case Parser.TOKEN_OPERATION_END_EACH :
                    return parentInstr.endInsertion();

                case Parser.TOKEN_OPERATION_EACH :
                    instr = new Parser.LoopInstruction(body);
                    parentInstr.insertInstruction(instr);
                    return instr;

                default :
                    parentInstr.insertInstruction(new Parser.IdInstruction(expr));
                    return parentInstr;
            }
        }
    };

    Parser.RE_EXPR = /^(\S+)(?:\s*)(.*?)\s*$/;
    Parser.RE_SPACES = /[\r\t\n]/g;

    Parser.TOKEN_OPERATION_PRINT = '=';
    Parser.TOKEN_OPERATION_SAFE_PRINT = '~';
    Parser.TOKEN_OPERATION_IF = '?';
    Parser.TOKEN_OPERATION_ELSE = '!?';
    Parser.TOKEN_OPERATION_END_IF = '/?';
    Parser.TOKEN_OPERATION_EACH = '^';
    Parser.TOKEN_OPERATION_END_EACH = '/^';

    Parser.RootInstruction = inherit(Instruction, {

        evaluate : function(scope){
            return this.instructions.reduce(function(acc, child){
                return acc += child.evaluate(scope);
            }, '');
        }
    });

    Parser.IdInstruction = inherit(Instruction, {

        evaluate : function(scope){
            return this.data || '';
        }
    });

    Parser.ConditionalInstruction = inherit(Instruction, {

        constructor : function(){
            Instruction.apply(this, arguments);
            this.pointerElse = null;
        },

        setElsePointer : function(){
            this.pointerElse = this.instructions.length;
            return this;
        },

        endInsertion : function(){
            this.ifInstructions = this.instructions.slice(
                0, isNull(this.pointerElse) ? this.instructions.length : this.pointerElse
            );

            this.elseInstructions = isNull(this.pointerElse) ? [] : this.instructions.slice(this.pointerElse);

            return Instruction.prototype.endInsertion.call(this);
        },

        evaluate : function(scope){
            var isTrueCond = !!(new Parser.ValInstruction(this.data).evaluate(scope));

            return (isTrueCond ? this.ifInstructions : this.elseInstructions).reduce(function(acc, instruction){
                return acc += instruction.evaluate(scope);
            }, '');
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
                throw new Error('value is empty');
            }

            this.chunks = this.data
                .replace(this.RE_SQUARE_BRACKETS, '.$1')
                .split(this.RE_FCALL)
                .reduce(function(acc, chunk, i){
                    var isArgsData = i % 2;

                    isArgsData ?
                        acc.push({
                            isMethod : true,
                            args : this._parseArguments(chunk.trim())
                        }) :
                        (acc = acc.concat(this._parseProps(chunk.trim())));

                    return acc;
                }.bind(this), []);
        },

        evaluate : function(scope){
            var chnks = this.chunks.slice(),
                ctx = scope,
                chunk,
                ret;

            while(chnks.length && !isNullOrUndefined(ctx)){
                chunk = chnks.shift();
                ctx = chunk.isMethod ? ctx.apply(scope, chunk.args.map(function(arg){
                    return arg.evaluate(scope);
                })) : ctx[chunk.value];
            }

            ret = isNullOrUndefined(ctx) ? '' : ctx;

            return this.isEscape ? this._toSafeHtml(ret) : ret;
        },

        _toSafeHtml : function(value){
            return value.replace(this.RE_HTML_ESC, function(ch){
                return this.SAFE_HTML_MAP[ch];
            }.bind(this));
        },

        _parseProps : function(str){
            return str ? str.split('.').reduce(function(acc, name){
                name && acc.push({
                    isMethod : false,
                    value : name
                });

                return acc;
            }, []) : [];
        },

        _parseArguments : function(str){
            return str ? str.split(',').reduce(function(acc, arg){
                arg = arg.trim();
                arg && acc.push(new this.constructor(arg));
                return acc;
            }.bind(this), []) : [];
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
            return this.source.evaluate(scope).reduce(function(acc, value, i){
                var nscope = this._createNewScope(scope, value, i);

                this.instructions.forEach(function(instruction){
                    acc += instruction.evaluate(nscope);
                }, this);

                return acc;
            }.bind(this), '');
        },

        _createNewScope : function(scope, value, index){
            var nscope = Object.create(scope);
            nscope[this.valueName] = value;
            !isUndefined(this.keyName) && (nscope[this.keyName] = index);
            return nscope;
        }
    });

    return {

        version : '0.0.0',

        tag : /\{{2}(.+?)\}{2}/,

        compile : function(pattern){
            var parser = new Parser(pattern, this.tag);

            return function(data){
                return parser.translate(data || {});
            };
        }
    };
}));