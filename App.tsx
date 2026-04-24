import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signIn } from './firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import ExamView from './pages/ExamView';
import SubmissionView from './pages/SubmissionView';

function App() {
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (!loading && !user) {
      signIn();
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard role="student" />} />
        <Route path="/exam/:examId" element={<ExamView role="student" />} />
        <Route path="/submission/:submissionId" element={<SubmissionView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

