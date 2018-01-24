"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
chai.should();
const rewire = require("rewire");

describe("monitor->_stop", done => {
	describe("when dataStream is not set", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			let _stop = monitor.__get__("_stop");
			_stop()
				.then(m => {
					return done(new Error("should reject call"));
				})
				.catch(err => {
					expect(err).to.not.equal(null);
					expect(err).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.equal("monitor not running.");
					return done();
				});
		});
	});

	describe("when dataStream.destroy is null", done => {
		it("must reject the call", done => {
			let monitor = rewire("../lib/index.js");
			monitor.dataStream = {};
			let _stop = monitor.__get__("_stop");
			_stop()
				.then(m => {
					return done(new Error("should reject call"));
				})
				.catch(err => {
					expect(err).to.not.equal(null);
					expect(err).to.not.equal(undefined);
					expect(err.message).to.not.equal(null);
					expect(err.message).to.not.equal(undefined);
					expect(err.message).to.equal("monitor not running.");
					return done();
				});
		});
	});

	describe("when dataStream and dataStream.destroy is passes", done => {
		it("must run and resolve monitor", done => {
			let monitor = rewire("../lib/index.js");
			let _destroy = 0;
			monitor.dataStream = {
				on: (e,c) => {
					c();
				},
				destroy:() => {
					_destroy++;
				}
			};
			let _stop = monitor.__get__("_stop");
			_stop()
				.then(m => {
					expect(monitor.started).to.equal(false);
					expect(monitor.dataStream).to.equal(null);
					expect(m).to.not.equal(null);
					expect(m).to.not.equal(undefined);
					expect(_destroy).to.equal(1);
					return done();
				})
				.catch(err => {
					return done(new Error(`Should resolve: ${err}`));
				});
		});
	});
});
