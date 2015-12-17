/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 22:05
 */

'use strict';

import ValInstruction from './val';

const RE_HTML_ESC = /[&<>"'\/]/g;

const SAFE_HTML_MAP = {
    '&' : '&amp;',
    '<' : '&lt;',
    '>' : '&gt;',
    '"' : '&quot;',
    "'" : '&#39;',
    '/' : '&#x2F;'
};

export default class extends ValInstruction {

    evaluate(...args){
        return super.evaluate(...args).replace(RE_HTML_ESC, (chr) => SAFE_HTML_MAP[chr]);
    }
}