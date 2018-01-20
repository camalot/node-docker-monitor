#!/usr/bin/env bash

__print() {
	TCOLOR=$(if [[ ! -z "${1// }" ]]; then echo ";$1"; else echo ''; fi);
	COLOR="\\033[0${TCOLOR}m";
	NC='\033[0m';
	(>&2 echo -e "${COLOR}${*:2}${NC}");
}

__error() {
	(>&2 echo -e "$@");
	#__print "31" "${@:2}";
	exit 9;
}
__warning() {
	(>&2 echo -e "$@");
	#__print "33" "${@:2}";
}
__info() {
	(>&2 echo -e "$@");
	#__print "36" "${@:2}";
}
