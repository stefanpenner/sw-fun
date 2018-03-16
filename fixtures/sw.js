// Change the version to create a new worker version
const version = '4.0.24';
console.log('loaded', version);
let doKill;
const kill = new Promise((resolve, reject) => doKill = reject);
Promise.prototype.finally = Promise.prototype.finally || function() {
  let promise = this;
  let constructor = promise.constructor;

  return promise.then(value => constructor.resolve(callback()).then(() => value),
    reason => constructor.resolve(callback()).then(() => { throw reason; }), label);
};


function wait(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}
function guard(promise, allowedTime = 1000) {
  // const timeout = new Promise((resolve, reject) => {
  //   const timer = setTimeout(() => reject('TIMEOUT'), allowedTime);
  //   promise.finally(clearTimeout.bind(null, timer));
  // });

  return Promise.race([kill, /*timeout,*/ promise]);
}

let WAIT_UNTIL_SUPER = ExtendableEvent.prototype.waitUntil;
ExtendableEvent.prototype.waitUntil = function waitUntil(extendedLifetimePromise) {
  console.log("custom wailtUntil")

  return WAIT_UNTIL_SUPER.call(this, guard(extendedLifetimePromise));
};

function log() {
  console.log(version, ...arguments);
}

self.addEventListener('fetch', event => {
  log('FETCH', event.request.url);
});

self.addEventListener('install', event => {
  log('install', version);
  // event.waitUntil(new Promise(() => {}));
});

self.addEventListener('activate', event => {
  log('activate', version);
  event.waitUntil(wait(2000));
  clients.claim();
});

self.addEventListener('message', ({data, origin}) => {
  log('message', data, origin, location.origin);
  if (origin !== location.origin) {
    // security
    return;
  }

  if (data.skipWaiting) { self.skipWaiting(); }
  if (data.kill)        { doKill('KILL'); }

});