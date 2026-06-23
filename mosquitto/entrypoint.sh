#!/bin/sh
set -eu

: "${DB_PASSWORD:?DB_PASSWORD is required to render mosquitto config}"

template="${MOSQUITTO_CONFIG_TEMPLATE:-/etc/mosquitto/mosquitto.conf.template}"
rendered="${MOSQUITTO_CONFIG:-/tmp/mosquitto.conf}"

escaped_password=$(printf '%s' "$DB_PASSWORD" | sed 's/[\/&\\]/\\&/g')
sed "s/__DB_PASSWORD__/$escaped_password/g" "$template" > "$rendered"

exec "$@"
