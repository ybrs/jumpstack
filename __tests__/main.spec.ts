import { chainWithTimeout, parallel, parallelMap } from './../src/main';
import { chain, mapChain } from "../src/main";

describe('chain test', () => {
  beforeAll(async () => {
  });

  it('should run the chain sequentially', (done) => {
    chain([
      (cb)=>{
        cb(null, 1);
      }
    ], (err, val) => {
      expect(err).toBeNull();
      expect(val).toBe(1);
      done()
    })
  });


  it('should use chain context', (done) => {

    chain([
      (cb) => { cb(null, 1); },
      (cb, v, ctx) => { ctx.add({ctxVal: 'ctx'}); cb(null, v+1); },
      (cb, v) => { cb(null, v+2); },
      (cb, _v, ctx) => { cb(null, ctx.get('ctxVal')); }

    ], (err, val) => {
      expect(err).toBeNull();
      expect(val).toBe('ctx');
      done()
    })

  });


  it('should break chain when neeeded', (done)=>{
    chain([
      (cb, _, ctx)=>{
        ctx.break("test", cb)
      },
      (cb)=>cb(null, "123")
    ], (err, val)=>{
      expect(err).toBeNull()
      expect(val).toBe("test")

      done()
    })
  })


  it('mapchain', (done)=>{
       mapChain([1,2,3], (value, cb)=>{
          cb(null, value+1)
       }, (errors, values)=>{
          expect(errors).toBeNull();
          expect(values).toEqual([2,3,4])
          done()
      })
  })

  it('should run in parallel', (done)=>{
    parallel([
      (cb)=>cb(null, 1),
      (cb)=>cb(null, 2),
      (cb)=>cb(null, 3),
    ], (_errs, val)=>{
      expect(val).toEqual(3)
      done()
    })
  })

  it('should run in parallel map', (done)=>{
    parallelMap([1,2,3], (value, cb)=>{
      cb(null, value + 1)
    }, (_errors, values)=>{
      expect(values).toEqual(expect.arrayContaining([2,3,4]));
      done()
    })
  })

  it('shouldnt timeout', (done)=>{
    chainWithTimeout([
      (cb)=>setTimeout(cb, 100),
    ], 1000,
    (_err, _val)=>{
      done();
    })
  })

});
