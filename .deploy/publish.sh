#!/usr/bin/env bash

base_dir=$(dirname "$0");

# shellcheck source=.deploy/shared.sh
# shellcheck disable=SC1091
source "${base_dir}/shared.sh";

get_opts() {
	while getopts ":n:v:" opt; do
	  case $opt in
			n) export opt_project_name="$OPTARG";
			;;
			v) export opt_version="$OPTARG";
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

TARBALL=${base_dir}/../dist/*.tgz;

[[ ! $BUILD_VERSION =~ -snapshot$ ]] && \
	npm publish "$TARBALL" --tag "${BUILD_VERSION}" --tag "latest";
[[ $BUILD_VERSION =~ -snapshot$ ]] && \
	npm publish "$TARBALL" --tag "${BUILD_VERSION}" --tag "latest-snapshot";
