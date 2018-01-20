#!/usr/bin/env bash
set -e;
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
			o) export opt_org="$OPTARG";
			;;
	    \?) __error "Invalid option $opt";
	    ;;
	  esac;
	done;
	return 0;
};

get_opts "$@";

PROJECT_NAME="${opt_project_name:-"${CI_PROJECT_NAME}"}";
BUILD_VERSION="${opt_version:-"${CI_BUILD_VERSION:-"1.0.0-snapshot"}"}";
BUILD_ORG="${opt_org:-"${CI_DOCKER_ORGANIZATION:-"1.0.0-snapshot"}"}";

TARBALL="${base_dir}/../dist/${BUILD_ORG}-${PROJECT_NAME}-${BUILD_VERSION}.tgz";

[ -f "${TARBALL}" ] && echo "cannot find file." && exit 4;

[[ ! $BUILD_VERSION =~ -snapshot$ ]] && \
	npm publish "$TARBALL";
[[ $BUILD_VERSION =~ -snapshot$ ]] && \
	npm publish "$TARBALL" --tag "latest-snapshot";
