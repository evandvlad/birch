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

    function isNullOrUndefined(v){
        return typeof v === 'undefined' || isNull(v);
    }

    function Instruction(data){
        this.data = data;
        this.parent = null;
        this.components = [];
    }

    Instruction.prototype = {

        addComponent : function(component){
            component.setParent(this);
            this.components.push(component);
            return this;
        },

        setParent : function(parent){
            this.parent = parent;
            return this;
        },

        getParent : function(){
            return this.parent;
        },

        evaluate : function(scope){
            throw new Error('method must be overridden');
        }
    };

    function Parser(pattern, tag){
        this.tree = this._compile(pattern, tag);
    }

    Parser.prototype = {

        constructor : Parser,

        translate : function(scope){
            return this.tree.evaluate(scope);
        },

        _compile : function(str, delimiter){
            return str.replace(Parser.RE_SPACES, ' ').split(delimiter).reduce(function(acc, expr, i){
                var isPlainText = !(i % 2);
                return (isPlainText && !expr) ? acc : this._insertInstruction(acc, expr);
            }.bind(this),  new Parser.RootInstruction());
        },

        _insertInstruction : function(parentInstr, expr){
            var match = expr.trim().match(Parser.RE_EXPR),
                isMatch = !isNull(match),
                operation = isMatch ? match[1] : null,
                body = isMatch ? match[2] : expr,
                instr;

            switch(operation){
                case Parser.TOKEN_OPERATION_PRINT :
                    parentInstr.addComponent(new Parser.ValInstruction(body));
                    return parentInstr;

                case Parser.TOKEN_OPERATION_SAFE_PRINT :
                    parentInstr.addComponent(new Parser.SafeValInstruction(body));
                    return parentInstr;

                case Parser.TOKEN_OPERATION_IF :
                    instr = new Parser.ConditionalInstruction(body);
                    parentInstr.addComponent(instr);
                    return instr;

                case Parser.TOKEN_OPERATION_ELSE :
                    parentInstr.setElsePointer();
                    return parentInstr;

                case Parser.TOKEN_OPERATION_END_IF :
                case Parser.TOKEN_OPERATION_END_EACH :
                    return parentInstr.getParent();
//
//                case Parser.TOKEN_OPERATION_EACH :
//                    return {type : Parser.EXPR_TYPE_EACH, value : body};

                default :
                    parentInstr.addComponent(new Parser.IdInstruction(expr));
                    return parentInstr;
            }
        }
    };

    Parser.RE_EXPR = /^(\S+)(?:\s*)(.*?)$/;
    Parser.RE_SPACES = /[\r\t\n]/g;

    Parser.TOKEN_OPERATION_PRINT = '=';
    Parser.TOKEN_OPERATION_SAFE_PRINT = '~';
    Parser.TOKEN_OPERATION_IF = '?';
    Parser.TOKEN_OPERATION_ELSE = '!';
    Parser.TOKEN_OPERATION_END_IF = '/?';
    Parser.TOKEN_OPERATION_EACH = '^';
    Parser.TOKEN_OPERATION_END_EACH = '/^';

    Parser.RootInstruction = inherit(Instruction, {

        evaluate : function(scope){
            return this.components.reduce(function(acc, child){
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
            this.pointerElse = this.components.length;
            return this;
        },

        evaluate : function(scope){
            var isTrueCond = !!(new Parser.ValInstruction(this.data).evaluate(scope)),
                components;

            if(!isTrueCond && isNull(this.pointerElse)){
                return '';
            }

            components = isTrueCond ?
                this.components.slice(0, isNull(this.pointerElse) ? this.components.length : this.pointerElse) :
                this.components.slice(this.pointerElse);

            return components.reduce(function(acc, component){
                return acc += component.evaluate(scope);
            }, '');
        }
    });

    Parser.ValInstruction = inherit(Instruction, {

        RE_SQUARE_BRACKETS : /\[([^\]]+)\]/g,

        constructor : function(){
            var TOKEN_METHOD_CALL = '()';

            Instruction.apply(this, arguments);

            if(!this.data){
                throw new Error('value is empty');
            }

            this.chunks = this.data.replace(this.RE_SQUARE_BRACKETS, '.$1').split('.').reduce(function(acc, chunk){
                chunk.indexOf(TOKEN_METHOD_CALL) !== -1 ?

                    chunk.split(TOKEN_METHOD_CALL).forEach(function(chnk){
                        acc.push({isMethod : !chnk, value : chnk});
                    }) :

                    acc.push({isMethod : false, value : chunk});

                return acc;
            }, []);
        },

        evaluate : function(scope){
            var chnks = this.chunks.slice(),
                ctx = scope,
                chunk;

            while(chnks.length && !isNullOrUndefined(ctx)){
                chunk = chnks.shift();
                ctx = chunk.isMethod ? ctx.call(scope) : ctx[chunk.value];
            }

            return isNullOrUndefined(ctx) ? '' : ctx;
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

        evaluate : function(scope){
            return this._toSafeHtml(Parser.ValInstruction.prototype.evaluate.call(this, scope));
        },

        _toSafeHtml : function(value){
            return value.replace(this.RE_HTML_ESC, function(ch){
                return this.SAFE_HTML_MAP[ch];
            }.bind(this));
        }
    });

    return {

        version : '0.0.0',

        tag : /\{{2}(.+?)\}{2}/,

        compile : function(pattern){
            var parser = new Parser(pattern, this.tag);

            return function(data){
                return parser.translate(data);
            };
        }
    };
}));