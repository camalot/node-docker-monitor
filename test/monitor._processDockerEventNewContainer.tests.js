"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
chai.should();
const rewire = require("rewire");

let _infos = [
	{
		Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
		Image: "m4all-next:15-0511-1104",
		Names: ["/m4all-next"],
		Command:
			"/bin/sh -c '/bin/bash -c 'cd /home; mkdir data; node main/app.js''",
		Created: 1431402173,
		HostConfig: { NetworkMode: "default" },
		Labels: { my_label: "label_value" },
		Ports: [
			{
				IP: "172.17.42.1",
				PrivatePort: 3000,
				PublicPort: 3002,
				Type: "tcp"
			}
		],
		Status: "Up About an hour"
	}
];

describe("monitor->_processDockerEventNewContainer ", done => {
	describe("when stop is true", done => {
		it("must return empty map", done => {
			let monitor = rewire("../lib/index.js");
			let _processDockerEventNewContainer = monitor.__get__(
				"_processDockerEventNewContainer"
			);
			_processDockerEventNewContainer({ status: "create" }, true)
				.then(d => {
					expect(d).to.not.equal(null);
					expect(d).to.not.equal(undefined);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when not a positive event", done => {
		it("must return empty map", done => {
			let monitor = rewire("../lib/index.js");
			let _processDockerEventNewContainer = monitor.__get__(
				"_processDockerEventNewContainer"
			);
			_processDockerEventNewContainer({ status: "destroy" }, false)
				.then(d => {
					expect(d).to.not.equal(null);
					expect(d).to.not.equal(undefined);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when updateContainers has error", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			let updateContainers = next => {
				return next(new Error("failure"));
			};
			monitor.__set__("updateContainers", updateContainers);
			let _processDockerEventNewContainer = monitor.__get__(
				"_processDockerEventNewContainer"
			);
			_processDockerEventNewContainer({ status: "create" }, false)
				.then(d => {
					done(new Error("should reject"));
				})
				.catch(err => {
					expect(err).to.not.equal(null);
					expect(err).to.not.equal(undefined);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.equal("failure");
					done();
				});
		});
	});

	describe("when updateContainers and processDockerEvent are successful", done => {
		it("must resolve", done => {
			let monitor = rewire("../lib/index.js");
			let updateContainers = next => {
				return next();
			};
			let processDockerEvent = (event, stop) => {
				return new Promise((resolve, reject) => {
					let containerByName = monitor.__get__("containerByName");
					containerByName.set(_infos[0].Name, _infos[0]);
					let containerById = monitor.__get__("containerById");
					containerById.set(_infos[0].Id, _infos[0]);

					return resolve();
				});
			};
			monitor.__set__("processDockerEvent", processDockerEvent);
			monitor.__set__("updateContainers", updateContainers);
			let _processDockerEventNewContainer = monitor.__get__(
				"_processDockerEventNewContainer"
			);
			let containerByName = monitor.__get__("containerByName");
			_processDockerEventNewContainer({ status: "create" }, false)
				.then(d => {
					expect(containerByName.get(_infos[0].Name)).to.not.equal(null);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});


	describe("when updateContainers successful, but processDockerEvent is a failure", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			let updateContainers = next => {
				return next();
			};
			let processDockerEvent = (event, stop) => {
				return new Promise((resolve, reject) => {
					return reject(new Error("failure"));
				});
			};
			monitor.__set__("processDockerEvent", processDockerEvent);
			monitor.__set__("updateContainers", updateContainers);
			let _processDockerEventNewContainer = monitor.__get__("_processDockerEventNewContainer");
			_processDockerEventNewContainer({ status: "create" }, false)
				.then(d => {
					done(new Error("should resolve"));
				})
				.catch(err => {
					expect(err).to.not.equal(null);
					expect(err).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.equal('failure');

					done();
				});
		});
	});
});
