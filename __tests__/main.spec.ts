import { chain } from "../src/main";

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
});
