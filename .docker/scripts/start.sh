#!/bin/bash
# Share same permissions between container and host
if [ ! -z "$DOCKER_HOST_UID" ]; then
  if [ -z "$DOCKER_HOST_GID" ]; then
    DOCKER_HOST_GID=${DOCKER_HOST_UID}
  fi
  deluser node
  delgroup node
  addgroup --system --gid ${DOCKER_HOST_GID} node
  adduser --system --ingroup node --disabled-password --home /var/cache/node --disabled-login --uid ${DOCKER_HOST_UID} node
  chown -Rf node:node ${CONTAINER_ROOT}
 else
  # Always chown webroot for better mounting
  chown -Rf node:node ${CONTAINER_ROOT}
fi

# Start supervisord and services
exec tail -f /dev/null
