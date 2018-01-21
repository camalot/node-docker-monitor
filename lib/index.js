import { race } from "./C:/Users/rconr/AppData/Local/Microsoft/TypeScript/2.6/node_modules/@types/async";

"use strict";

// const Map = require("collections/fast-map");
const Docker = require("dockerode");
const async = require("async");
require("collections/shim-object");

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

module.exports = (handler, dockerOpts, opts) => {
	let monitor = {
		dataStream: null,
		docker: null,
		started: false,
		stop: null
	};

	if (dockerOpts) {
		if (dockerOpts.listContainers) {
			monitor.docker = dockerOpts;
		} else {
			monitor.docker = new Docker(dockerOpts);
		}
	} else {
		monitor.docker = new Docker({ socketPath: "/var/run/docker.sock" });
	}

	let monitorAll = !opts || opts.strategy !== "monitorSelected";
	let selectorLabel = (opts && opts.selectorLabel) || "node-docker-monitor";

	let trackedEvents = [
		"create",
		"restart",
		"start",
		"destroy",
		"die",
		"kill",
		"stop"
	];
	let falseStrings = ["0", "null", "false", "disable", "disabled", ""];
	let positiveEvents = ["create", "restart", "start"];
	let containerByName = new Map();
	let containerById = new Map();

	let getContainerName = names => {
		return new Promise((resolve, reject) => {
			for (let i = 0; i < names.length; i++) {
				let nameElements = names[i].split("/");
				if (nameElements.length === 2) {
					console.log("getContainerName: %s", nameElements[1]);
					return resolve(nameElements[1]);
				}
			}
			return reject();
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
					return removeContainer(oldInfo);
				}
			} else {
				// new service
				changed = true;
			}

			if (changed) {
				return addContainer(info);
			}
			return reject();
		});
	};

	let addContainer = info => {
		return new Promise((resolve, reject) => {
			if (monitoringEnabled(info)) {
				containerByName.set(info.Name, info);
				containerById.set(info.Id, info);
				console.log("trigger: onContainerUp(%s)", info.Name);
				return handler
					.onContainerUp(info, monitor.docker)
					.then(resolve)
					.catch(reject);
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
				handler.onContainerDown(oldInfo, monitor.docker);
			}
		});
	};

	let monitoringEnabled = info => {
		if (monitorAll) {
			// monitor all containers that don't have [selectorLabel]=false
			return (
				!info.Labels ||
				info.Labels[selectorLabel] === undefined ||
				falseStrings.indexOf(info.Labels[selectorLabel].toLocaleLowerCase()) ===
					-1
			);
		} else {
			// monitor only containers that have [selectorLabel]=true
			return (
				info.Labels &&
				info.Labels[selectorLabel] !== undefined &&
				falseStrings.indexOf(info.Labels[selectorLabel].toLocaleLowerCase()) ===
					-1
			);
		}
	};

	// initially populate container map
	let updateContainers = next => {
		return new Promise((resolve, reject) => {
			monitor.docker.listContainers((err, list) => {
				if (err) {
					console.log("Error listing running containers: %s", err.message, err);
					return next(err);
				}

				if (!monitor.started) {
					if (handler.onMonitorStarted) {
						console.log("trugger: onMonitorStarted")
						handler.onMonitorStarted(monitor, monitor.docker);
					}
					monitor.started = true;
				}

				async.each(
					list,
					(item, done) => {
						//let info = Object.clone(item);
						return getContainerName(item.Names)
							.then(name => {
								console.log("process item: %s", name)

								item.Name = name;
								console.log("updateContainers->updateContainer");
								return updateContainer(item)
									.then(done)
									.catch(done);
							})
							.catch(reject);
					},
					err => {
						if (err) {
							console.log(err);
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

	// start monitoring docker events
	let processDockerEvent = (event, stop) => {
		return new Promise((resolve, reject) => {
			if (trackedEvents.indexOf(event.status) !== -1) {
				let container = containerById.get(event.id);
				if (container) {
					if (positiveEvents.indexOf(event.status) !== -1) {
						console.log("processDockerEvent: updateContainer");
						return updateContainer(container);
					} else {
						console.log("processDockerEvent: removeContainer");
						return removeContainer(container);
					}
				} else {
					// new container
					if (!stop && positiveEvents.indexOf(event.status) !== -1) {
						return updateContainers(err => {
								if (!err) {
									console.log("processDockerEvent: updateContainers -> processDockerEvent(event, true)");
									return processDockerEvent(event, true);
								}
								console.log("no error, resolve");
								return reject(err);
						});
					}
				}
			} else {
				reject("Untracked event");
			}
		});
	};

	updateContainers(err => {
		return new Promise((resolve, reject) => {
			console.log("Begin update containers");
			if (!err) {
				monitor.docker.getEvents((err, data) => {
					if (err) {
						console.log("Error getting docker events: %s", err.message, err);
						return reject(err);
					}

					// events: create, destroy, die, exec_create, exec_start, export, kill, oom, pause, restart, start, stop, unpause
					// positive: create, restart, start
					// negative: destroy, die, kill, stop
					monitor.dataStream = data;
					data.on("data", chunk => {
						let lines = chunk.toString().replace(/\n$/, "").split("\n");
						async.each(
							lines,
							(line, done) => {
								try {
									if (line) {
										console.log("processDocerEvent: %s", line);
										return processDockerEvent(JSON.parse(line)).then(done).catch(done);
									} else {
										console.log("call done");
										done();
									}
								} catch (e) {
									console.log(
										"Error reading Docker event: %s",
										e.message,
										line
									);
									done(e);
									return reject(e);
								}
							},
							(err) => {
								console.log("updateContainers: finish");
								if (err) {
									if (handler.onError) {
										handler.onError(err, monitor.docker);
									}
									return reject(err);
								}

								if( handler.onUpdateComplete ) {
									console.log("trigger onUpdateComplete");
									handler.onUpdateComplete(containerByName, monitor.docker);
								}
								return resolve();
							}
						);
					});
				});
			} else {
				return reject(err);
			}
		});
	});

	monitor.stop = () => {
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
			reject("monitor not running.");
		});
	};
};

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
