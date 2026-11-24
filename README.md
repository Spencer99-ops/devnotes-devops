# DevNotes - Mini-gestionnaire de notes DevOps

Application web de gestion de snippets DevOps avec CI/CD et observabilité complète.

## Architecture du projet

```
devnotes-devops/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline CI/CD (GitHub Actions)
├── backend/
│   ├── package.json            # express, cors, prom-client
│   ├── server.js               # API REST /api/notes + /health + /metrics
│   └── data/
│       └── notes.json          # Persistance des snippets
├── frontend/
│   ├── package.json            # React + Vite
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx             # Recherche instantanée, filtres tags, CRUD
│       ├── App.css
│       └── main.jsx
├── monitoring/
│   └── prometheus.yml          # Configuration Prometheus
├── Dockerfile                  # Multi-stage: build React + serveur Express
├── docker-compose.yml          # Orchestration: app, cadvisor, prometheus, grafana
└── .gitignore
```

**Infrastructure Vagrant (séparée) :**

Les fichiers Vagrant (`Vagrantfile` et `provision.sh`) sont situés dans `C:\mon-projet-vagrant` et sont utilisés **localement sur Windows** pour créer et provisionner la VM Ubuntu.

```
C:\mon-projet-vagrant\
├── Vagrantfile                 # VM Ubuntu Jammy avec IP fixe 192.168.56.10
└── provision.sh                # Script d'installation Docker
```

**Séparation des responsabilités :**

- **Vagrantfile + provision.sh** (dans C:\mon-projet-vagrant) : Utilisés localement pour créer et provisionner la VM Ubuntu avec Docker. Définissent l'infrastructure de base (réseau 192.168.56.10, ports, installation Docker). Ne sont PAS utilisés par le CI/CD.

- **Projet DevNotes** (dans C:\Users\EG\Documents\DevNotes) : Déployé automatiquement par GitHub Actions dans la VM après chaque git push sur main. Le self-hosted runner exécute `docker compose up -d --build` pour mettre à jour l'application.

## Fonctionnalités

### Backend (Node.js/Express)
- API REST complète sur `/api/notes` (GET, POST, PUT, DELETE)
- Recherche par mot-clé (`?q=...`) et tag (`?tag=...`)
- Endpoint `/health` pour health checks
- Endpoint `/metrics` avec métriques Prometheus (prom-client)
- Persistance des données dans `backend/data/notes.json`

### Frontend (React + Vite)
- Barre de recherche instantanée
- Filtrage par tag (docker, git, linux, node)
- Création, édition et suppression de notes
- Interface responsive et moderne

### Observabilité
- **Prometheus** (port 9090) : Collecte des métriques
- **Grafana** (port 3000/3001) : Visualisation des métriques
- **cAdvisor** (port 8080) : Métriques CPU/RAM/réseau des conteneurs
- Métriques application : requêtes HTTP, opérations notes, nombre de notes actives

## Déploiement

### 1. Démarrer la VM Vagrant

Depuis le dossier `C:\mon-projet-vagrant` sur Windows :

```bash
cd C:\mon-projet-vagrant
vagrant up
vagrant ssh
```

Vérifier l'IP : `ip -4 addr show eth1` (doit afficher 192.168.56.10)

### 2. Cloner le projet DevNotes dans la VM

Dans la VM (après `vagrant ssh`), clonez le projet depuis GitHub :

```bash
cd /home/vagrant
git clone <votre-repo-github> devnotes-devops
cd devnotes-devops
```

**Note** : Le dossier `C:\mon-projet-vagrant` est monté dans la VM sous `/vagrant`, mais pour éviter les conflits avec le runner GitHub Actions, il est recommandé de cloner le projet DevNotes dans `/home/vagrant/devnotes-devops`.

### 3. Lancer la stack Docker

Dans la VM, dans le dossier du projet :

```bash
cd /home/vagrant/devnotes-devops
docker compose up -d --build
```

Vérifier les conteneurs :
```bash
docker compose ps
```

### 3. Accéder aux services

- **Application DevNotes** : http://192.168.56.10:5112 (ou http://localhost:5112)
- **Prometheus** : http://192.168.56.10:9090 (ou http://localhost:9090)
- **Grafana** : http://192.168.56.10:3002 (ou http://localhost:3002)
  - Login: admin / admin
- **cAdvisor** : http://192.168.56.10:8081 (ou http://localhost:8081)

### 4. Configurer le runner GitHub Actions (Self-hosted)

Dans la VM :

1. Allez sur GitHub → Settings → Actions → Runners → New self-hosted runner
2. Téléchargez et configurez le runner dans la VM
3. Ajoutez l'utilisateur du runner au groupe docker :
   ```bash
   sudo usermod -aG docker $USER
   ```
4. Redémarrez le runner

### 5. Tester le cycle CI/CD

Modifier le code (ex: frontend/src/App.jsx ou backend/server.js) :

```bash
git add .
git commit -m "feat: update devnotes"
git push origin main
```

Vérifier :
- L'exécution dans l'onglet Actions de GitHub
- Le conteneur devnotes-app est recréé automatiquement
- La modification est visible sur http://192.168.56.10:5111

## Configuration Grafana

1. Connectez-vous à Grafana (admin/admin)
2. Ajoutez une datasource Prometheus :
   - URL: http://prometheus:9090
3. Importez un dashboard ou créez vos visualisations :
   - Métriques HTTP (request duration)
   - Opérations notes (create/update/delete)
   - Nombre de notes actives
   - Métriques conteneurs (CPU, RAM via cAdvisor)

## Ports utilisés

| Service | Port VM | Port Host |
|---------|---------|-----------|
| DevNotes | 5112 | 5112 |
| Prometheus | 9090 | 9090 |
| Grafana | 3002 | 3002 |
| cAdvisor | 8081 | 8081 |

## Développement local

Pour développer sans Docker :

```bash
# Backend
cd backend
npm install
npm start

# Frontend (terminal séparé)
cd frontend
npm install
npm run dev
```

L'application sera accessible sur http://localhost:3000
