"use strict";

// const Map = require("collections/fast-map");
const Docker = require("dockerode");
const async = require("async");
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

module.exports = function (mhandler, dockerOpts, opts) {
	console.log(JSON.stringify(mhandler));
	console.log(JSON.stringify(dockerOpts));
	console.log(JSON.stringify(opts));
	return new Promise((resolve, reject) => {

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

		// merge the options?

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
				return reject("nothing in names");
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
							.then(() => {
								return addContainer(info);
							})
							.catch(reject);
					}
				} else {
					// new service
					changed = true;
				}

				if (changed) {
					return addContainer(info);
				}
				return resolve(info);
			});
		};

		let addContainer = info => {
			return new Promise((resolve, reject) => {
				if (monitoringEnabled(info)) {
					containerByName.set(info.Name, info);
					containerById.set(info.Id, info);
					console.log("trigger: onContainerUp(%s)", info.Name);
					mhandler.onContainerUp(info, monitor.docker);
					return resolve(info);
				} else {
					return reject("monitoring disabled");
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
					mhandler.onContainerDown(oldInfo, monitor.docker);
					return resolve(info);
				} else {
					return reject("no container to remove");
				}
			});
		};

		let monitoringEnabled = info => {
			if (monitorAll) {
				// monitor all containers that don't have [selectorLabel]=false
				return (
					!info.Labels ||
					info.Labels[selectorLabel] === undefined ||
					falseStrings.indexOf(
						info.Labels[selectorLabel].toLocaleLowerCase()
					) === -1
				);
			} else {
				// monitor only containers that have [selectorLabel]=true
				return (
					info.Labels &&
					info.Labels[selectorLabel] !== undefined &&
					falseStrings.indexOf(
						info.Labels[selectorLabel].toLocaleLowerCase()
					) === -1
				);
			}
		};

		// initially populate container map
		let updateContainers = next => {
			return new Promise((resolve, reject) => {
				monitor.docker.listContainers((err, list) => {
					if (err) {
						console.log(
							"Error listing running containers: %s",
							err.message,
							err
						);
						if (mhandler.onError) {
							mhandler.onError(err, monitor.docker);
						}
						return next(err);
					}

					if (!monitor.started) {
						if (mhandler.onMonitorStarted) {
							console.log("trigger: onMonitorStarted");
							mhandler.onMonitorStarted(monitor, monitor.docker);
						}
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
											done(err);
										});
								})
								.catch(reject);
						},
						err => {
							if (err) {
								console.log(err);
								if (mhandler.onError) {
									mhandler.onError(err, monitor.docker);
								}
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
							console.log("processDockerEvent -> updateContainer");
							return updateContainer(container).catch(err => {
								if (mhandler.onError) {
									mhandler.onError(err, monitor.docker);
								}
								return reject(err);
							});
						} else {
							console.log("processDockerEvent -> removeContainer");
							return removeContainer(container).catch(err => {
								if (mhandler.onError) {
									mhandler.onError(err, monitor.docker);
								}
								return reject(err);
							});
						}
					} else {
						// new container
						if (!stop && positiveEvents.indexOf(event.status) !== -1) {
							return updateContainers(err => {
								if (!err) {
									console.log(
										"processDockerEvent: updateContainers -> processDockerEvent(event, true)"
									);
									return processDockerEvent(event, true).catch(err => {
										console.log("no error, resolve");
										if (mhandler.onError) {
											mhandler.onError(err, monitor.docker);
										}
										return reject(err);
									});
								}
								console.log("no error, resolve");
								if (mhandler.onError) {
									mhandler.onError(err, monitor.docker);
								}
								return reject(err);
							});
						}
					}
				} else {
					return reject("Untracked event");
				}
			});
		};

		monitor.stop = () => {
			return new Promise((resolve, reject) => {
				if (monitor.dataStream && monitor.dataStream.destroy) {
					monitor.dataStream.on("end", () => {
						monitor.started = false;
						if (mhandler.onMonitorStopped) {
							mhandler.onMonitorStopped(monitor, monitor.docker);
						}
					});
					monitor.dataStream.destroy();
					monitor.dataStream = null;
					return resolve(monitor);
				}
				if (mhandler.onError) {
					mhandler.onError(new Error("monitor not running."), monitor.docker);
				}
				return reject("monitor not running.");
			});
		};


		return updateContainers(err => {
			return new Promise((resolve, reject) => {
				console.log("Begin update containers");
				if (!err) {
					monitor.docker.getEvents((err, data) => {
						if (err) {
							console.log("Error getting docker events: %s", err.message, err);
							if (mhandler.onError) {
								mhandler.onError(err, monitor.docker);
							}
							return reject(err);
						}

						// events: create, destroy, die, exec_create, exec_start, export, kill, oom, pause, restart, start, stop, unpause
						// positive: create, restart, start
						// negative: destroy, die, kill, stop
						monitor.dataStream = data;
						data.on("data", chunk => {
							let lines = chunk
								.toString()
								.replace(/\n$/, "")
								.split("\n");
							async.each(
								lines,
								(line, done) => {
									try {
										if (line) {
											console.log("processDockerEvent: line");
											return processDockerEvent(JSON.parse(line))
												.then(() => {
													console.log("after update container");
													done();
												})
												.catch(err => {
													console.log("error after update container");
													if (mhandler.onError) {
														mhandler.onError(err, monitor.docker);
													}
													done(err);
												});
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
										if (mhandler.onError) {
											mhandler.onError(e, monitor.docker);
										}
										done(e);
										return reject(e);
									}
								},
								err => {
									console.log("updateContainers: finish");
									if (err) {
										if (mhandler.onError) {
											mhandler.onError(err, monitor.docker);
										}
										console.log(err);
										return reject(err);
									}
									console.log("done with onUpdateComplete");
									if (mhandler.onUpdateComplete) {
										console.log("trigger onUpdateComplete");
										mhandler.onUpdateComplete(containerByName, monitor.docker);
									} else {
										console.log("onUpdateComplete does not exist");
									}

									return resolve(containerByName);
								}
							);
						});
					});
				} else {
					if (mhandler.onError) {
						mhandler.onError(err, monitor.docker);
					}
					return reject(err);
				}
			});
		})
			.then(d => {
				console.log("done with onUpdateComplete");
				if (mhandler.onUpdateComplete) {
					console.log("trigger onUpdateComplete");
					mhandler.onUpdateComplete(containerByName, monitor.docker);
				} else {
					console.log("onUpdateComplete does not exist");
				}
				return resolve(containerByName);
			})
			.catch(err => {
				if (mhandler.onError) {
					mhandler.onError(err, monitor.docker);
				}
				return reject(err);
			});

	});
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
