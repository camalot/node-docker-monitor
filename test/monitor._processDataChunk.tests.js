"use strict";
const chai = require("chai");
const expect = chai.expect;
const assert = chai.assert;
const rewire = require("rewire");

const chunk_data =
	'{"status":"die","id":"81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2","from":"m4all-next:15-0511-1104","time":1431403163}\n\n\n' +
	'{"status":"start","id":"81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2","from":"m4all-next:15-0511-1104","time":1431403163}';
let _updateCompleteCalls = 0;
let _errorCalls = 0;
const _handler = {
	onUpdateComplete: (containers, docker) => {
		_updateCompleteCalls++;
	},
	onError: (err, docker) => {
		_errorCalls++;
	}
};

describe("monitor->_processDataChunk", done => {
	describe("when processDockerEvent is successful", done => {
		it("must process all lines", done => {
			let monitor = rewire("../lib/index.js");
			let lines_processed = 0;
			let _processDataChunk = monitor.__get__("_processDataChunk");
			monitor.__set__("processDockerEvent", data => {
				return new Promise((resolve, reject) => {
					lines_processed++;
					return resolve();
				});
			});

			_processDataChunk(chunk_data)
				.then(m => {
					expect(m).to.not.equal(null);
					expect(m).to.not.equal(undefined);
					expect(lines_processed).to.equal(2);
					done();
				})
				.catch(done);
		});
	});

	describe("when processDockerEvent fails", done => {
		it("must reject with the error", done => {
			let monitor = rewire("../lib/index.js");
			let lines_processed = 0;
			let _processDataChunk = monitor.__get__("_processDataChunk");
			monitor.__set__("handler", _handler);
			monitor.__set__("processDockerEvent", data => {
				return new Promise((resolve, reject) => {
					lines_processed++;
					return reject("failed");
				});
			});

			_processDataChunk(chunk_data)
				.then(m => {
					done("should not be here");
				})
				.catch(err => {
					expect(lines_processed).to.equal(2);
					expect(_errorCalls).to.equal(3);
					expect(err).to.equal("failed");
					done();
				});
		});
	});

	describe("when processDockerEvent is successful", done => {
		it("must process all lines and trigger updateComplete handler", done => {
			let monitor = rewire("../lib/index.js");
			let lines_processed = 0;
			let _processDataChunk = monitor.__get__("_processDataChunk");
			monitor.__set__("handler", _handler);
			monitor.__set__("processDockerEvent", data => {
				return new Promise((resolve, reject) => {
					lines_processed++;
					return resolve();
				});
			});
			_errorCalls = 0;
			_updateCompleteCalls = 0;
			_processDataChunk(chunk_data)
				.then(m => {
					expect(m).to.not.equal(null);
					expect(m).to.not.equal(undefined);
					expect(lines_processed).to.equal(2);
					expect(_updateCompleteCalls).to.equal(1);
					expect(_errorCalls).to.equal(0);
					done();
				})
				.catch(done);
		});
	});
});
