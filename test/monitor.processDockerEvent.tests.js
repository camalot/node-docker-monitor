"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const assert = chai.assert;
chai.should();
const rewire = require("rewire");

let _processDockerEventExistingContainerSuccess = (event, container) => {
	return new Promise((resolve, reject) => {
		return resolve(container);
	});
};
let _processDockerEventExistingContainerFailure = (event, container) => {
	return new Promise((resolve, reject) => {
		return reject(new Error("fail"));
	});
};
let _processDockerEventNewContainerSuccess = (event, stop, container) => {
	return new Promise((resolve, reject) => {
		return resolve(_infos[0]);
	});
};
let _processDockerEventNewContainerFailure = (event, stop, container) => {
	return new Promise((resolve, reject) => {
		return reject(new Error("fail"));
	});
};
let _event = {
	id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e1",
	status: "create"
};

let _newEvent = {
	id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
	status: "create"
};
let _infos = [
	{
		Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e1",
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
		Status: "Up About an hour",
		Name: "m4all-next"
	}
];

describe("monitor->processDockerEvent", done => {
	describe("when event is not tracked", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			let _processDockerEvent = monitor.__get__("processDockerEvent");
			_processDockerEvent({ status: "foo-event" }, false)
				.then(() => {
					return done("should be rejected");
				})
				.catch(err => {
					// Untracked event (foo-event)
					expect(err.message).to.equal("Untracked event (foo-event)");
					return done();
				});
		});
	});

	describe("when container exists, and processing is successful", done => {
		it("must resolve with the container", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__(
				"_processDockerEventExistingContainer",
				_processDockerEventExistingContainerSuccess
			);
			monitor.__set__("_processDockerEventNewContainer", () => {
				throw new Error("Should not call");
			});
			let info = _infos[0];

			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			containersNamed.set(info.Name, info);
			containersId.set(info.Id, info);
			monitor.__set__("containerById", containersId);
			monitor.__set__("containerByName", containersNamed);

			let _processDockerEvent = monitor.__get__("processDockerEvent");
			_processDockerEvent(_event, false)
				.then(c => {
					expect(c).to.equal(_infos[0]);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when container exists, and processing fails ", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__(
				"_processDockerEventExistingContainer",
				_processDockerEventExistingContainerFailure
			);
			monitor.__set__("_processDockerEventNewContainer", () => {
				throw new Error("Should not call");
			});
			let info = _infos[0];

			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			containersNamed.set(info.Name, info);
			containersId.set(info.Id, info);
			monitor.__set__("containerById", containersId);
			monitor.__set__("containerByName", containersNamed);

			let _processDockerEvent = monitor.__get__("processDockerEvent");
			_processDockerEvent(_event, false)
				.then(c => {
					done(new Error("Should reject"));
				})
				.catch(err => {
					expect(err.message).to.equal("fail");
					done();
				});
		});
	});

	describe("when new container, and processing is successful", done => {
		it("must ", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("_processDockerEventExistingContainer", () => {
				throw new Error("Should not call");
			});
			monitor.__set__("_processDockerEventNewContainer", _processDockerEventNewContainerSuccess);
			let info = _infos[0];

			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			containersNamed.set(info.Name, info);
			containersId.set(info.Id, info);
			monitor.__set__("containerById", containersId);
			monitor.__set__("containerByName", containersNamed);

			let _processDockerEvent = monitor.__get__("processDockerEvent");
			_processDockerEvent(_newEvent, false)
				.then(c => {
					expect(c).to.equal(_infos[0]);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when new container, and processing fails ", done => {
		it("must ", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("_processDockerEventExistingContainer", () => {
				throw new Error("Should not call");
			});
			monitor.__set__(
				"_processDockerEventNewContainer",
				_processDockerEventNewContainerFailure
			);
			let info = _infos[0];

			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			containersNamed.set(info.Name, info);
			containersId.set(info.Id, info);
			monitor.__set__("containerById", containersId);
			monitor.__set__("containerByName", containersNamed);

			let _processDockerEvent = monitor.__get__("processDockerEvent");
			_processDockerEvent(_newEvent, false)
				.then(c => {
					done(new Error('should reject'));
				})
				.catch(err => {
					expect(err.message).to.equal('fail');
					done();
				});
		});
	});
});
