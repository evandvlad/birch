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

        TAG_TYPE_NULL = 1,
        TAG_TYPE_PRINT = 2,
        TAG_TYPE_SAFE_PRINT = 3,
        TAG_TYPE_IF = 4,
        TAG_TYPE_ELSE = 5,
        TAG_TYPE_END_IF = 6,
        TAG_TYPE_EACH = 7,
        TAG_TYPE_END_EACH = 8,

        SAFE_HTML_MAP = {
            '&' : '&amp;',
            '<' : '&lt;',
            '>' : '&gt;',
            '"' : '&quot;',
            "'" : '&#39;',
            '/' : '&#x2F;'
        },

        CondTreeItem,

        birch;

    function constf(v){
        return function(){
            return v;
        };
    }

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

        getTags : function(){
            return this.tags;
        },

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
                data.type = TAG_TYPE_NULL;
                data.execute = constf(value);
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
                    data.type = TAG_TYPE_PRINT;
                    data.execute = this._genCodeForGetter(body);
                    break;

                case Lexer.TOKEN_OP_SAFE_PRINT :
                    data.type = TAG_TYPE_SAFE_PRINT;
                    data.execute = this._genCodeForSafeGetter(body);
                    break;

                case Lexer.TOKEN_OP_IF :
                    data.type = TAG_TYPE_IF;
                    data.execute = this._genCodeForCond(body);
                    break;

                case Lexer.TOKEN_OP_ELSE :
                    data.type = TAG_TYPE_ELSE;
                    data.execute = constf('');
                    break;

                case Lexer.TOKEN_OP_END_IF :
                    data.type = TAG_TYPE_END_IF;
                    data.execute = constf('');
                    break;

                case Lexer.TOKEN_OP_EACH :
                    data.type = TAG_TYPE_EACH;
                    data.execute = constf('');
                    break;

                case Lexer.TOKEN_OP_END_EACH :
                    data.type = TAG_TYPE_END_EACH;
                    data.execute = constf('');
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

    function TreeItem(parent, data){
        this.data = data;
        this.parent = parent;
        this.children = [];
        parent && parent.addChild(this);
    }

    TreeItem.prototype = {

        constructor : TreeItem,

        addChild : function(child){
            this.children.push(child);
            return this;
        },

        getParent : function(){
            return this.parent;
        },

        execute : function(scope){
            return this.children.reduce(function(acc, child){
                return acc += child.execute(scope);
            }, '');
        }
    };

    CondTreeItem = inherit(TreeItem, {

        constructor : function(){
            TreeItem.apply(this, arguments);
            this.elseSp = -1;
        },

        addChild : function(child){
            child.type === TAG_TYPE_ELSE ?
                (this.elseSp = this.children.length) :
                TreeItem.prototype.addChild.apply(this, arguments);

            return this;
        },

        execute : function(scope){
            var isTrueCond = this.data.execute(scope),
                children;

            if(!isTrueCond && this.elseSp === -1){
                return '';
            }

            children = isTrueCond ?
                this.children.slice(0, this.elseSp === -1 ? this.children.length : this.elseSp) :
                this.children.slice(this.elseSp);

            return children.reduce(function(acc, child){
                return acc += child.execute(scope);
            }, '');
        }
    });

    function Parser(lexer){
        this.lexer = lexer;
    }

    Parser.prototype = {

        constructor : Parser,

        translate : function(scope){
            return this.lexer
                .getTags()
                .reduce(this._foldTree, new TreeItem(null, null))
                .execute(scope);
        },

        _foldTree : function(treeItem, tag){
            switch(tag.type){
                case TAG_TYPE_IF :
                    return new CondTreeItem(treeItem, tag);

                case TAG_TYPE_END_IF :
                    return treeItem.getParent();

                default :
                    treeItem.addChild(tag);
                    return treeItem;
            }
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