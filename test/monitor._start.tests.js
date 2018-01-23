"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const assert = chai.assert;
chai.should();
const rewire = require("rewire");

const chunk_data =
	'{"status":"die","id":"81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2","from":"m4all-next:15-0511-1104","time":1431403163}\n\n\n' +
	'{"status":"start","id":"81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2","from":"m4all-next:15-0511-1104","time":1431403163}';

describe("monitor->start", done => {
	describe("when updateContainers returns success, and getEvents returns success", done => {
		it("must include the list of values", done => {
			let monitor = rewire("../lib/index.js");

			let _containerByName = monitor.__get__("containerByName");
			let _processDataChunk = chunk => {
				return new Promise((resolve, reject) => {
					resolve(_containerByName);
				});
			};
			monitor.docker = {
				getEvents: callback => {
					let data = {
						on: (e, c) => {
							c();
						}
					};
					callback(null, data);
				}
			};
			monitor.__set__("_processDataChunk", _processDataChunk);
			let _start = monitor.__get__("_start");
			monitor.__set__("updateContainers", next => {
				return new Promise((resolve, reject) => {
					next(null);
					return resolve();
				});
			});
			_start()
				.then(d => {
					expect(d).to.equal(_containerByName);
					done();
				})
				.catch(err => {
					return done(err);
				});
		});
	});

	describe("when updateContainers returns success, and getEvents returns success, but processDataChunk fails", done => {
		it("must handle, but still resolve", done => {
			let monitor = rewire("../lib/index.js");
			let _processDataChunk = chunk => {
				return new Promise((resolve, reject) => {
					return reject(new Error('failure'));
				});
			};
			monitor.docker = {
				getEvents: callback => {
					let data = {
						on: (e, c) => {
							c();
						}
					};
					callback(null, data);
				}
			};
			monitor.__set__("_processDataChunk", _processDataChunk);
			let _start = monitor.__get__("_start");
			monitor.__set__("updateContainers", next => {
				return new Promise((resolve, reject) => {
					next(null);
					return resolve();
				});
			});
			_start()
				.then(d => {
					expect(d).to.not.equal(null);
					done();
				})
				.catch(err => {
					done(err);
				});
		});
	});

	describe("when updateContainers returns success, and getEvents returns failure", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			let _containerByName = monitor.__get__("containerByName");
			let _processDataChunk = chunk => {
				return new Promise((resolve, reject) => {
					resolve(_containerByName);
				});
			};
			monitor.docker = {
				getEvents: callback => {
					callback(new Error("failure"), null);
				}
			};
			monitor.__set__("_processDataChunk", _processDataChunk);
			monitor.__set__("updateContainers", next => {
				return new Promise((resolve, reject) => {
					next(null);
					resolve();
				});
			});

			let _start = monitor.__get__("_start");

			_start()
				.then(d => {
					return done(new Error("should reject"));
				})
				.catch(err => {
					expect(err).to.not.be.equal(undefined);
					expect(err).to.not.be.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.equal("failure");

					return done();
				});
		});
	});

	describe("when updateContainers returns failure", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");

			monitor.docker = {
				getEvents: callback => {
					callback(new Error("should not execute"), null);
				}
			};
			monitor.__set__("_processDataChunk", () => {
				return new Error("should not execute");
			});
			monitor.__set__("updateContainers", next => {
				return new Promise((resolve, reject) => {
					next(new Error("failure"));
					reject(new Error("failure2"));
				});
			});

			let _start = monitor.__get__("_start");

			_start()
				.then(d => {
					return done(new Error("should reject"));
				})
				.catch(err => {
					expect(err).to.not.be.equal(undefined);
					expect(err).to.not.be.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.equal("failure");

					return done();
				});
		});
	});
});
