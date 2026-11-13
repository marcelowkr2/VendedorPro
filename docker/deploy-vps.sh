#!/usr/bin/env bash
set -Eeuo pipefail

base=/opt/vendedorpro-deploy
original=/opt/vendedorpro
repo="$base/repository"
releases="$base/releases"
env_file="$original/.env.production"
marker="$base/deployed"
failed="$base/failed"
baseline="$base/schema.prisma"
mkdir -p "$releases"
exec 9>"$base/deploy.lock"
flock -n 9 || exit 0

git -C "$repo" fetch --quiet origin master
target=$(git -C "$repo" rev-parse refs/remotes/origin/master)
current=$(cat "$marker")
if [[ "$target" == "$current" ]]; then
  echo "Nenhuma atualização."
  exit 0
fi
if [[ -f "$failed" ]] && [[ "$(cat "$failed")" == "$target" ]]; then
  echo "Commit $target já falhou; remova $failed para tentar novamente."
  exit 0
fi
if ! git -C "$repo" merge-base --is-ancestor "$current" "$target"; then
  echo "Atualização recusada: histórico não é fast-forward." >&2
  exit 1
fi
if ! git -C "$repo" show "$target:packages/db/prisma/schema.prisma" | cmp -s "$baseline" -; then
  echo "Atualização recusada: schema alterado; revise e aplique uma migração manualmente." >&2
  printf '%s\n' "$target" > "$failed"
  exit 1
fi

release="$releases/$target"
mkdir -p "$release"
git -C "$repo" archive "$target" | tar -xf - -C "$release"
previous="$original"
if [[ -d "$releases/$current" ]]; then previous="$releases/$current"; fi
compose() {
  local dir=$1
  shift
  docker compose --project-directory "$dir" --env-file "$env_file" -f "$dir/docker-compose.prod.yml" "$@"
}
api_image=vendedorpro-vendedorpro-api
web_image=vendedorpro-vendedorpro-web
docker image tag "$api_image:latest" "$api_image:rollback"
docker image tag "$web_image:latest" "$web_image:rollback"

restore_images() {
  docker image tag "$api_image:rollback" "$api_image:latest"
  docker image tag "$web_image:rollback" "$web_image:latest"
}
if ! compose "$release" build; then
  restore_images
  printf '%s\n' "$target" > "$failed"
  echo "Build falhou; aplicação existente preservada." >&2
  exit 1
fi

if compose "$release" up -d --no-build; then
  for attempt in {1..30}; do
    if curl --silent --show-error --fail --max-time 5 --resolve vendedorpro.infosystema.cloud:443:127.0.0.1 \
      https://vendedorpro.infosystema.cloud/login -o /dev/null \
      && curl --silent --show-error --fail --max-time 5 --resolve vendedorpro.infosystema.cloud:443:127.0.0.1 \
      https://vendedorpro.infosystema.cloud/api/v1/docs -o /dev/null; then
      printf '%s\n' "$target" > "$marker.tmp"
      mv "$marker.tmp" "$marker"
      rm -f "$failed"
      echo "Deploy concluído: $target"
      exit 0
    fi
    sleep 4
  done
fi

echo "Deploy falhou; restaurando versão anterior." >&2
printf '%s\n' "$target" > "$failed"
restore_images
if ! compose "$previous" up -d --no-build; then
  echo "Falha ao restaurar a versão anterior; intervenção manual necessária." >&2
fi
exit 1
