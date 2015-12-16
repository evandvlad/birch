/**
 * Autor: Evstigneev Andrey
 * Date: 16.12.2015
 * Time: 1:16
 */

'use strict';

export default {

    evaluate(chunks, scope, data){
        let len = chunks.length,
            frame = scope,
            framesChain = [frame];

        for(let i = 0; i < len && this._isActiveFrameInChain(frame); i += 1){
            let chunk = chunks[i];

            if(chunk.isMethod){
                let context = this._lookupFunctionContext(framesChain, chunks, i),
                    args = this._evaluateFunctionArguments(chunk.args, data);

                frame = frame.apply(context, args);
            }
            else{
                frame = frame[chunk.value];
            }

            framesChain.push(frame);
        }

        return this._isActiveFrameInChain(frame) ? frame : '';
    },

    _isActiveFrameInChain(frame){
        return frame !== null && typeof frame !== 'undefined';
    },

    _lookupFunctionContext(frames, chunks, index){
        let prevIndex = index - 1;
        return chunks[prevIndex].isMethod ? null : frames[prevIndex];
    },

    _evaluateFunctionArguments(args, data){
        return args.map(arg => arg.evaluate(data));
    }
};