"use strict";
const chai = require("chai");
const expect = chai.expect;
const assert = chai.assert;
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

describe("monitor->addContainer", done => {
	describe("when monitoring is enabled", done => {
		it("must add the container info to the maps", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitoringEnabled", i => {
				return true;
			});
			let info = _infos[0];
			let _addContainer = monitor.__get__("addContainer");
			let _containerByName = monitor.__get__("containerByName");
			let _containerById = monitor.__get__("containerById");
			expect(info).to.not.equal(null);
			_addContainer(info)
				.then(i => {
					expect(i).to.equal(_infos[0]);
					let x = _containerByName.get(i.Name);
					let y = _containerById.get(i.Id);
					expect(x).to.equal(i);
					expect(y).to.equal(i);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("monitoring is not enabled", done => {
		it("must just return the object", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("monitoringEnabled", i => {
				return false;
			});
			let info = _infos[0];
			let _addContainer = monitor.__get__("addContainer");
			let _containerByName = monitor.__get__("containerByName");
			let _containerById = monitor.__get__("containerById");
			expect(info).to.not.equal(null);
			_addContainer(info)
				.then(i => {
					expect(i).to.equal(_infos[0]);
					let x = _containerByName.get(i.Name);
					let y = _containerById.get(i.Id);
					expect(x).to.equal(undefined);
					expect(y).to.equal(undefined);
					return done();
				})
				.catch(err => {
					done(err);
				});
		});
	});
});
