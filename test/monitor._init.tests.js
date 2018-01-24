"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
chai.should();
const rewire = require("rewire");
const Docker = require("dockerode");

const _handler = {
	onContainerUp: (d, m) => {},
	onContainerDown: (d, m) => {},
	onError: (d, m) => {},
	onUpdateComplete: (d, m) => {},
	onMonitorStarted: (d, m) => {},
	onMonitorStopped: (d, m) => {}
};

const _options = {};

describe("monitor->init", done => {
	describe("when initialized without dockerOptions", done => {
		it("must resolve the monitor object", done => {
			let monitor = rewire("../lib/index.js");

			monitor
				.init(_handler, null, _options)
				.then(m => {
					let handler = monitor.__get__("handler");
					let dockerOpts = monitor.__get__("dockerOpts");
					let opts = monitor.__get__("opts");

					expect(handler.onContainerUp).to.not.equal(undefined);
					expect(handler.onContainerUp).to.not.equal(null);
					expect(handler.onContainerDown).to.not.equal(undefined);
					expect(handler.onContainerDown).to.not.equal(null);
					expect(handler.onError).to.not.equal(undefined);
					expect(handler.onError).to.not.equal(null);
					expect(handler.onUpdateComplete).to.not.equal(undefined);
					expect(handler.onUpdateComplete).to.not.equal(null);
					expect(handler.onMonitorStarted).to.not.equal(undefined);
					expect(handler.onMonitorStarted).to.not.equal(null);
					expect(handler.onMonitorStopped).to.not.equal(undefined);
					expect(handler.onMonitorStopped).to.not.equal(null);
					expect(dockerOpts).to.equal(null);
					expect(dockerOpts).to.not.equal(undefined);
					expect(opts.selectorLabel).to.not.equal("monitorAll");
					expect(opts.selectorLabel).to.not.equal(null);
					expect(opts.selectorLabel).to.not.equal(undefined);
					expect(opts.strategy).to.not.equal("node-docker-monitor");
					expect(opts.strategy).to.not.equal(null);
					expect(opts.strategy).to.not.equal(undefined);
					expect(monitor.docker).to.not.equal(null);
					expect(monitor.docker).to.not.equal(undefined);

					expect(m).to.not.equal(null);
					expect(m).to.not.equal(undefined);
					done();
				})
				.catch(done);
		});
	});
	describe("when initialized with dockerOptions", done => {
		it("must resolve the monitor object", done => {
			let monitor = rewire("../lib/index.js");

			monitor
				.init(_handler, { socketPath: "/var/run/docker/docker.sock" }, _options)
				.then(m => {
					let handler = monitor.__get__("handler");
					let dockerOpts = monitor.__get__("dockerOpts");
					let opts = monitor.__get__("opts");

					expect(handler.onContainerUp).to.not.equal(undefined);
					expect(handler.onContainerUp).to.not.equal(null);
					expect(handler.onContainerDown).to.not.equal(undefined);
					expect(handler.onContainerDown).to.not.equal(null);
					expect(handler.onError).to.not.equal(undefined);
					expect(handler.onError).to.not.equal(null);
					expect(handler.onUpdateComplete).to.not.equal(undefined);
					expect(handler.onUpdateComplete).to.not.equal(null);
					expect(handler.onMonitorStarted).to.not.equal(undefined);
					expect(handler.onMonitorStarted).to.not.equal(null);
					expect(handler.onMonitorStopped).to.not.equal(undefined);
					expect(handler.onMonitorStopped).to.not.equal(null);
					expect(dockerOpts).to.not.equal(null);
					expect(dockerOpts).to.not.equal(undefined);
					expect(dockerOpts.socketPath).to.not.equal(null);
					expect(dockerOpts.socketPath).to.not.equal(undefined);
					expect(dockerOpts.socketPath).to.equal("/var/run/docker/docker.sock");
					expect(opts.selectorLabel).to.not.equal("monitorAll");
					expect(opts.selectorLabel).to.not.equal(null);
					expect(opts.selectorLabel).to.not.equal(undefined);
					expect(opts.strategy).to.not.equal("node-docker-monitor");
					expect(opts.strategy).to.not.equal(null);
					expect(opts.strategy).to.not.equal(undefined);
					expect(monitor.docker).to.not.equal(null);
					expect(monitor.docker).to.not.equal(undefined);

					expect(m).to.not.equal(null);
					expect(m).to.not.equal(undefined);
					done();
				})
				.catch(done);
		});
	});

	describe("when initialized with docker", done => {
		it("must resolve the monitor object", done => {
			let monitor = rewire("../lib/index.js");

			monitor
				.init(_handler, new Docker({ socketPath: "/var/run/docker/docker.sock" }), _options)
				.then(m => {
					let handler = monitor.__get__("handler");
					let dockerOpts = monitor.__get__("dockerOpts");
					let opts = monitor.__get__("opts");

					expect(handler.onContainerUp).to.not.equal(undefined);
					expect(handler.onContainerUp).to.not.equal(null);
					expect(handler.onContainerDown).to.not.equal(undefined);
					expect(handler.onContainerDown).to.not.equal(null);
					expect(handler.onError).to.not.equal(undefined);
					expect(handler.onError).to.not.equal(null);
					expect(handler.onUpdateComplete).to.not.equal(undefined);
					expect(handler.onUpdateComplete).to.not.equal(null);
					expect(handler.onMonitorStarted).to.not.equal(undefined);
					expect(handler.onMonitorStarted).to.not.equal(null);
					expect(handler.onMonitorStopped).to.not.equal(undefined);
					expect(handler.onMonitorStopped).to.not.equal(null);
					expect(dockerOpts).to.not.equal(null);
					expect(dockerOpts).to.not.equal(undefined);
					expect(opts.selectorLabel).to.not.equal("monitorAll");
					expect(opts.selectorLabel).to.not.equal(null);
					expect(opts.selectorLabel).to.not.equal(undefined);
					expect(opts.strategy).to.not.equal("node-docker-monitor");
					expect(opts.strategy).to.not.equal(null);
					expect(opts.strategy).to.not.equal(undefined);
					expect(monitor.docker).to.not.equal(null);
					expect(monitor.docker).to.not.equal(undefined);

					expect(m).to.not.equal(null);
					expect(m).to.not.equal(undefined);
					done();
				})
				.catch(done);
		});
	});
});
