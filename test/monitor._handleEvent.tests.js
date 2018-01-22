"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;
const assert = chai.assert;
chai.should();
const rewire = require("rewire");

const _handler = {
	onTest: (arg1, arg2, arg3) => {
		expect(arg2).to.equal("abc");
		expect(arg3).to.not.equal(undefined);
		expect(typeof(arg3)).to.equal(typeof(function() {}));
		arg3();
	}
};

describe("monitor->_handleEvent", (done) => {
	describe("when it has the event", (done) => {
		it("must invoke the event callback", (done) => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("handler", _handler);
			let _handleEvent = monitor.__get__("_handleEvent");
			expect(_handleEvent("Test", "123", "abc", done)).to.equal(true);
		});
	});

	describe("when it doesn't have the event", done => {
		it("must not invoke the event callback", done => {
			let monitor = rewire("../lib/index.js");
			monitor.__set__("handler", _handler);
			let _handleEvent = monitor.__get__("_handleEvent");
			expect(_handleEvent("Test2", "456", "def", done)).to.equal(false);
			done();
		});
	});
});
