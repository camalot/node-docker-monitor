'use strict';
const chai = require("chai");
const expect = chai.expect;
const assert = chai.assert;
const rewire = require("rewire");

describe("monitor->getContainerName", (done) => {
	describe("when it has a name split by a slash", (done) => {
		it("must return the second part of the name", (done) => {
			let monitor = rewire("../lib/index.js");
			let getContainerName = monitor.__get__("getContainerName");
			getContainerName(["foo/bar"]).then( (result) => {
				expect(result).to.equal("bar");
			}).catch ( (err) => {
				return done(err);
			});

			getContainerName(["foo/biz/baz"])
				.then(result => {
					expect(result).to.equal("biz");
				})
				.catch(err => {
					return done(err);
				});
				return done();
		});
	});

	describe("when it has a name with no slash", done => {
		it("must return the entire name", done => {
			let monitor = rewire("../lib/index.js");
			let getContainerName = monitor.__get__("getContainerName");
			getContainerName(["foo_bar"])
				.then(result => {
					expect(result).to.equal("foo_bar");
				})
				.catch(err => {
					console.log(err);
					return done(err);
				});

			getContainerName(["foo:bar\\baz"])
				.then(result => {
					expect(result).to.equal("foo:bar\\baz");
				})
				.catch(err => {
					console.log(err);
					return done(err);
				});
				return done();
		});
	});

	describe("when it has multiple items, with no slash in any of them", done => {
		it("must return a combined name", done => {
			let monitor = rewire("../lib/index.js");
			let getContainerName = monitor.__get__("getContainerName");
			getContainerName(["foo","bar"])
				.then(result => {
					expect(result).to.equal("foo_bar");
				})
				.catch(err => {
					console.log(err);
					return done(err);
				});
			return done();
		});
	});
});
