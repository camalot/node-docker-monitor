"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
chai.should();
const rewire = require("rewire");

let _addContainerCalls = 0;
let _removeContainerCalls = 0;
let _addContainerSuccess = i => {
	return new Promise((resolve, reject) => {
		console.log("add container success");
		_addContainerCalls++;
		return resolve(i);
	});
};
let _addContainerFailure = i => {
	return new Promise((resolve, reject) => {
		_addContainerCalls++;
		console.log("add container fail");
		return reject("add container fail");
	});
};

let _removeContainerSuccess = i => {
	return new Promise((resolve, reject) => {
		console.log("remove container success");
		_removeContainerCalls++;
		return resolve(i);
	});
};
let _removeContainerFailure = i => {
	return new Promise((resolve, reject) => {
		console.log("remove container fail");
		_removeContainerCalls++;
		return reject("remove container fail");
	});
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
	},
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
		Status: "Up About an hour",
		Name: "m4all-next"
	}
];

describe("monitor->updateContainer", done => {
	describe("when container already exists and remove is successful and didn't change", done => {
		it("must return the existing info", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("addContainer", _addContainerSuccess);
			monitor.__set__("removeContainer", _removeContainerSuccess);
			let oldInfo = _infos[0];
			let info = _infos[0];

			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			containersNamed.set(info.Name, oldInfo);
			containersId.set(info.Id, oldInfo);
			monitor.__set__("containerById", containersId);
			monitor.__set__("containerByName", containersNamed);

			_addContainerCalls = 0;
			_removeContainerCalls = 0;
			let _updateContainer = monitor.__get__("updateContainer");
			_updateContainer(oldInfo)
				.then(d => {
					expect(_removeContainerCalls).to.equal(0);
					expect(_addContainerCalls).to.equal(0);
					done();
				})
				.catch(done);
		});
	});
	describe("when container already exists and remove is successful", done => {
		it("must remove the old, and add the new", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("addContainer", _addContainerSuccess);
			monitor.__set__("removeContainer", _removeContainerSuccess);
			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");

			let oldInfo = _infos[0];
			let info = _infos[1];

			containersNamed.set(info.Name, info);
			containersId.set(info.Id, info);

			monitor.__set__("containerById", containersId);
			monitor.__set__("containerByName", containersNamed);

			_addContainerCalls = 0;
			_removeContainerCalls = 0;
			let _updateContainer = monitor.__get__("updateContainer");
			_updateContainer(oldInfo)
				.then(i => {
					expect(_addContainerCalls).to.equal(1);
					expect(_removeContainerCalls).to.equal(1);
					done();
				})
				.catch(done);
		});
	});
	describe("when container already exists and add is successful", done => {
		it("must remove the container, and add new one", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("addContainer", _addContainerSuccess);
			monitor.__set__("removeContainer", _removeContainerSuccess);
			let info = _infos[1];
			let oldInfo = _infos[0];

			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			containersNamed.set(oldInfo.Name, info);
			containersId.set(oldInfo.Id, info);
			_addContainerCalls = 0;
			_removeContainerCalls = 0;
			let _updateContainer = monitor.__get__("updateContainer");
			_updateContainer(oldInfo)
				.then(i => {
					expect(_addContainerCalls).to.equal(1);
					expect(_removeContainerCalls).to.equal(1);
					done();
				})
				.catch(done);
		});
	});
	describe("when container already exists and remove is unsuccessful", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("addContainer", _addContainerSuccess);
			monitor.__set__("removeContainer", _removeContainerFailure);
			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			let info = _infos[1];
			let oldInfo = _infos[0];

			containersNamed.set(oldInfo.Name, oldInfo);
			containersId.set(oldInfo.Id, oldInfo);

			_addContainerCalls = 0;
			_removeContainerCalls = 0;

			let _updateContainer = monitor.__get__("updateContainer");
			_updateContainer(info)
				.then(d => {
					done(new Error("should reject"));
				})
				.catch(err => {
					expect(_removeContainerCalls).to.equal(1);
					expect(_addContainerCalls).to.equal(0);
					done();
				});
		});
	});
	describe("when container already exists and add is unsuccessful", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("addContainer", _addContainerFailure);
			monitor.__set__("removeContainer", _removeContainerSuccess);
			let containersNamed = monitor.__get__("containerByName");
			let containersId = monitor.__get__("containerById");
			let info = _infos[1];
			let oldInfo = _infos[0];

			containersNamed.set(oldInfo.Name, oldInfo);
			containersId.set(oldInfo.Id, oldInfo);

			_addContainerCalls = 0;
			_removeContainerCalls = 0;

			let _updateContainer = monitor.__get__("updateContainer");
			_updateContainer(info)
				.then(d => {
					done(new Error("should reject"));
				})
				.catch(err => {
					expect(_removeContainerCalls).to.equal(1);
					expect(_addContainerCalls).to.equal(1);
					done();
				});
		});
	});

	describe("when container doesn't exist and add is successful", done => {
		it("must add the new container", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("addContainer", _addContainerSuccess);
			monitor.__set__("removeContainer", _removeContainerSuccess);
			let oldInfo = _infos[0];

			_addContainerCalls = 0;
			_removeContainerCalls = 0;
			let _updateContainer = monitor.__get__("updateContainer");
			_updateContainer(oldInfo)
				.then(i => {
					expect(_addContainerCalls).to.equal(1);
					expect(_removeContainerCalls).to.equal(0);
					done();
				})
				.catch(done);
		});
	});
});
