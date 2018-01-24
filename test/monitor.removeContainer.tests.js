"use strict";
const chai = require("chai");
const expect = chai.expect;
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

describe("monitor->removeContainer", done => {
	describe("when container is in the collection", done => {
		it("must remove the container info from the collection", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitoringEnabled", i => {
				return true;
			});
			let info = _infos[0];
			let _removeContainer = monitor.__get__("removeContainer");
			let _containerByName = monitor.__get__("containerByName");
			let _containerById = monitor.__get__("containerById");
			expect(info).to.not.equal(undefined);
			expect(info).to.not.equal(null);
			_containerByName.set(info.Name, info);
			_containerById.set(info.Id, info);

			_removeContainer(info)
				.then(i => {
					expect(i).to.equal(_infos[0]);
					let x = _containerByName.get(i.Name);
					let y = _containerById.get(i.Id);
					expect(x).to.equal(undefined);
					expect(y).to.equal(undefined);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when container not in the collection", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			let info = _infos[0];
			let _removeContainer = monitor.__get__("removeContainer");
			expect(info).to.not.equal(null);
			_removeContainer(info)
				.then(i => {
					return done("Should not be here");
				})
				.catch(err => {
					expect(err.message).to.equal("no container to remove");
					done();
				});
		});
	});
});
