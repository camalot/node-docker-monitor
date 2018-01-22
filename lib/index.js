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
const falseStrings = ["0", "null", "false", "disable", "disabled", "", null, undefined];
const positiveEvents = ["create", "restart", "start"];
let containerByName = new Map();
let containerById = new Map();
let handler = new Map();
let monitorAll = true;
let dockerOpts = {
	socketPath: "/var/run/docker.sock"
};
let opts = {
	strategy: "monitorAll",
	selectorLabel: "node-docker-monitor"
};

let getContainerName = names => {
	return new Promise((resolve, reject) => {
		for (let i = 0; i < names.length; i++) {
			let nameElements = names[i].split("/");
			if (nameElements.length >= 2) {
				console.log("getContainerName: %s", nameElements[1]);
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
			console.log("trigger: onContainerDown(%s)", oldInfo.Name);
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

// initially populate container map
let updateContainers = next => {
	return new Promise((resolve, reject) => {
		monitor.docker.listContainers((err, list) => {
			if (err) {
				console.log("Error listing running containers: %s", err.message, err);
				_handleEvent("Error", err, monitor.docker);
				return next(err);
			}

			if (!monitor.started) {
				_handleEvent("MonitorStarted", monitor, monitor.docker);
				monitor.started = true;
			}

			async.each(
				list,
				(item, done) => {
					//let info = Object.clone(item);
					return getContainerName(item.Names)
						.then(name => {
							console.log("process item: %s", name);
							item.Name = name;
							console.log("updateContainers->updateContainer");
							return updateContainer(item)
								.then(() => {
									console.log("after update container");
									done();
								})
								.catch(err => {
									console.log("error after update container");
									console.error(err);
									done(err);
								});
						})
						.catch(reject);
				},
				err => {
					if (err) {
						console.log(err);
						_handleEvent("Error", err, monitor.docker);
						console.error(err);
						return reject(err);
					}
					console.log("updateContainers: resolve");
					return resolve(containerByName);
				}
			);
			console.log("call next");
			return next();
		});
	});
};

let _processDockerEventExistingContainer = (event, container) => {
	return new Promise((resolve, reject) => {
		if (positiveEvents.indexOf(event.status) !== -1) {
			console.log("processDockerEvent -> updateContainer");
			return updateContainer(container)
				.then(resolve)
				.catch(err => {
					_handleEvent("Error", err, monitor.docker);
					console.error(err);
					return reject(err);
				});
		} else {
			console.log("processDockerEvent -> removeContainer");
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
					console.log(
						"processDockerEvent: updateContainers -> processDockerEvent(event, true)"
					);
					return processDockerEvent(event, true)
					.then(resolve)
					.catch(err => {
						console.log("no error, resolve");
						_handleEvent("Error", err, monitor.docker);
						console.error(err);
						return reject(err);
					});
				}

				_handleEvent("Error", err, monitor.docker);
				console.error(err);
				return reject(err);
			})
				.then(resolve)
				.catch(reject);
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
		console.log("trigger on%s", event);
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
					console.log("processDockerEvent: line");
					return processDockerEvent(JSON.parse(line))
						.then(() => {
							console.log("after update container");
							done();
						})
						.catch(err => {
							console.log("error after update container");
							if (handler.onError) {
								handler.onError(err, monitor.docker);
							}
							console.error(err);
							done(err);
						});
				} else {
					console.log("skip line. it's empty");
					done();
				}
			},
			err => {
				console.log("updateContainers: finish");
				if (err) {
					console.log("error: %s", err);
					if (handler.onError) {
						handler.onError(err, monitor.docker);
					}
					console.error(err);
					return reject(err);
				}
				console.log("done with onUpdateComplete");
				if (handler.onUpdateComplete) {
					console.log("trigger onUpdateComplete");
					handler.onUpdateComplete(containerByName, monitor.docker);
				} else {
					console.log("onUpdateComplete does not exist");
				}
				return resolve(containerByName);
			}
		);
	});
};

let _start = () => {
	return new Promise((resolve, reject) => {
		return updateContainers(err => {
			console.log("Begin update containers");
			if (!err) {
				monitor.docker.getEvents((err, data) => {
					if (err) {
						console.log("Error getting docker events: %s", err.message, err);
						if (handler.onError) {
							handler.onError(err, monitor.docker);
						}
						console.error(err);
						return reject(err);
					}

					// events: create, destroy, die, exec_create, exec_start, export, kill, oom, pause, restart, start, stop, unpause
					// positive: create, restart, start
					// negative: destroy, die, kill, stop
					monitor.dataStream = data;
					data.on("data", _processDataChunk);
				});
			} else {
				if (handler.onError) {
					handler.onError(err, monitor.docker);
				}
				console.error(err);
				return reject(err);
			}
		});
	})
		.then(d => {
			console.log("done with onUpdateComplete");
			if (handler.onUpdateComplete) {
				console.log("trigger onUpdateComplete");
				handler.onUpdateComplete(containerByName, monitor.docker);
			} else {
				console.log("onUpdateComplete does not exist");
			}
			return resolve(containerByName);
		})
		.catch(err => {
			if (handler.onError) {
				handler.onError(err, monitor.docker);
			}
			console.error(err);
			return reject(err);
		});
};

let _stop = () => {
	return new Promise((resolve, reject) => {
		if (monitor.dataStream && monitor.dataStream.destroy) {
			monitor.dataStream.on("end", () => {
				monitor.started = false;
				if (handler.onMonitorStopped) {
					handler.onMonitorStopped(monitor, monitor.docker);
				}
			});
			monitor.dataStream.destroy();
			monitor.dataStream = null;
			return resolve(monitor);
		}
		if (handler.onError) {
			handler.onError(new Error("monitor not running."), monitor.docker);
		}
		return reject("monitor not running.");
	});
};

let _init = (eventHandler, dockerOptions, options) => {
	handler = merge(handler, eventHandler);
	dockerOpts = dockerOptions || dockerOpts;
	opts = merge(opts, options);
	console.log(handler.onContainerUp);
	console.log(handler.onContainerDown);
	console.log(handler.onError);
	console.log(handler.onUpdateComplete);
	console.log(handler.onMonitorStarted);
	console.log(handler.onMonitorStopped);

	return new Promise((resolve, reject) => {
		if (dockerOpts) {
			if (dockerOpts.listContainers) {
				monitor.docker = dockerOpts;
			} else {
				monitor.docker = new Docker(dockerOpts);
			}
		} else {
			monitor.docker = new Docker({ socketPath: "/var/run/docker.sock" });
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
