'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface Contact {
  id: number;
  name: string;
}

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

export default function PwrContactsModal({ onClose, onChanged }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setLoading(true);
    try {
      const res = await fetch('/api/pwr/contacts');
      const data = await res.json();
      if (data.contacts) setContacts(data.contacts);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/pwr/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (res.ok) {
        setNewName('');
        await fetchContacts();
        onChanged();
      } else {
        const err = await res.json();
        alert('Lỗi thêm danh bạ: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xóa người này khỏi danh sách?')) return;
    try {
      await fetch(`/api/pwr/contacts/${id}`, { method: 'DELETE' });
      await fetchContacts();
      onChanged();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--color-bg)', padding: 24, borderRadius: 12, width: '90%', maxWidth: 400,
        border: '1px solid var(--color-surface-3)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Quản lý Danh bạ</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Nhập tên người liên quan..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            disabled={submitting}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting || !newName.trim()}>
            <Plus size={16} /> Thêm
          </button>
        </form>

        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>Đang tải...</div>
          ) : contacts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>Chưa có người nào trong danh sách.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contacts.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 6 }}>
                  <span>{c.name}</span>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
