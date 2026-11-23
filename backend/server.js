const express = require('express');
const cors = require('cors');
const promClient = require('prom-client');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5111;

// Middleware
app.use(cors());
app.use(express.json());

// Métriques Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Métriques personnalisées
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const notesOperations = new promClient.Counter({
  name: 'notes_operations_total',
  help: 'Total number of notes operations',
  labelNames: ['operation'],
  registers: [register]
});

const activeNotes = new promClient.Gauge({
  name: 'active_notes_count',
  help: 'Number of active notes',
  registers: [register]
});

// Middleware pour mesurer le temps de requête
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route ? req.route.path : req.path,
        status_code: res.statusCode
      },
      duration
    );
  });
  next();
});

// Fichier de données pour la persistance
const DATA_FILE = path.join(__dirname, 'data', 'notes.json');

// Initialiser le fichier de données
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Lire les notes
function readNotes() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const notes = JSON.parse(data);
    activeNotes.set(notes.length);
    return notes;
  } catch (error) {
    console.error('Erreur lecture notes:', error);
    return [];
  }
}

// Écrire les notes
function writeNotes(notes) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
    activeNotes.set(notes.length);
  } catch (error) {
    console.error('Erreur écriture notes:', error);
  }
}

// Routes API

// GET /api/notes - Récupérer toutes les notes avec recherche
app.get('/api/notes', (req, res) => {
  const { q, tag } = req.query;
  let notes = readNotes();

  if (q) {
    const query = q.toLowerCase();
    notes = notes.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  }

  if (tag && tag !== 'all') {
    notes = notes.filter(note => note.tag === tag);
  }

  res.json(notes);
});

// POST /api/notes - Créer une note
app.post('/api/notes', (req, res) => {
  const { title, tag, content } = req.body;

  if (!title || !tag || !content) {
    return res.status(400).json({ error: 'Title, tag and content are required' });
  }

  const notes = readNotes();
  const newNote = {
    id: Date.now().toString(),
    title,
    tag,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notes.push(newNote);
  writeNotes(notes);
  notesOperations.inc({ operation: 'create' });

  res.status(201).json(newNote);
});

// PUT /api/notes/:id - Mettre à jour une note
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, tag, content } = req.body;

  let notes = readNotes();
  const noteIndex = notes.findIndex(note => note.id === id);

  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }

  notes[noteIndex] = {
    ...notes[noteIndex],
    title: title || notes[noteIndex].title,
    tag: tag || notes[noteIndex].tag,
    content: content || notes[noteIndex].content,
    updatedAt: new Date().toISOString()
  };

  writeNotes(notes);
  notesOperations.inc({ operation: 'update' });

  res.json(notes[noteIndex]);
});

// DELETE /api/notes/:id - Supprimer une note
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  let notes = readNotes();
  const filteredNotes = notes.filter(note => note.id !== id);

  if (notes.length === filteredNotes.length) {
    return res.status(404).json({ error: 'Note not found' });
  }

  writeNotes(filteredNotes);
  notesOperations.inc({ operation: 'delete' });

  res.json({ message: 'Note deleted successfully' });
});

// GET /health - Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GET /metrics - Métriques Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Servir les fichiers statiques du frontend (build)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Pour les routes non-API, servir index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DevNotes server running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`Metrics: http://0.0.0.0:${PORT}/metrics`);
});
