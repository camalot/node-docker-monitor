#!/usr/bin/env bash

base_dir=$(dirname "$0");

# shellcheck source=.deploy/shared.sh
# shellcheck disable=SC1091
source "${base_dir}/shared.sh";

get_opts() {
	while getopts ":n:v:o:" opt; do
	  case $opt in
			n) export opt_project_name="$OPTARG";
			;;
			v) export opt_version="$OPTARG";
			;;
			o) export opt_docker_org="$OPTARG";
			;;
	    \?) __error "Invalid option $opt";
	    ;;
	  esac;
	done;
	return 0;
};

get_opts "$@";

PROJECT_NAME="${opt_project_name:-"${CI_PROJECT_NAME}"}";
BUILD_VERSION=${CI_BUILD_VERSION:-"1.0.0-snapshot"};
