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
		Status: "Up About an hour",
		Name: "m4all-next"
	}
];

describe("monitor->_processContainersList ", done => {
	describe("when getContainerName fails", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__('getContainerName', (n) => {
				return new Promise((resolve, reject) => {
					return reject(new Error('failed'));
				});
			});

			let _processContainersList = monitor.__get__("_processContainersList");
			_processContainersList(_infos).then(c => {
				done(new Error("should reject"));
			}).catch(err => {
				expect(err).to.not.equal(null);
				expect(err).to.not.equal(undefined);
				expect(err.message).to.not.equal(undefined);
				expect(err.message).to.not.equal(null);
				expect(err.message).to.equal('failed');
				done();
			});
		});
	});

	describe("when getContainerName is success but updateContainer fails", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__('getContainerName', (n) => {
				return new Promise((resolve, reject) => {
					return resolve(_infos[0].Names);
				});
			});
			monitor.__set__("updateContainer", (n) => {
				return new Promise((resolve, reject) => {
					return reject(new Error('failed'));
				});
			});
			let _processContainersList = monitor.__get__("_processContainersList");
			_processContainersList(_infos).then(c => {
				done(new Error("should reject"));
			}).catch(err => {
				expect(err).to.not.equal(null);
				expect(err).to.not.equal(undefined);
				expect(err.message).to.not.equal(undefined);
				expect(err.message).to.not.equal(null);
				expect(err.message).to.equal('failed');
				done();
			});
		});
	});

	describe("when getContainerName and updateContainer are successful", done => {
		it("must resolve with containByName map", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("getContainerName", n => {
				return new Promise((resolve, reject) => {
					return resolve(_infos[0].Names);
				});
			});
			monitor.__set__("updateContainer", n => {
				return new Promise((resolve, reject) => {
					let i = _infos[0];
					let cbn = monitor.__get__("containerByName");
					cbn.set(i.Name, i);
					return resolve(cbn);
				});
			});
			let _processContainersList = monitor.__get__("_processContainersList");
			_processContainersList(_infos)
				.then(c => {
					expect(c).to.not.equal(null);
					expect(c).to.not.equal(undefined);
					let item = c.get(_infos[0].Name);
					expect(item).to.not.equal(null);
					expect(item).to.not.equal(undefined);
					expect(item.Name).to.not.equal(null);
					expect(item.Name).to.not.equal(undefined);
					expect(item.Name).to.equal(_infos[0].Name);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});
});
