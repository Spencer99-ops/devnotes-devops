# Validation CC DevOps - DevNotes

Ce document confirme que tous les objectifs du CC DevOps ont été réalisés à 100%.

## ✅ Objectif 1 : Créer une machine virtuelle avec Vagrant

**État : RÉALISÉ ✅**

- Fichier Vagrantfile dans `C:\mon-projet-vagrant`
- VM Ubuntu Jammy créée avec IP privée fixe : `192.168.56.10`
- Configuration :
  - 3072 Mo RAM
  - 2 CPUs
  - Provider VirtualBox
- Ports redirigés :
  - 5112 → DevNotes
  - 9090 → Prometheus
  - 3002 → Grafana
  - 8081 → cAdvisor
  - 8080 → Jenkins (existant)

**Commandes de vérification :**
```bash
cd C:\mon-projet-vagrant
vagrant up
vagrant ssh
```

**Vérification IP :**
```bash
ip -4 addr show eth1
# Résultat attendu : 192.168.56.10
```

---

## ✅ Objectif 2 : Déployer une application sur Docker

**État : RÉALISÉ ✅**

### Architecture de l'application

**Backend (Node.js/Express) :**
- API REST complète sur `/api/notes` (GET, POST, PUT, DELETE)
- Recherche par mot-clé (`?q=...`) et tag (`?tag=...`)
- Endpoint `/health` pour health checks
- Endpoint `/metrics` avec métriques Prometheus (prom-client)
- Persistance des données dans `backend/data/notes.json`

**Frontend (React + Vite) :**
- Barre de recherche instantanée
- Filtrage par tag (docker, git, linux, node)
- Création, édition et suppression de notes
- Interface responsive et moderne

**Dockerisation :**
- Dockerfile multi-stage (build React + serveur Express)
- docker-compose.yml pour l'orchestration
- Conteneurs :
  - `devnotes-app` : Application principale
  - `prometheus` : Collecte des métriques
  - `grafana` : Visualisation des métriques
  - `cadvisor` : Métriques conteneurs

**Commandes de déploiement :**
```bash
cd /home/vagrant/devnotes-devops
docker compose up -d --build
```

**Vérification des conteneurs :**
```bash
docker compose ps
# Résultat attendu : 4 conteneurs actifs
```

---

## ✅ Objectif 3 : Appliquer un process CI/CD avec GitHub Actions

**État : RÉALISÉ ✅**

### Configuration GitHub Actions

**Workflow :** `.github/workflows/deploy.yml`
- Déclenché sur chaque push sur la branche `main`
- Runner self-hosted dans la VM
- Étapes :
  1. Récupération du code (actions/checkout@v4)
  2. Reconstruction du conteneur : `docker compose up -d --build --no-deps devnotes-app`

**Runner GitHub Actions :**
- Nom : `ubuntu-jammy`
- Type : Self-hosted, Linux
- Répertoire de travail : `/home/vagrant/devnotes-devops`
- Utilisateur dans le groupe docker : ✅

**Commandes de vérification :**
```bash
# Dans la VM
cd /home/vagrant/devnotes-devops/actions-runner
./run.sh
```

**Vérification sur GitHub :**
- Onglet Actions du dépôt : https://github.com/Spencer99-ops/devnotes-devops/actions
- Les jobs s'exécutent automatiquement après chaque push
- Statut : ✅ Succeeded

---

## ✅ Objectif 4 : Ajouter l'observabilité (Grafana et Prometheus)

**État : RÉALISÉ ✅**

### Configuration Prometheus

**Fichier :** `monitoring/prometheus.yml`
- Scrape interval : 15s
- Jobs configurés :
  - `prometheus` : auto-métriques
  - `devnotes-app` : métriques application sur `/metrics`
  - `cadvisor` : métriques conteneurs

**Métriques exposées par l'application :**
- `http_request_duration_seconds` : durée des requêtes HTTP
- `notes_operations_total` : compteur d'opérations (create/update/delete)
- `active_notes_count` : nombre de notes actives
- Métriques par défaut de Node.js (via prom-client)

### Configuration Grafana

**Accès :** http://192.168.56.10:3002
- Login : admin / admin
- Datasource Prometheus configurée

**Accès aux services d'observabilité :**
- **Prometheus** : http://192.168.56.10:9090
- **Grafana** : http://192.168.56.10:3002
- **cAdvisor** : http://192.168.56.10:8081

**Vérification des métriques :**
```bash
curl http://localhost:5112/metrics
# Résultat attendu : métriques Prometheus au format texte
```

---

## ✅ Objectif 5 : Application exposée via adresse IP

**État : RÉALISÉ ✅**

L'application est accessible via :
- **IP privée VM** : http://192.168.56.10:5112
- **localhost (depuis Windows)** : http://localhost:5112

**Vérification :**
```bash
# Test de l'API
curl http://192.168.56.10:5112/api/notes
curl http://192.168.56.10:5112/health

# Test du frontend dans navigateur
# Ouvrir : http://192.168.56.10:5112
```

---

## ✅ Objectif 6 : Mise à jour automatique via CI/CD

**État : RÉALISÉ ✅**

### Cycle de mise à jour automatique

1. **Modification du code** (ex: changement dans `frontend/src/App.jsx`)
2. **Commit et push :**
   ```bash
   git add .
   git commit -m "feat: test update"
   git push origin main
   ```
3. **Déclenchement automatique** du workflow GitHub Actions
4. **Exécution sur le runner self-hosted** dans la VM
5. **Reconstruction du conteneur** : `docker compose up -d --build --no-deps devnotes-app`
6. **Mise à jour automatique** de l'application sans intervention manuelle

**Preuve de fonctionnement :**
- Plusieurs jobs GitHub Actions exécutés avec succès
- Logs du runner montrant des jobs "Succeeded"
- Conteneur recréé automatiquement après chaque push

**Vérification :**
```bash
# Dans la VM
docker ps -a
# Vérifier que le conteneur devnotes-app a été recréé récemment
```

---

## 📊 Récapitulatif des ports

| Service | Port VM | Port Host | URL d'accès |
|---------|---------|-----------|-------------|
| DevNotes | 5111 | 5112 | http://192.168.56.10:5112 |
| Prometheus | 9090 | 9090 | http://192.168.56.10:9090 |
| Grafana | 3000 | 3002 | http://192.168.56.10:3002 |
| cAdvisor | 8080 | 8081 | http://192.168.56.10:8081 |

---

## 🗂️ Structure du projet

```
devnotes-devops/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline CI/CD GitHub Actions
├── backend/
│   ├── package.json            # express, cors, prom-client
│   ├── server.js               # API REST + /health + /metrics
│   └── data/
│       └── notes.json          # Persistance des snippets
├── frontend/
│   ├── package.json            # React + Vite
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx             # UI avec recherche, filtres, CRUD
│       ├── App.css
│       └── main.jsx
├── monitoring/
│   └── prometheus.yml          # Configuration Prometheus
├── Dockerfile                  # Multi-stage: build React + serveur Express
├── docker-compose.yml          # Orchestration complète
└── README.md                   # Documentation

C:\mon-projet-vagrant\
├── Vagrantfile                 # VM Ubuntu avec IP fixe
└── provision.sh                # Installation Docker
```

---

## ✅ Checklist de validation

- [x] VM créée avec Vagrant (Ubuntu Jammy, IP 192.168.56.10)
- [x] Docker installé dans la VM
- [x] Application DevNotes construite et déployée sur Docker
- [x] Backend Node.js/Express avec API REST
- [x] Frontend React avec interface utilisateur
- [x] Dockerfile multi-stage fonctionnel
- [x] Docker Compose avec tous les services
- [x] GitHub Actions workflow configuré
- [x] Self-hosted runner GitHub Actions installé et fonctionnel
- [x] Prometheus configuré et fonctionnel
- [x] Grafana configuré et accessible
- [x] cAdvisor configuré pour métriques conteneurs
- [x] Application exposée via IP (192.168.56.10:5112)
- [x] Mise à jour automatique fonctionnelle (testée avec git push)
- [x] Endpoint /metrics exposé par l'application
- [x] Cycle CI/CD complet fonctionnel

---

## 🎯 Conclusion

**Tous les objectifs du CC DevOps ont été réalisés à 100%.**

Le projet DevNotes démontre :
- Infrastructure as Code avec Vagrant
- Conteneurisation avec Docker
- Process CI/CD automatisé avec GitHub Actions
- Observabilité complète avec Prometheus et Grafana
- Déploiement automatisé et mise à jour continue

**Date de validation :** 24 novembre 2026
**Dépôt GitHub :** https://github.com/Spencer99-ops/devnotes-devops
