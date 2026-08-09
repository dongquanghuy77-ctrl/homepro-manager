import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
          404 — Không tìm thấy
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
          Trang bạn tìm không tồn tại hoặc đã bị xóa.
        </p>
        <Link href="/" className="btn btn-primary">
          ← Về Dashboard
        </Link>
      </div>
    </div>
  );
}
