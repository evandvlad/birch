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


    // PRINT_OPER = =
    // IF_OPER = ?
    // ELSE_OPER = !
    // END_IF_OPER = /?
    // EACH_OPER = ^
    // END_EACH_OPER = /^

    // VAR_PROP = [name] | .name
    // VAR = name | nameVAR_PROP{VAR_PROP}

    // FUNC_CALL = VAR"("{VAR{"," VAR}}")"

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
            var lexData = {},
                match,
                op,
                body;

            if(isPlainText){
                lexData.lexType = Lexer.LEX_TYPE_EMPTY;
                lexData.code = constf(value);
                return lexData;
            }

            match = value.trim().match(Lexer.RE_COMMON_LEX);

            if(match === null){
                throw new Error('incorrect lexem: ' + value);
            }

            op = match[1];
            body = match[2];

            switch(op){
                case Lexer.TOKEN_OP_PRINT :
                    lexData.lexType = Lexer.LEX_TYPE_PRINT;
                    lexData.code = (function(v){
                        var parts;

                        if(!v){
                            throw new Error('expected variable name');
                        }

                        parts = v.replace(Lexer.RE_SQUARE_BRACKETS, '.$1').split('.');

                        return function(scope){
                            var pts = parts.slice(),
                                ctx = scope;

                            while(pts.length && !isNullOrUndefined(ctx)){
                                ctx = ctx[pts.shift()];
                            }

                            return isNullOrUndefined(ctx) ? '' : ctx;
                        };
                    }(body));
                    break;

                case Lexer.TOKEN_OP_IF :
                    lexData.lexType = Lexer.LEX_TYPE_IF;
                    lexData.code = constf('');
                    break;

                case Lexer.TOKEN_OP_ELSE :
                    lexData.lexType = Lexer.LEX_TYPE_ELSE;
                    lexData.code = constf('');
                    break;

                case Lexer.TOKEN_OP_END_IF :
                    lexData.lexType = Lexer.LEX_TYPE_END_IF;
                    lexData.code = constf('');
                    break;

                case Lexer.TOKEN_OP_EACH :
                    lexData.lexType = Lexer.LEX_TYPE_EACH;
                    lexData.code = constf('');
                    break;

                case Lexer.TOKEN_OP_END_EACH :
                    lexData.lexType = Lexer.LEX_TYPE_END_EACH;
                    lexData.code = constf('');
                    break;

                default :
                    throw new Error('incorrect token of lexem operator: ' + op);
            }

            return lexData;
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