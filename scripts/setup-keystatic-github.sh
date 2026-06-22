#!/usr/bin/env bash
#
# Brancher Keystatic sur GitHub : permet d'éditer le site depuis /keystatic en
# production (Vercel). Chaque enregistrement commite sur le dépôt huberdiere-site
# et redéclenche un déploiement.
#
# À lancer dans l'ordre :
#   ./scripts/setup-keystatic-github.sh secret    # 1. génère KEYSTATIC_SECRET dans .env
#   ./scripts/setup-keystatic-github.sh wizard    # 2. crée l'app GitHub (navigateur)
#   ./scripts/setup-keystatic-github.sh vercel    # 3. pousse les variables sur Vercel + déploie
#
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE=".env"
REPO_OWNER="alexis-morain"
REPO_NAME="huberdiere-site"
PROD_URL="https://site-v0-rho.vercel.app"

set_env_var() {
  # set_env_var CLE VALEUR : écrit/remplace la clé dans .env (sans toucher au reste)
  local key="$1" val="$2"
  touch "$ENV_FILE"
  if grep -q "^${key}=" "$ENV_FILE"; then
    # remplace la ligne (compatible macOS / BSD sed)
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

get_env_var() {
  grep "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-
}

case "${1:-}" in
  secret)
    SECRET="$(openssl rand -hex 32)"
    set_env_var "KEYSTATIC_SECRET" "$SECRET"
    echo "✓ KEYSTATIC_SECRET généré et écrit dans $ENV_FILE"
    echo "  Étape suivante : ./scripts/setup-keystatic-github.sh wizard"
    ;;

  wizard)
    echo "Lancement du serveur en mode GitHub pour créer l'app GitHub Keystatic."
    echo
    echo "1) Une fois le serveur prêt, ouvre cette adresse EXACTE (pas /keystatic seul) :"
    echo "      http://localhost:4321/keystatic/setup"
    echo "2) Dans « Deployed App URL », mets : ${PROD_URL}"
    echo "   (laisse « GitHub organization » vide, c'est un dépôt perso)."
    echo "3) Clique « Create GitHub App », autorise sur GitHub, et installe l'app"
    echo "   sur le dépôt ${REPO_OWNER}/${REPO_NAME}. Keystatic écrit alors"
    echo "   KEYSTATIC_GITHUB_CLIENT_ID et KEYSTATIC_GITHUB_CLIENT_SECRET dans .env."
    echo "4) Quand c'est fait, Ctrl+C, puis :  ./scripts/setup-keystatic-github.sh vercel"
    echo
    VITE_KEYSTATIC_STORAGE=github npm run dev
    ;;

  vercel)
    command -v vercel >/dev/null 2>&1 || export PATH="$HOME/.bun/bin:$PATH"
    command -v vercel >/dev/null 2>&1 || { echo "vercel CLI introuvable (bun)."; exit 1; }

    for KEY in KEYSTATIC_GITHUB_CLIENT_ID KEYSTATIC_GITHUB_CLIENT_SECRET KEYSTATIC_SECRET; do
      VAL="$(get_env_var "$KEY")"
      if [ -z "$VAL" ]; then
        echo "✗ $KEY est vide dans .env. Lance d'abord 'secret' puis 'wizard'."; exit 1
      fi
      # on retire l'ancienne valeur si elle existe (silencieux), puis on (re)pose
      vercel env rm "$KEY" production -y >/dev/null 2>&1 || true
      printf '%s' "$VAL" | vercel env add "$KEY" production >/dev/null
      echo "✓ $KEY poussé sur Vercel (production)"
    done

    echo
    echo "IMPORTANT : sur GitHub > Settings > Developer settings > GitHub Apps >"
    echo "  (ton app Keystatic) > ajoute l'URL de callback de production :"
    echo "  ${PROD_URL}/api/keystatic/github/oauth/callback"
    echo
    echo "Déploiement en production…"
    vercel deploy --prod --yes
    echo "✓ Déployé. Édition en ligne : ${PROD_URL}/keystatic"
    ;;

  *)
    echo "Usage : $0 {secret|wizard|vercel}"
    echo "  secret  : génère KEYSTATIC_SECRET dans .env"
    echo "  wizard  : crée l'app GitHub Keystatic (navigateur)"
    echo "  vercel  : pousse les variables sur Vercel + déploie"
    exit 1
    ;;
esac
