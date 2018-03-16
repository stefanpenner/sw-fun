'use strict';

const chai = require('chai');
const expect = chai.expect;
const createSession = require('chrome-debugging-client').createSession;
const express = require('express');

function serveFixtures() {
  return new Promise((resolve, reject) => {
    const app = express();

    app.use(express.static( __dirname + "/fixtures"));

    let server = app.listen(8000, (err) => {
      err ? reject(err) : resolve(server);
    });
  });
}

function runtimeEvaluate(client, fn) {
  return client.send("Runtime.evaluate", {
    expression: `(${fn.toString()}())`,
    awaitPromise: true
  });
}

describe('foo', function() {
  let server, browser;

  before(async function() {
    server = await serveFixtures();
  });

  after(function() {
    return new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    });
  });


  it('hi', async function() {
    return createSession(async (session) => {
      // spawns a chrome instance with a tmp user data
      // and the debugger open to an ephemeral port
      const browser = await session.spawnBrowser('canary', {
        // additionalArguments: ['--headless', '--disable-gpu', '--hide-scrollbars', '--mute-audio'],
        windowSize: { width: 640, height: 320 }
      });
      const workers = new Map();

      // open the REST API for tabs
      const api = session.createAPIClient("localhost", browser.remoteDebuggingPort);
      const tab = await api.newTab("about:blank");
      const client = await session.openDebuggingProtocol(tab.webSocketDebuggerUrl);
      client.send("ServiceWorker.enable", {});
      client.on("ServiceWorker.workerErrorReported", ({ errorMessage }) => console.log(errorMessage))
      client.on("ServiceWorker.workerVersionUpdated", async ({versions}) => {
        for (let version of versions) {
          workers.set(version.versionId, version);
        }
      });

      expect(workers.size).to.eql(0);
      let x = await client.send("Page.navigate", { url: "http://localhost:8000" });

      // wait till the worker is ready, and get its scriptURL
      let scriptURL = await runtimeEvaluate(client, async function() {
        await navigator.serviceWorker.ready;
        let registration = await navigator.serviceWorker.getRegistration();
        return registration.active.scriptURL;
      });
      expect(workers.size).to.eql(1);
      workers.forEach(worker => console.log(worker));

      expect(scriptURL.result.value).to.eql("http://localhost:8000/sw.js");

    });
  });
});
