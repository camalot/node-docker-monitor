"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const assert = chai.assert;
chai.should();
const rewire = require("rewire");

const _tracked = [
	"create",
	"restart",
	"start",
	"destroy",
	"die",
	"kill",
	"stop"
];

const _positive = ["create", "restart", "start"];

const _false = ["0", "null", "false", "disable", "disabled", "", null, undefined];

describe("monitor->trackedEvents", done => {
	describe("when loaded", done => {
		it("must include the list of values", done => {
			let monitor = rewire("../lib/index.js");
			let _trackedEvents = monitor.__get__("trackedEvents");

			for (let i = 0; i < _tracked.length; ++i) {
				expect(_trackedEvents).to.contain(_tracked[i]);
			}
			expect(_tracked.length).to.equal(_trackedEvents.length);
			expect(_trackedEvents).to.not.equal(null);
			expect(_trackedEvents).to.not.equal(undefined);
			done();
		});
	});
});


describe("monitor->falseStrings", done => {
	describe("when loaded", done => {
		it("must include the list of values", done => {
			let monitor = rewire("../lib/index.js");
			let _falseStrings = monitor.__get__("falseStrings");

			for (let i = 0; i < _false.length; ++i) {
				expect(_falseStrings).to.contain(_false[i]);
			}
			expect(_false.length).to.equal(_falseStrings.length);
			expect(_falseStrings).to.not.equal(null);
			expect(_falseStrings).to.not.equal(undefined);
			done();
		});
	});
});

describe("monitor->positiveEvents", done => {
	describe("when loaded", done => {
		it("must include the list of events", done => {
			let monitor = rewire("../lib/index.js");
			let _positiveEvents = monitor.__get__("positiveEvents");

			for (let i = 0; i < _positive.length; ++i) {
				expect(_positiveEvents).to.contain(_positive[i]);
			}
			expect(_positive.length).to.equal(_positiveEvents.length);
			expect(_positiveEvents).to.not.equal(null);
			expect(_positiveEvents).to.not.equal(undefined);
			done();
		});
	});
});
