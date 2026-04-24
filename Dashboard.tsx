import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { FileText, BookOpen, CheckCircle2 } from 'lucide-react';

export default function Dashboard({ role }: { role: 'teacher' | 'student' | null }) {
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions'>('exams');

  const [examsSnapshot, loadingExams, errorExams] = useCollection(
    query(collection(db, 'exams'), orderBy('createdAt', 'desc'))
  );

  const [submissionsSnapshot, loadingSubmissions] = useCollection(
    role === 'student' && auth.currentUser
      ? query(collection(db, 'submissions'), where('studentId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'))
      : null
  );

  const exams = examsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) || [];
  const submissions = submissionsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) || [];

  return (
    <div className="min-h-screen bg-transparent" dir="rtl">
      <nav className="bg-white/40 backdrop-blur-md shadow-sm border-b border-white/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="w-6 h-6 text-blue-600 ml-2" />
              <h1 className="text-xl font-bold text-slate-900">المعيار في الاجتماعيات</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/60 shadow-sm">
                تلميذ
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {role === 'student' && (
          <div className="flex justify-center mb-10">
            <div className="bg-white/30 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm inline-flex">
              <button
                onClick={() => setActiveTab('exams')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === 'exams'
                    ? 'bg-white/70 text-blue-700 shadow-md border border-white/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                مواضيع البكالوريا
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === 'submissions'
                    ? 'bg-white/70 text-blue-700 shadow-md border border-white/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                إجاباتي المصححة
              </button>
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">مواضيع البكالوريا المتاحة</h2>
            </div>

            {loadingExams && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {errorExams && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                حدث خطأ أثناء تحميل المواضيع.
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
              {exams?.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/exam/${exam.id}`}
                  className="bg-white/40 backdrop-blur-md overflow-hidden shadow-lg rounded-2xl border border-white/60 hover:shadow-xl hover:bg-white/50 hover:border-white/80 transition-all duration-300 group relative"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-white/60 shadow-sm rounded-xl flex items-center justify-center group-hover:bg-white/80 transition-colors border border-white/50">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-600 bg-white/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/40">
                        {new Date(exam.createdAt).toLocaleDateString('ar-DZ')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{exam.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      موضوع بكالوريا - شعبة علوم تجريبية ورياضيات
                    </p>
                  </div>
                </Link>
              ))}
              {exams?.length === 0 && !loadingExams && (
                <div className="col-span-full text-center py-12 text-slate-600 bg-white/30 backdrop-blur-sm rounded-2xl border border-dashed border-white/60 shadow-sm">
                  لا توجد مواضيع متاحة حالياً.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'submissions' && role === 'student' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">إجاباتي المصححة</h2>
            </div>
            
            {loadingSubmissions && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {submissions?.map((sub) => {
                const exam = exams?.find(e => e.id === sub.examId);
                return (
                  <Link
                    key={sub.id}
                    to={`/submission/${sub.id}`}
                    className="bg-white/40 backdrop-blur-md overflow-hidden shadow-lg rounded-2xl border border-white/60 hover:shadow-xl hover:bg-white/50 hover:border-white/80 transition-all duration-300 group"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-white/60 shadow-sm rounded-xl flex items-center justify-center group-hover:bg-white/80 transition-colors border border-white/50">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-slate-600 bg-white/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/40">
                          {new Date(sub.createdAt).toLocaleDateString('ar-DZ')}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {exam?.title || 'موضوع غير معروف'}
                      </h3>
                      <p className="text-sm text-green-600 font-medium">
                        تم التصحيح الآلي
                      </p>
                    </div>
                  </Link>
                );
              })}
              {submissions?.length === 0 && !loadingSubmissions && (
                <div className="col-span-full text-center py-12 text-slate-600 bg-white/30 backdrop-blur-sm rounded-2xl border border-dashed border-white/60 shadow-sm">
                  لم تقم بتسليم أي إجابات بعد.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
