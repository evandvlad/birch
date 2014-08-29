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

    var birch;

    function constf(v){
        return function(){
            return v;
        };
    }

    function isNullOrUndefined(v){
        return typeof v === 'undefined' || v === null;
    }

    function Lexer(str, delemiter){
        this.lexems = this._toLexems(str, delemiter);
    }

    Lexer.RE_SPACES = /[\r\t\n]/g;
    Lexer.RE_COMMON_LEX = /^(\S+)(?:\s*)(.*?)$/;
    Lexer.RE_SQUARE_BRACKETS = /\[([^\]]+)\]/g;
    Lexer.RE_F_CALL = /^([^(]+)?(\(.+)+$/;
    Lexer.RE_FNS_ARGS = /\((.*?)\)/g;

    Lexer.LEX_TYPE_EMPTY = 1;
    Lexer.LEX_TYPE_PRINT = 2;
    Lexer.LEX_TYPE_IF = 3;
    Lexer.LEX_TYPE_ELSE = 4;
    Lexer.LEX_TYPE_END_IF = 5;
    Lexer.LEX_TYPE_EACH = 6;
    Lexer.LEX_TYPE_END_EACH = 7;

    Lexer.TOKEN_OP_PRINT = '=';
    Lexer.TOKEN_OP_IF = '?';
    Lexer.TOKEN_OP_ELSE = '!';
    Lexer.TOKEN_OP_END_IF = '/?';
    Lexer.TOKEN_OP_EACH = '^';
    Lexer.TOKEN_OP_END_EACH = '/^';

    // PRINT_OPER = "="
    // IF_OPER = "?"
    // ELSE_OPER = "!"
    // END_IF_OPER = "/?"
    // EACH_OPER = "^"
    // END_EACH_OPER = "/^"

    // IDENT = Char{Char | Digit | "_"}
    // PROP = "[" IDENT "]" | "." IDENT
    // METH = "("{VAR{"," VAR}}")"
    // VAR = IDENT{PROP | METH}

    // PRINT = PRINT_OPER VAR
    // IF = IF_OPER VAR
    // ELSE = ELSE_OPER
    // END_IF = END_IF_OPER
    // EACH = VAR "->" "(" IDENT {"," IDENT}")"
    // END_EACH = END_EACH_OPER

    Lexer.prototype = {

        constructor : Lexer,

        _toLexems : function(str, delimiter){
            return str.replace(Lexer.RE_SPACES, ' ').split(delimiter).reduce(function(acc, v, i){
                var isPlainText = !(i % 2);
                !(isPlainText && !v) && acc.push(this._getLexem(isPlainText, v));
                return acc;
            }.bind(this), []);
        },

        _getLexem : function(isPlainText, value){
            var data = {},
                match,
                op,
                body;

            if(isPlainText){
                data.type = Lexer.LEX_TYPE_EMPTY;
                data.code = constf(value);
                return data;
            }

            match = value.trim().match(Lexer.RE_COMMON_LEX);

            if(match === null){
                throw new Error('incorrect lexem: ' + value);
            }

            op = match[1];
            body = match[2];

            switch(op){
                case Lexer.TOKEN_OP_PRINT :
                    data.type = Lexer.LEX_TYPE_PRINT;
                    data.code = this._genCodeForVar(body);
                    break;

                case Lexer.TOKEN_OP_IF :
                    data.type = Lexer.LEX_TYPE_IF;
                    data.code = this._genCodeForCond(body);
                    break;

                case Lexer.TOKEN_OP_ELSE :
                    data.type = Lexer.LEX_TYPE_ELSE;
                    data.code = constf('');
                    break;

                case Lexer.TOKEN_OP_END_IF :
                    data.type = Lexer.LEX_TYPE_END_IF;
                    data.code = constf('');
                    break;

                case Lexer.TOKEN_OP_EACH :
                    data.type = Lexer.LEX_TYPE_EACH;
                    data.code = constf('');
                    break;

                case Lexer.TOKEN_OP_END_EACH :
                    data.type = Lexer.LEX_TYPE_END_EACH;
                    data.code = constf('');
                    break;

                default :
                    throw new Error('incorrect token of lexem operator: ' + op);
            }

            return data;
        },

        _genCodeForVar : function(v){
            var self = this,
                parts;

            if(!v){
                throw new Error('expected variable name');
            }


            parts = this._varToParts(v);

            return function(scope){
                var pts = parts.slice(),
                    ctx = scope,
                    pt;

                while(pts.length && !isNullOrUndefined(ctx)){
                    pt = pts.shift();
                    ctx = pt.evaluated ? ctx.apply(null, pt.data.map(function(arg){
                        return self._genCodeForVar(arg)(scope);
                    })) : ctx[pt.data];
                }

                return isNullOrUndefined(ctx) ? '' : ctx;
            };
        },

        _genCodeForCond : function(v){
            var codeForVar = this._genCodeForVar(v);

            return function(scope){
                return !!codeForVar(scope);
            };
        },

        _varToParts : function(str){
            return str.replace(Lexer.RE_SQUARE_BRACKETS, '.$1').split('.').reduce(function(acc, part){
                var match = part.match(Lexer.RE_F_CALL);

                if(match){
                    match[1] && acc.push({
                        evaluated : false,
                        data : match[1]
                    });

                    match[2] && match[2].replace(Lexer.RE_FNS_ARGS, function(all, v){
                        acc.push({
                            evaluated : true,
                            data : v.trim().split(',').reduce(function(acc, arg){
                                arg = arg.trim();
                                arg && acc.push(arg);
                                return acc;
                            }, [])
                        })
                    });
                }
                else{
                    acc.push({
                        evaluated : false,
                        data : part
                    });
                }

                return acc;
            }, []);
        }
    };

    function Parser(lexer){
        this.lexer = lexer;
    }

    Parser.prototype = {

        constructor : Parser,

        translate : function(scope){
            return this.lexer.lexems.reduce(function(acc, lx){
                return acc += lx.code(scope);
            }, '');
        }
    };

    birch = {

        version : '0.0.0',

        tag : /\{{2}(.+?)\}{2}/,

        compile : function(pattern){
            var parser = new Parser(new Lexer(pattern, birch.tag));

            return function(data){
                return parser.translate(data);
            };
        }
    };

    return birch;
}));