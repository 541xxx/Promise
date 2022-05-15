const resolvePromise = (promise2, x, resolve, reject) => {
  // If promise and x refer to the same object, reject promise with a TypeError as the reason.
  if (promise2 === x) {
    return reject(
      new TypeError("Chaining cycle detected for promise #<Promise>")
    );
  }
  let called = false;
  /**
   * if promise and x refer to the same object, reject promise with a TypeError as the reason.
   *
   */
  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    try {
      const then = x.then;
      // If x is a promise, adopt its state
      if (typeof then === "function") {
        // If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise, where:
        // In order to ensure x.then is unaltered, we need to Write x.then instead of call the function directly. Object.defineProperty  Promise/A+ 2.3.3.3
        then.call(
          x,
          (y) => {
            // prevent multiple calls
            if (called) {
              return;
            }
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (r) => {
            if (called) {
              return;
            }
            called = true;
            reject(r);
          }
        );
      } else {
        // If then is not a function, fulfill promise with x.
        resolve(x);
      }
    } catch (e) {
      if (called) {
        return;
      }
      called = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
};

const PENDING = "PENDING";
const FULFILLED = "FULFILLED";
const REJECTED = "REJECTED";

class Promise {
  constructor(executor) {
    this.value = undefined;
    this.reason = undefined;
    this.status = PENDING;
    this.onResolveCallbacks = [];
    this.onRejectedCallbacks = [];
    const resolve = (value) => {
      if (this.status === PENDING) {
        this.status = FULFILLED;
        this.value = value;
        this.onResolveCallbacks.forEach((fn) => fn());
      }
    };
    const reject = (value) => {
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.reason = value;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };
    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }
  // The Promise.resolve() method returns a Promise object that is resolved with a given value.
  // If the value is a promise, that promise is returned; if the value is a thenable (i.e. has a "then" method), the returned promise will "follow" that thenable, adopting its eventual state; otherwise the returned promise will be fulfilled with the value.
  // This function flattens nested layers of promise-like objects (e.g. a promise that resolves to a promise that resolves to something) into a single layer
  static resolve(value) {
    if (Boolean(value) && typeof value.then === "function") {
      return value;
    } else {
      return new Promise((resolve) => resolve(value));
    }
  }
  static reject(value) {
    if (Boolean(value) && typeof value.then === "function") {
      return value;
    } else {
      return new Promise((resolve, reject) => reject(value));
    }
  }
  static all(promises) {
    let count = 0;
    let result = [];
    return new Promise((resolve, reject) => {
      promises.forEach((p, i) => {
        p.then((res) => {
          count++;
          result[i] = res;
          if (count === promises.length) {
            resolve(result);
          }
        }).catch(reject);
      });
    });
  }
  static race(promises) {
    return new Promise((resolve, reject) => {
      for (const p of promises) {
        p.then(resolve).catch(reject);
      }
    });
  }
  static allSettled(promises) {
    let count = 0;
    const fn = (data, index, callback) => {
      count++;
      result[index] = data;
      if (count === promises.length) {
        callback(result);
      }
    };
    let result = [];
    return new Promise((resolve, reject) => {
      promises.forEach((p, i) => {
        p.then((res) => {
          fn(Promise.resolve(res), i, resolve);
        }).catch((err) => {
          fn(Promise.reject(err), i, resolve);
        });
      });
    });
  }
  static any(promises) {
    return new Promise((resolve, reject) => {
      let rejectedCount = 0;
      let errors = [];
      promises.forEach((p, i) => {
        p.then(resolve).catch((err) => {
          rejectedCount++;
          errors[i] = err;
          if (rejectedCount === promises.length) {
            reject(errors);
          }
        });
      });
    });
  }
  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : (v) => v;
    // throw an error to be catched directly, otherwise it will be resolved in the function resolvePromise
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (err) => {
            throw err;
          };
    let promise2 = new Promise((resolve, reject) => {
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      }
      if (this.status === REJECTED) {
        setTimeout(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      }
      if (this.status === PENDING) {
        // put the callbacks into onResolveCallbacks, if the status is pending
        this.onResolveCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.reason);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
      }
    });
    return promise2;
  }
  catch(onRejected) {
    return this.then(null, onRejected);
  }
  finally(callback) {
    // Wrap a function to pass the value
    return this.then(
      (value) => Promise.resolve(callback()).then(() => value),
      (err) =>
        Promise.resolve(callback()).then(() => {
          // throw an error to be catched directly, otherwise it will be resolved in the function resolvePromise
          throw err;
        })
    );
  }
}
Promise.defer = Promise.deferred = function () {
  let dfd = {};
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = Promise;
