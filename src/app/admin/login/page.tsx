import LoginForm from '@/components/admin/LoginForm';
import '../admin.css';

export const metadata = { title: 'Sign in — Admin', robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="adm">
      <div className="login">
        <div className="art">
          <div className="brand" style={{ border: 0, padding: 0 }}><span className="mk">DZ</span><div><b>Admin</b><small>PORTFOLIO</small></div></div>
          <h2>Update your cell <em>anytime</em>, from anywhere.</h2>
          <p style={{ color: '#9fc0b2', fontWeight: 600, maxWidth: 420 }}>Sections, photos, colours and every word on the site — no code needed.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
