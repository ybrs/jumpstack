import * as _ from 'lodash';
import { assert } from 'chai';

export const logError = (...args) => console.log(...args);

export const ensureKeyExists = (key, valueGetter, data) => {
    if (typeof data[key] === 'undefined') {
        data[key] = valueGetter();
    }

    return data;
};

export const ensureKeyExistsAsync = (key, valueGetter, data, cb) => {
    if (typeof data[key] === 'undefined') {
        return valueGetter((err, val) => {
            data[key] = val;
            cb(err, data);
        });
    }
    cb(null, data);
};

/**
 * ensures v is array, if its not an array, it returns an empty array
 *
 * @param v
 */
export const ensureArray = (v) => {
    if (!_.isArray(v)) {
        return []
    }
    return v
}

/**
 * ensures v is a dict - if its not a dictionary like, then returns
 * an empty dictionary/object
 *
 * @param v
 */
export const ensureDict = (v) => {
    if (!_.isObjectLike(v)) {
        return {}
    }
    return v
}


// export type Callback<T> = (err: Error | null, reply: T) => void;
export type CallbackFunction = (error: any, value: any) => void;

export type ChainReceiverFunction = (cb: CallbackFunction, value: any, ctx: Chain) => void;

/** if any of the values matches V then returns true
* note: dont use for large lists, as it doesnt break the loop its alway O(n)
*/
export const anyOf = (values, v) => values.filter(i => i === v).length > 0;

class Context {
    data = {};
    broken: boolean;
    breakValue: any;
    errored: boolean;
    errorValue: any;

    constructor() {
        this.data = {};
        this.broken = false;
        this.errored = false;
    }

    add(newdata) {
        this.data = Object.assign(this.data, newdata);
    }

    get(k) {
        return this.data[k];
    }

    /**
     * you can break the chain with value
     * it will skip the remaining steps
     *
     * @param value
     * @param cb
     */
    break(value, cb?) {
        this.broken = true;
        this.breakValue = value;
        if (cb) {
            cb(null, value);
        }
    }

    error(value, cb) {
        this.errored = true;
        this.errorValue = value;

        if (cb) {
            cb(value, null);
        }
    }
}

class Chain {
    fns = [];
    waitCnt = 0;
    totalCnt = 0;
    resolve = null;
    reject = null;
    last: any;
    context: Context;
    maxTimeout = null;
    timeout = null;

    constructor(fns, resolve, reject) {
        this.fns = fns;
        this.waitCnt = 0;
        this.totalCnt = fns.length;
        this.resolve = resolve;
        this.reject = reject;
        this.last = null;
        this.context = new Context();
        this.timeout = null;
    }

    setMaxTimeout = (ms) => {
        this.maxTimeout = ms;
        return this;
    }


    breakChain = (value) => {
        if (this.timeout)
            clearTimeout(this.timeout);

        return this.resolve(value);
    }

    rejectWithError = (err) => {
        this.reject(err);
    }

    callback = (err, result) => {
        if (this.timeout){
            clearTimeout(this.timeout);
        }

        if (err) {
            return this.reject(err);
        }

        if (this.context.broken) {
            // if they broke the chain we jump to conclusion
            const val = typeof this.context.breakValue !== 'undefined' ?
                this.context.breakValue : result;
            return this.breakChain(val);
        }

        if (this.context.errored) {
            // if they broke the chain with error, we jump to error
            return this.rejectWithError(this.context.errorValue);
        }

        this.waitCnt += 1;

        if (this.waitCnt === this.totalCnt) {
            return this.resolve(result);
        }

        this.runNext(result);
    }

    runNext = (result) => {
        if (this.maxTimeout){
            this.timeout = setTimeout(()=>{
                throw new Error(`timeout in chain step - ${this.waitCnt} ${this.fns[this.waitCnt]}`);
            }, this.maxTimeout)

        }
        this.fns[this.waitCnt](this.callback, result, this.context);
    }

}

/**
* chains callback based commands, returns either a promise or runs a callback
*
* eg:
*
* chain([
*  (cb)=>redis.get('foo', cb),
*  (cb, data)=>{dosomething(data); redis.get('bar', data, cb)},
*
* ]).then((data)=>{
*   console.log(data)
* })
*
* or you can use a callback chain
*
* chain([
*  (cb)=>redis.get('foo', cb),
*  (cb, data)=>{dosomething(data); redis.get('bar', data, cb)}
* ], (err, value)=>{...})
*
*
*
* see the tests for more details
*
* @param fns
*/
export const chain = (fns, cb?: CallbackFunction) => {
    if (cb) {
        // returns a callback chain
        const chain = new Chain(fns, val => cb(null, val), err => cb(err, null));
        return chain.runNext(null);
    }

    return promiseChain(fns);
};

export const chainWithTimeout = (fns, maxTimeout, cb:CallbackFunction) => {
    const chain = new Chain(fns, val => cb(null, val), err => cb(err, null));
    chain.setMaxTimeout(maxTimeout).runNext(null);
};

export const promiseChain = (fns) => {
    return new Promise((resolve, reject) => {
        const chain = new Chain(fns, resolve, reject);
        chain.runNext(null);
    });
};

/**
* nullcb can be used to skip a callback step
* its useful for adding a step to the chain that doesn't need a callback
*
* example:
* chain([
*  (cb) => redis.get('somevalue', cb),
*  nullcb((someResult, chainCtx) => chainCtx.add({ someResult })),
*  // same as
*  // (cb, val, chainCtx) => { chainCtx.add({ someResult }); cb(null, val); }
*  (cb, val) => // you'll get val
* ], (err, value)=>...)
*
*
* @param fn
*/
export const nullcb = fn =>
    (cb, val, ctx) => {
        cb(fn(val, ctx));
    }



export const storeInContext = (valName, fn) =>
    (cb, val, ctx) => {
        const o = {}
        o[valName] = val;
        ctx.add(o);
        fn(cb, val, ctx)
    }

/**
* skips the chain step if there is no value (or the value is null)
* so it saves a bit of typing if (val){....} in the step
*
* example:
*
* chain([
*   cb => redis.get('foo', cb),
*   // this wont be called if the value doesn't exists
*   ifValue((cb, val, ctx)=>redis.set('bar', 'xxx', cb))
*
* ], ...)
*
* @param fn
*/
export const ifValue = fn => (cb, val, ctx) => {
    if (!val) {
        return cb(null, val);
    }

    fn(cb, val, ctx);
}

/**
* runs a function for each of your elements then
* calls your callback function with all collected values
*
* with parallelMap there is no order of the values. We DON'T keep
* the order of the callbacks. Normally you'd just use mapChain
*
* example:
*     parallelMap(values, (value, cb)=>{
*        cb(null, value)
*     }, (errors, values)=>{
*
*     })
*
* @param arr
* @param fn
*/
export const parallelMap = (arr, fn, cb) => {
    let cnt = arr.length;
    const values = [];
    const errors = [];

    const elCallback = (err, value) => {
        cnt -= 1;
        if (err) {
            errors.push(err);
        }

        values.push(value);

        if (cnt === 0) {
            if (errors.length > 0) {
                cb(errors, values);
            } else {
                cb(null, values); // trick to easily write mapChain(vals, foo, (err)=>if err)
            }
        }
    };

    if (arr.length === 0) {
        cb(null, []);
    }

    if (!_.isArray(arr)) {
        throw new Error(`unexpected param in mapChain - ${JSON.stringify(arr)}`);
    }

    arr.map((el) => {
        fn(el, elCallback);
    });
};

/**
* this keeps the order as added.
*
* @param arr
* @param fn
* @param cb
*/
export const mapChain = (arr, fn, cb) => {
    let cnt = arr.length;
    const values = [];
    const errors = [];

    const elCallback = (ndx) => (err, value) => {
        cnt -= 1;
        if (err) {
            errors.push(err);
        }

        values[ndx] = value;

        if (cnt === 0) {

            if (errors.length > 0) {
                cb(errors, values);
            } else {
                cb(null, values); // trick to easily write mapChain(vals, foo, (err)=>if err)
            }
        }
    };

    if (arr.length === 0) {
        cb(null, []);
    }

    if (!_.isArray(arr)) {
        throw new Error(`unexpected param in mapChain - ${JSON.stringify(arr)}`);
    }

    arr.map((el, ndx) => {
        fn(el, elCallback(ndx));
    });
};


/**
* waits for all callbacks to complete, then runs your callback
*
* TODO: doesnt buffer values, errors etc.
*
* @param fns
* @param cb
*/
export const parallel = (fns, cb) => {
    let cnt = fns.length;
    const fnCallback = (err, value) => {
        cnt -= 1;
        if (cnt === 0) {
            cb(err, value);
        }
    };
    return fns.map((fn) => {
        fn(fnCallback);
    });
};

/**
* this is handy to use in tests
*
* especially in using chains
*
* chain([
*  (cb)=>redis.set('foo', 1, cb),
*  expectedCallback(1, redis.get('foo', cb), 'value doesnt match'),
*  (cb, v)=> ... // v is last returned value, here its 1
*
* ], (err, val)=>....)
*
* @param expectedValue
* @param fn
* @param message
*/
export const expected = (expectedValue, fn, message): ChainReceiverFunction => {
    return (cb, v, ctx) => {
        const expectCb: CallbackFunction = (err, value) => {
            assert(value === expectedValue, `${message} ${value}`);
            cb(err, value);
        };
        return fn(expectCb, v, ctx);
    };
};

/**
* decorates, value from a callback with the given function
*
* usage
*
* chain([
*  cb => redis.get('published_gameuuid-test2_favorited_cnt', decoratedCallback(parseInt, cb))
*  (cb, v) => // v is integer here
* ], ()=>...)
*
* @param decoratorFn
* @param cb
*/
export const decoratedCallback = (decoratorFn: Function, cb: CallbackFunction) =>
    (err, value) => {
        if (err) {
            return cb(err, value);
        }
        cb(err, decoratorFn(value));
    };

export const dc = decoratedCallback;

/**
* this is a branch helper for callbacks
* if will pass the error to some other callback
* or throw an exception if there is nothing to do
* -
* chain([
*  cb => redis.get('foo', guarderror(value => {...}, cb) )
* ])
* -
* @param fn
* @param cb
*/
export const guarderror = (fn, cb?) => (err, value) => {
    if (!err) {
        return fn(value);
    }

    if (cb) {
        return cb(err, value);
    }

    // console.log('error', err);
    throw new Error(err);
};


export const filterNotNull = (vals) => vals.filter(val => val !== null)

/**
* maps array of key, value tuples to an object
* const c = reduceToDict([
*   ['x', 1],
*    ['y', 2]
* ])
* c == {x: 1, y: 2}
* @param vals array of k,v tuples
*/
export const reduceToDict = (vals) => {
    return Object.assign({}, ...vals.map(([k, v]) => ({ [k]: v })));
}
