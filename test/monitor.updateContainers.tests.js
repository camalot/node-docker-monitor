"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const assert = chai.assert;
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

describe("monitor->updateContainers", done => {
	describe("when monitor started and _processContainersList resolves with the container", done => {
		it("must invoke the event callback and resolve", done => {
			let monitor = rewire("../lib/index.js");
			monitor.started = true;
			monitor.docker = {
				listContainers: cb => {
					cb(null, _infos);
				}
			};
			monitor.__set__("_processContainersList", l => {
				return new Promise((resolve, reject) => {
					resolve(_infos[0]);
				});
			});

			let updateContainers = monitor.__get__("updateContainers");

			updateContainers(e1 => {
				assert(e1 == null);
			})
				.then(c => {
					expect(c).to.equal(_infos[0]);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when monitor not started started and _processContainersList resolves with the container", done => {
		it("must invoke the event callback and resolve", done => {
			let monitor = rewire("../lib/index.js");
			monitor.docker = {
				listContainers: cb => {
					cb(null, _infos);
				}
			};
			monitor.__set__("_processContainersList", l => {
				return new Promise((resolve, reject) => {
					resolve(_infos[0]);
				});
			});

			let updateContainers = monitor.__get__("updateContainers");

			updateContainers(e1 => {
				assert(e1 == null);
			})
				.then(c => {
					expect(monitor.started).to.equal(true);
					expect(c).to.equal(_infos[0]);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when list returns an error", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.docker = {
				listContainers: cb => {
					cb(new Error("failure", null));
				}
			};

			let updateContainers = monitor.__get__("updateContainers");

			updateContainers(e1 => {
				expect(e1).to.not.equal(null);
				expect(e1).to.not.equal(undefined);
				expect(e1.message).to.not.equal(null);
				expect(e1.message).to.not.equal(undefined);
				expect(e1.message).to.equal("failure");
			})
				.then(e => {
					done(new Error("should reject"));
				})
				.catch(err => {
					expect(err).to.not.equal(null);
					expect(err).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.equal("failure");
					done();
				});
		});
	});
});
