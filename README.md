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
