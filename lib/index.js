"use strict";

// const Map = require("collections/fast-map");
const Docker = require("dockerode");
const async = require("async");
const merge = require("merge");
// require("collections/shim-object");

/**

 docker listContainers result example:

 [{
   "Id": "81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2",
   "Image": "m4all-next:15-0511-1104",
   "Names": ["/m4all-next"],
   "Command": "/bin/sh -c '/bin/bash -c 'cd /home; mkdir data; node main/app.js''",
   "Created": 1431402173,
   "HostConfig": { NetworkMode: 'default' },
   "Labels": { my_label: 'label_value' },
   "Ports": [
     {
       "IP": "172.17.42.1",
       "PrivatePort": 3000,
       "PublicPort": 3002,
       "Type": "tcp"
     }
   ],
   "Status": "Up About an hour"
 }, ... ]


 docker events example:

 {"status":"die","id":"81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2","from":"m4all-next:15-0511-1104","time":1431403163}
 {"status":"start","id":"81cde361ec7b069cc1ee32a4660176306a2b1d3a3eb52f96f17380f10e75d2e2","from":"m4all-next:15-0511-1104","time":1431403163}
 ...

 */
const trackedEvents = [
	"create",
	"restart",
	"start",
	"destroy",
	"die",
	"kill",
	"stop"
];
const falseStrings = [
	"0",
	"null",
	"false",
	"disable",
	"disabled",
	"",
	null,
	undefined
];
const positiveEvents = ["create", "restart", "start"];
let containerByName = new Map();
let containerById = new Map();
let handler = new Map();
let monitorAll = true;
let defaultDockerOpts = {
	socketPath: "/var/run/docker.sock"
};
let dockerOpts = null;
let opts = {
	strategy: "monitorAll",
	selectorLabel: null
};

let getContainerName = names => {
	return new Promise((resolve, reject) => {
		for (let i = 0; i < names.length; i++) {
			let nameElements = names[i].split("/");
			if (nameElements.length >= 2) {
				return resolve(nameElements[1]);
			}
		}
		return resolve(names.join("_"));
	});
};

let updateContainer = info => {
	return new Promise((resolve, reject) => {
		let oldInfo = containerByName.get(info.Name);

		let changed;
		if (oldInfo) {
			// existing service
			if (oldInfo.Id !== info.Id) {
				// existing service, new container
				changed = true;
				return removeContainer(oldInfo)
					.then(i =>
						addContainer(i)
							.then(resolve)
							.catch(reject)
					)
					.catch(reject);
			}
		} else {
			// new service
			changed = true;
		}

		if (changed) {
			return addContainer(info)
				.then(resolve)
				.catch(reject);
		}
		return resolve(info);
	});
};

let addContainer = info => {
	return new Promise((resolve, reject) => {
		if (monitoringEnabled(info)) {
			containerByName.set(info.Name, info);
			containerById.set(info.Id, info);
			_handleEvent("ContainerUp", info, monitor.docker);
			return resolve(info);
		} else {
			return resolve(info);
		}
	});
};

let removeContainer = info => {
	return new Promise((resolve, reject) => {
		let oldInfo = containerByName.get(info.Name);
		if (oldInfo) {
			containerById.delete(oldInfo.Id);
			containerByName.delete(oldInfo.Name);
			_handleEvent("ContainerDown", oldInfo, monitor.docker);
			return resolve(info);
		} else {
			return reject(new Error("no container to remove"));
		}
	});
};

let monitoringEnabled = info => {
	if (monitorAll) {
		// monitor all containers that don't have [selectorLabel]=false
		return !!(
			!info.Labels ||
			info.Labels[opts.selectorLabel] === undefined ||
			falseStrings.indexOf(
				info.Labels[opts.selectorLabel].toLocaleLowerCase()
			) === -1
		);
	} else {
		// monitor only containers that have [selectorLabel]=true
		return !!(
			info.Labels &&
			info.Labels[opts.selectorLabel] !== undefined &&
			falseStrings.indexOf(
				info.Labels[opts.selectorLabel].toLocaleLowerCase()
			) === -1
		);
	}
};

let _processContainersList = list => {
	return new Promise((resolve, reject) => {
		async.each(
			list,
			(item, done) => {
				//let info = Object.clone(item);
				return getContainerName(item.Names)
					.then(name => {
						item.Name = name;
						return updateContainer(item)
							.then(() => {
								done();
							})
							.catch(err => {
								done(err);
							});
					})
					.catch(reject);
			},
			err => {
				if (err) {
					_handleEvent("Error", err, monitor.docker);
					return reject(err);
				}
				return resolve(containerByName);
			}
		);
	});
};
// initially populate container map
let updateContainers = next => {
	return new Promise((resolve, reject) => {
		monitor.docker.listContainers((err, list) => {
			if (err) {
				_handleEvent("Error", err, monitor.docker);
				next(err);
				return reject(err);
			}

			if (!monitor.started) {
				_handleEvent("MonitorStarted", monitor, monitor.docker);
				monitor.started = true;
			}

			_processContainersList(list).then((c) => {
				next();
				console.log(c);
				resolve(c);
			}).catch(reject);
		});
	});
};

let _processDockerEventExistingContainer = (event, container) => {
	return new Promise((resolve, reject) => {
		if (positiveEvents.indexOf(event.status) !== -1) {
			return updateContainer(container)
				.then(resolve)
				.catch(err => {
					_handleEvent("Error", err, monitor.docker);
					return reject(err);
				});
		} else {
			return removeContainer(container)
				.then(resolve)
				.catch(err => {
					_handleEvent("Error", err, monitor.docker);
					return reject(err);
				});
		}
	});
};

let _processDockerEventNewContainer = (event, stop) => {
	return new Promise((resolve, reject) => {
		// new container
		if (!stop && positiveEvents.indexOf(event.status) !== -1) {
			return updateContainers(err => {
				if (!err) {
					return processDockerEvent(event, true)
						.then(resolve)
						.catch(err => {
							_handleEvent("Error", err, monitor.docker);
							return reject(err);
						});
				}

				_handleEvent("Error", err, monitor.docker);
				return reject(err);
			})
				.then(resolve)
				.catch(reject);
		} else {
			return resolve(new Map());
		}
	});
};

// start monitoring docker events
let processDockerEvent = (event, stop) => {
	return new Promise((resolve, reject) => {
		if (trackedEvents.indexOf(event.status) !== -1) {
			let container = containerById.get(event.id);
			if (container) {
				return _processDockerEventExistingContainer(event, container)
					.then(resolve)
					.catch(reject);
			} else {
				return _processDockerEventNewContainer(event, stop)
					.then(resolve)
					.catch(reject);
			}
		} else {
			return reject(new Error(`Untracked event (${event.status})`));
		}
	});
};

let _handleEvent = function(event) {
	if (handler[`on${event}`]) {
		let args = Array.prototype.slice.call(arguments, 1);
		handler[`on${event}`].apply(null, args);
		return true;
	}
	return false;
};

let _processDataChunk = chunk => {
	return new Promise((resolve, reject) => {
		let lines = chunk
			.toString()
			.replace(/\n+$/, "")
			.split("\n");
		async.each(
			lines,
			(line, done) => {
				if (line) {
					return processDockerEvent(JSON.parse(line))
						.then(() => {
							done();
						})
						.catch(err => {
							_handleEvent("Error", err, monitor.docker);
							done(err);
						});
				} else {
					done();
				}
			},
			err => {
				if (err) {
					_handleEvent("Error", err, monitor.docker);
					return reject(err);
				}
				_handleEvent("UpdateComplete", containerByName, monitor.docker);
				return resolve(containerByName);
			}
		);
	});
};

let _start = () => {
	return new Promise((resolve, reject) => {
		return updateContainers(err => {
			if (!err) {
				monitor.docker.getEvents((err, data) => {
					if (err) {
						_handleEvent("Error", err, monitor.docker);
						return reject(err);
					}

					// events: create, destroy, die, exec_create, exec_start, export, kill, oom, pause, restart, start, stop, unpause
					// positive: create, restart, start
					// negative: destroy, die, kill, stop
					monitor.dataStream = data;
					data.on("data", chunk => {
						return _processDataChunk(chunk)
							.catch(err => {
								_handleEvent("Error", err, monitor.docker);
							});

					});
				});
			} else {
				_handleEvent("Error", err, monitor.docker);
				return reject(err);
			}
		})
			.then(d => {
				console.log(containerByName);
				_handleEvent("UpdateComplete", containerByName, monitor.docker);
				return resolve(containerByName);
			})
			.catch(err => {
				_handleEvent("Error", err, monitor.docker);
				return reject(err);
			});
	});
};

let _stop = () => {
	return new Promise((resolve, reject) => {
		if (monitor.dataStream && monitor.dataStream.destroy) {
			monitor.dataStream.on("end", () => {
				monitor.started = false;
				_handleEvent("MonitorStopped", monitor, monitor.docker);
			});
			monitor.dataStream.destroy();
			monitor.dataStream = null;
			return resolve(monitor);
		}
		let err = new Error("monitor not running.");
		_handleEvent("Error", err, monitor.docker);
		return reject(err);
	});
};

let _init = (eventHandler, dockerOptions, options) => {
	handler = merge(handler, eventHandler);
	dockerOpts = dockerOptions;
	opts = merge(opts, options);
	return new Promise((resolve, reject) => {
		if (dockerOpts) {
			if (dockerOpts.listContainers) {
				monitor.docker = dockerOpts;
			} else {
				monitor.docker = new Docker(dockerOpts);
			}
		} else {
			monitor.docker = new Docker(defaultDockerOpts);
		}

		monitorAll = !opts || opts.strategy !== "monitorSelected";
		opts.selectorLabel = (opts && opts.selectorLabel) || "node-docker-monitor";

		return resolve(monitor);
	});
};

let monitor = {
	dataStream: null,
	docker: null,
	started: false,
	stop: _stop,
	start: _start,
	init: _init
};

module.exports = monitor;

// monitor({
//   onMonitorStopped: (monitor) => {
//     return new Promise( (resolve, reject) => {
//       return resolve(monitor);
//     }
//   },
//
//   onMonitorStarted: (monitor) => {
//     return new Promise( (resolve, reject) => {
//       return resolve(monitor);
//     }
//   },
//
//   onContainerUp: (container) => {
//     return new Promise( (resolve, reject) => {
//       console.log('Container up: ', container)
//       resolve(container);
//     });
//   },
//
//   onContainerDown: function (container) {
//     return new Promise( (resolve, reject) => {
//       console.log('Container down: ', container)
//       resolve(container);
//     });
//   }
// });
