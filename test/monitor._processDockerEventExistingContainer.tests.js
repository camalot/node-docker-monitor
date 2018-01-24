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

describe("monitor->_processDockerEventExistingContainer ", done => {
	describe("when is positive event and updateContainer is successful", done => {
		it("must resolve and return the updated container", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("updateContainer", c => {
				return new Promise((resolve, reject) => {
					return resolve(c);
				});
			});
			let _processDockerEventExistingContainer = monitor.__get__(
				"_processDockerEventExistingContainer"
			);
			_processDockerEventExistingContainer({ status: "create" }, _infos[0])
				.then(r => {
					expect(r).to.not.equal(null);
					expect(r).to.not.equal(undefined);
					expect(r).to.equal(_infos[0]);
					return done();
				})
				.catch(err => {
					return done(err);
				});
		});
	});

	describe("when is positive event and updateContainer is failure", done => {
		it("must reject call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("updateContainer", c => {
				return new Promise((resolve, reject) => {
					return reject(new Error("failure"));
				});
			});
			let _processDockerEventExistingContainer = monitor.__get__(
				"_processDockerEventExistingContainer"
			);
			_processDockerEventExistingContainer({ status: "create" }, _infos[0])
				.then(r => {
					return done("should reject");
				})
				.catch(err => {
					expect(err).to.not.equal(null);
					expect(err).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.equal("failure");
					return done();
				});
		});
	});

	describe("when is negative event and updateContainer is successful", done => {
		it("must resolve and return the updated container", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("updateContainer", c => {
				return new Promise((resolve, reject) => {
					return resolve(c);
				});
			});
			monitor.__set__("removeContainer", c => {
				return new Promise((resolve, reject) => {
					return resolve(c);
				});
			});
			let _processDockerEventExistingContainer = monitor.__get__(
				"_processDockerEventExistingContainer"
			);
			_processDockerEventExistingContainer({ status: "destroy" }, _infos[0])
				.then(r => {
					expect(r).to.not.equal(null);
					expect(r).to.not.equal(undefined);
					expect(r).to.equal(_infos[0]);
					return done();
				})
				.catch(err => {
					return done(err);
				});
		});
	});

	describe("when is no container to remove", done => {
		it("must reject call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("updateContainer", c => {
				return new Promise((resolve, reject) => {
					return resolve(c);
				});
			});
			monitor.__set__("removeContainer", c => {
				return new Promise((resolve, reject) => {
					return reject(new Error("no container to remove."));
				});
			});
			let _processDockerEventExistingContainer = monitor.__get__(
				"_processDockerEventExistingContainer"
			);
			_processDockerEventExistingContainer({ status: "destroy" }, _infos[0])
				.then(r => {
					return done(new Error("should reject"));
				})
				.catch(err => {
					expect(err).to.not.equal(null);
					expect(err).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.equal("no container to remove.");
					return done();
				});
		});
	});
});
