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

    var RE_SPACES = /[\r\t\n]/g,
        RE_SQUARE_BRACKETS = /\[([^\]]+)\]/g,
        RE_HTML_ESC = /[&<>"'\/]/g,

        SAFE_HTML_MAP = {
            '&' : '&amp;',
            '<' : '&lt;',
            '>' : '&gt;',
            '"' : '&quot;',
            "'" : '&#39;',
            '/' : '&#x2F;'
        },

        birch;

    function constf(v){
        return function(){
            return v;
        };
    }

    function isNullOrUndefined(v){
        return typeof v === 'undefined' || v === null;
    }

    function toSafeHtml(html){
        return html.replace(RE_HTML_ESC, function(ch){
            return SAFE_HTML_MAP[ch];
        });
    }

    function Lexer(pattern, delimiter){
        this.tags = this._toTags(pattern, delimiter);
    }

    Lexer.RE_COMMON_TAG = /^(\S+)(?:\s*)(.*?)$/;

    Lexer.TAG_TYPE_NULL = 1;
    Lexer.TAG_TYPE_PRINT = 2;
    Lexer.TAG_TYPE_SAFE_PRINT = 3;
    Lexer.TAG_TYPE_IF = 4;
    Lexer.TAG_TYPE_ELSE = 5;
    Lexer.TAG_TYPE_END_IF = 6;
    Lexer.TAG_TYPE_EACH = 7;
    Lexer.TAG_TYPE_END_EACH = 8;

    Lexer.TOKEN_OP_PRINT = '=';
    Lexer.TOKEN_OP_SAFE_PRINT = '~';
    Lexer.TOKEN_OP_IF = '?';
    Lexer.TOKEN_OP_ELSE = '!';
    Lexer.TOKEN_OP_END_IF = '/?';
    Lexer.TOKEN_OP_EACH = '^';
    Lexer.TOKEN_OP_END_EACH = '/^';
    Lexer.TOKEN_METH_CALL = '()';

    // PRINT_OPER = "="
    // SAFE_PRINT_OPER = "~"
    // IF_OPER = "?"
    // ELSE_OPER = "!"
    // END_IF_OPER = "/?"
    // EACH_OPER = "^"
    // END_EACH_OPER = "/^"

    // VAR = Char{Char | Digit | "_"}
    // PROP = "[" VAR "]" | "." VAR
    // METH = "()"
    // GETTER = VAR{PROP | METH}

    // PRINT = PRINT_OPER GETTER
    // SAFE_PRINT = SAFE_PRINT_OPER GETTER
    // IF = IF_OPER GETTER
    // ELSE = ELSE_OPER
    // END_IF = END_IF_OPER
    // EACH = GETTER "->" "(" VAR {"," VAR}")"
    // END_EACH = END_EACH_OPER

    Lexer.prototype = {

        constructor : Lexer,

        _toTags : function(str, delimiter){
            return str.replace(RE_SPACES, ' ').split(delimiter).reduce(function(acc, tag, i){
                var isPlainText = !(i % 2);
                !(isPlainText && !tag) && acc.push(this._parseTag(isPlainText, tag));
                return acc;
            }.bind(this), []);
        },

        _parseTag : function(isPlainText, value){
            var data = {},
                match,
                op,
                body;

            if(isPlainText){
                data.type = Lexer.TAG_TYPE_NULL;
                data.code = constf(value);
                return data;
            }

            match = value.trim().match(Lexer.RE_COMMON_TAG);

            if(match === null){
                throw new Error('incorrect tag: ' + value);
            }

            op = match[1];
            body = match[2];

            switch(op){
                case Lexer.TOKEN_OP_PRINT :
                    data.type = Lexer.TAG_TYPE_PRINT;
                    data.code = this._genCodeForGetter(body);
                    break;

                case Lexer.TOKEN_OP_SAFE_PRINT :
                    data.type = Lexer.TAG_TYPE_SAFE_PRINT;
                    data.code = this._genCodeForSafeGetter(body);
                    break;

                case Lexer.TOKEN_OP_IF :
                    data.type = Lexer.TAG_TYPE_IF;
                    data.code = this._genCodeForCond(body);
                    break;

                case Lexer.TOKEN_OP_ELSE :
                    data.type = Lexer.TAG_TYPE_ELSE;
                    data.code = constf('');
                    break;

                case Lexer.TOKEN_OP_END_IF :
                    data.type = Lexer.TAG_TYPE_END_IF;
                    data.code = constf('');
                    break;

                case Lexer.TOKEN_OP_EACH :
                    data.type = Lexer.TAG_TYPE_EACH;
                    data.code = constf('');
                    break;

                case Lexer.TOKEN_OP_END_EACH :
                    data.type = Lexer.TAG_TYPE_END_EACH;
                    data.code = constf('');
                    break;

                default :
                    throw new Error('operation: ' + op + ' not supported');
            }

            return data;
        },

        _genCodeForGetter : function(value){
            var chunks;

            if(!value){
                throw new Error('getter value is empty');
            }

            chunks = this._getterToChunks(value);

            return function(scope){
                var chnks = chunks.slice(),
                    ctx = scope,
                    chunk;

                while(chnks.length && !isNullOrUndefined(ctx)){
                    chunk = chnks.shift();
                    ctx = chunk.isEvl ? ctx.call(scope) : ctx[chunk.value];
                }

                return isNullOrUndefined(ctx) ? '' : ctx;
            };
        },

        _genCodeForSafeGetter : function(value){
            var getter = this._genCodeForGetter(value);

            return function(scope){
                return toSafeHtml(getter(scope));
            };
        },

        _genCodeForCond : function(value){
            var getter = this._genCodeForGetter(value);

            return function(scope){
                return !!getter(scope);
            };
        },

        _getterToChunks : function(value){
            return value.replace(RE_SQUARE_BRACKETS, '.$1').split('.').reduce(function(acc, chunk){
                chunk.indexOf(Lexer.TOKEN_METH_CALL) !== -1 ?

                    chunk.split(Lexer.TOKEN_METH_CALL).forEach(function(chnk){
                        acc.push({isEvl : !chnk, value : chnk});
                    }) :

                    acc.push({isEvl : false, value : chunk});

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
            return this.lexer.tags.reduce(function(acc, tag){
                return acc += tag.code(scope);
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