# node-typescript-boilerplate

Minimalistic callback style async function helpers

## Quick start

```shell
npm i jumpstack
```

Chain
================

Chain runs your callback functions sequentially. Passing the callback value
to the next step.

If it encounters an error, jumps to the end callback.


```javascript
  chain([
   (cb) => redis.get('foo', cb),
   (cb, data) => {
     dosomething(data);
     redis.get('bar', data, cb)},
  ]).then((data)=>{
    console.log(data)
  })
```

or use it in callback style,

```javascript
 chain([
  (cb) => redis.get('foo', cb),
  (cb, data) => {
    // data is the callback value from the previous step
    dosomething(data);
    redis.get('bar', data, cb);
  }
 ], (err, value) => {

 })

```

Chain, also has a context variable - this was one of the main reasons for this
library, because it is very convenient to add something to context in a step
and then get it back somewhere else.

```javascript
    chain([
      (cb) => { cb(null, 1); },
      (cb, v, ctx) => { ctx.add({ctxVal: 'ctx'}); cb(null, v+1); },
      (cb, v) => { cb(null, v+2); },
      (cb, _v, ctx) => { cb(null, ctx.get('ctxVal')); }

    ], (err, val) => {

    })
```

also you can break chain by using context,
this will break the chain, set the value and skip the remaning steps

```js
    chain([
      (cb, _, ctx)=>{
        ctx.break("test", cb)
      },
      (cb)=>cb(null, "123")
    ], (_err, val)=>{
      // val will be "test"
    })
```

you can also use chain with a timeout (which I find it super-handy to debug)

```js
    chainWithTimeout([
      (cb) => {
        // do something heavy
        cb(null, val); // if it takes more than X seconds, it will raise Error
      },
    ], 1000, // max time to wait in every step
    (_err, _val)=>{
      done();
    })
```



mapChain
=============

mapChain iterates over your input and collects values
returned by your cb function.

```js
    mapChain([1,2,3], (value, cb)=>{
      cb(null, value+1)
    }, (errors, values)=>{
      // values will be [2,3,4]
      // in the same order as the input
    })
```

parallel
==========

parallel just runs your functions, and then run your callback function

Its handy when you don't really care about the return values and just
want to wait for some functions to complete.

```js
    parallel([
      (cb)=>cb(null, 1),
      (cb)=>cb(null, 2),
      (cb)=>cb(null, 3),
    ], (_errs, val)=>{
      // val will be 3
      // this will run after all functions have completed
    })

```

parallelMap
=============

works like mapChain but doesn't keep the order. Most of the time you'll just
use mapChain. This is only useful when you want to sort values by execution time
- if you'll ever need that

```js
    parallelMap([1,2,3], (value, cb)=>{
      cb(null, value+1)
    }, (errors, values)=>{
      // values will be [2,3,4] or [3,2,4] or [4,2,3] etc.
      // in the same order as the input
    })
```


### Unit tests

Run

```bash
npm test
```


## Available scripts

+ `clean` - remove coverage data, Jest cache and transpiled files,
+ `build` - transpile TypeScript to ES6,
+ `build:watch` - interactive watch mode to automatically transpile source files,
+ `lint` - lint source files and tests,
+ `test` - run tests,
+ `test:watch` - interactive watch mode to automatically re-run tests

## License
BSD
