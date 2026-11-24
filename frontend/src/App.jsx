import { useState, useEffect } from 'react';
import './App.css';

const API_URL = '/api/notes';

const TAGS = ['all', 'docker', 'git', 'linux', 'node'];

function App() {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({ title: '', tag: 'docker', content: '' });
  const [loading, setLoading] = useState(false);

  // Charger les notes
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedTag !== 'all') params.append('tag', selectedTag);

      const response = await fetch(`${API_URL}?${params}`);
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error('Erreur chargement notes:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, [searchQuery, selectedTag]);

  // Créer une note
  const createNote = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const newNote = await response.json();
      setNotes([...notes, newNote]);
      setShowForm(false);
      setFormData({ title: '', tag: 'docker', content: '' });
    } catch (error) {
      console.error('Erreur création note:', error);
    }
  };

  // Mettre à jour une note
  const updateNote = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/${editingNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const updatedNote = await response.json();
      setNotes(notes.map(note => note.id === updatedNote.id ? updatedNote : note));
      setEditingNote(null);
      setShowForm(false);
      setFormData({ title: '', tag: 'docker', content: '' });
    } catch (error) {
      console.error('Erreur mise à jour note:', error);
    }
  };

  // Supprimer une note
  const deleteNote = async (id) => {
    if (!window.confirm('Supprimer cette note ?')) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      console.error('Erreur suppression note:', error);
    }
  };

  // Ouvrir le formulaire d'édition
  const openEditForm = (note) => {
    setEditingNote(note);
    setFormData({ title: note.title, tag: note.tag, content: note.content });
    setShowForm(true);
  };

  // Fermer le formulaire
  const closeForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setFormData({ title: '', tag: 'docker', content: '' });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📝 DevNotes</h1>
        <p className="subtitle">Gestionnaire de notes - 2026-2027</p>
      </header>

      <div className="controls">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <div className="tags">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`tag-button ${selectedTag === tag ? 'active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>

        <button onClick={() => setShowForm(true)} className="add-button">
          + Nouvelle note
        </button>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="notes-grid">
          {notes.length === 0 ? (
            <div className="empty-state">
              <p>Aucune note trouvée</p>
            </div>
          ) : (
            notes.map(note => (
              <div key={note.id} className="note-card">
                <div className="note-header">
                  <span className={`note-tag ${note.tag}`}>{note.tag}</span>
                  <div className="note-actions">
                    <button onClick={() => openEditForm(note)} className="edit-btn">✏️</button>
                    <button onClick={() => deleteNote(note.id)} className="delete-btn">🗑️</button>
                  </div>
                </div>
                <h3 className="note-title">{note.title}</h3>
                <pre className="note-content">{note.content}</pre>
                <div className="note-date">
                  {new Date(note.updatedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>{editingNote ? 'Modifier la note' : 'Nouvelle note'}</h2>
            <form onSubmit={editingNote ? updateNote : createNote}>
              <div className="form-group">
                <label>Titre</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tag</label>
                <select
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                >
                  {TAGS.filter(t => t !== 'all').map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Contenu</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={closeForm} className="cancel-btn">Annuler</button>
                <button type="submit" className="submit-btn">
                  {editingNote ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
