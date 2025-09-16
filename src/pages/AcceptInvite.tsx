import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function AcceptInvitePage() {
  const [search] = useSearchParams();
  const initialToken = search.get('token') || '';
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      onAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAccept = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.acceptProjectInvite(token);
      setSuccess('Invitation accepted successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <h2>Accept Invitation</h2>
      <p className="muted">Paste your invite token or open the invite link you received.</p>
      <div className="auth-card">
        <label>
          Token
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="<inviteId>.<secret>" />
        </label>
        <button onClick={onAccept} disabled={loading || !token}>{loading ? 'Accepting...' : 'Accept'}</button>
        {success && <p style={{ color: '#34d399' }}>{success}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
