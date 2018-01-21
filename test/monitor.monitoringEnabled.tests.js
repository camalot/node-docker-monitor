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
		Labels: null,
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

describe("monitor->monitoringEnabled", done => {
	describe("when monitoringAll is true and doesn't have Labels", done => {
		it("must return true", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", true);
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"]
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(true);
			done();
		});
	});

	describe("when monitoringAll is true and has the monitor selectorLabel, but not set to 'false'", done => {
		it("must return true", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", true);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: {
					foo: "bar"
				}
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(true);
			done();
		});
	});

	describe("when monitoringAll is true and selectorLabel is set to 'false'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", true);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "false" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is true and selectorLabel is set to 'disable'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", true);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "disable" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is true and selectorLabel is set to 'disabled'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "disabled" }
			};

			monitor.__set__("monitorAll", true);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is true and selectorLabel is set to 'null'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", true);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "null" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is true and selectorLabel is set to '0'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", true);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "0" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is true and selectorLabel is set to ''", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", true);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	/***************************************************************************/

	describe("when monitoringAll is false and doesn't have Labels", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"]
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is false and monitor selectorLabel doesn't exist", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "baz" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "bar" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is false and selectorLabel is not set to 'false'", done => {
		it("must return true", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "bar" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(true);
			done();
		});
	});

	describe("when monitoringAll is false and selectorLabel is set to 'false'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "false" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is false and selectorLabel is set to 'disable'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "disable" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is false and selectorLabel is set to 'disabled'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "disabled" }
			};

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is false and selectorLabel is set to 'null'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "null" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is false and selectorLabel is set to '0'", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "0" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});

	describe("when monitoringAll is false and selectorLabel is set to ''", done => {
		it("must return false", done => {
			let monitor = rewire("../lib/index.js");

			monitor.__set__("monitorAll", false);
			monitor.__set__("opts", { selectorLabel: "foo" });
			let info = {
				Id: "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
				Image: "m4all-next:15-0511-1104",
				Names: ["/m4all-next"],
				Labels: { foo: "" }
			};
			let _monitoringEnabled = monitor.__get__("monitoringEnabled");

			let result = _monitoringEnabled(info);
			expect(result).to.equal(false);
			done();
		});
	});
});
