import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, ArrowRight, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';

export default function SubmissionView() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!submissionId) return;
      try {
        const docRef = doc(db, 'submissions', submissionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSubmission(docSnap.data());
        } else {
          setError('التصحيح غير موجود.');
        }
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء تحميل التصحيح.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent" dir="rtl">
        <div className="text-center bg-white/40 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50">
          <p className="text-red-600 mb-4 font-medium">{error}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  let gradingData;
  try {
    gradingData = JSON.parse(submission.gradingResult);
  } catch (e) {
    console.error("Failed to parse grading result", e);
    gradingData = null;
  }

  if (!gradingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent" dir="rtl">
        <div className="text-center bg-white/40 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50">
          <p className="text-red-600 mb-4 font-medium">حدث خطأ في قراءة تقرير التصحيح.</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-6 transition-colors bg-white/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm w-fit"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للمواضيع
        </button>

        <div className="bg-white/40 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-white/60 mb-8">
          <div className="p-6 sm:p-8 bg-blue-600/80 backdrop-blur-md text-white flex items-center justify-between border-b border-blue-500/50">
            <div>
              <h1 className="text-2xl font-bold mb-2">تقرير التصحيح الآلي</h1>
              <p className="text-blue-100 text-sm">
                تمت المطابقة الحرفية مع الإجابة النموذجية المرفقة من الأستاذ
              </p>
            </div>
            <div className="text-center bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
              <span className="block text-sm text-blue-100 mb-1">العلامة الإجمالية</span>
              <span className="text-3xl font-extrabold">{gradingData.totalScore}</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 border-b border-white/40">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <Award className="w-6 h-6 text-yellow-500 ml-2" />
              التقييم العام والملاحظات
            </h2>
            
            <div className="bg-indigo-100/50 backdrop-blur-sm rounded-xl p-5 border border-indigo-200/60 mb-6 shadow-sm">
              <h3 className="text-indigo-800 font-semibold mb-2">تقييم مستوى التلميذ</h3>
              <p className="text-sm text-indigo-900 leading-relaxed">
                {gradingData.studentEvaluation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-green-100/50 backdrop-blur-sm rounded-xl p-5 border border-green-200/60 shadow-sm">
                <h3 className="text-green-800 font-semibold mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 ml-2 text-green-600" />
                  نقاط القوة
                </h3>
                <ul className="list-disc list-inside text-sm text-green-900 space-y-2 pr-2">
                  {gradingData.generalDiscussion?.strengths?.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-orange-100/50 backdrop-blur-sm rounded-xl p-5 border border-orange-200/60 shadow-sm">
                <h3 className="text-orange-800 font-semibold mb-3 flex items-center">
                  <AlertCircle className="w-5 h-5 ml-2 text-orange-600" />
                  نقاط للتحسين
                </h3>
                <ul className="list-disc list-inside text-sm text-orange-900 space-y-2 pr-2">
                  {gradingData.generalDiscussion?.areasForImprovement?.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {gradingData.keyMistakes && gradingData.keyMistakes.length > 0 && (
              <div className="bg-rose-100/50 backdrop-blur-sm rounded-xl p-5 border border-rose-200/60 mb-6 shadow-sm">
                <h3 className="text-rose-800 font-semibold mb-3 flex items-center">
                  <XCircle className="w-5 h-5 ml-2 text-rose-600" />
                  مناقشة أهم الأخطاء
                </h3>
                <ul className="list-disc list-inside text-sm text-rose-900 space-y-2 pr-2">
                  {gradingData.keyMistakes.map((mistake: string, i: number) => (
                    <li key={i}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-100/50 backdrop-blur-sm rounded-xl p-5 border border-blue-200/60 shadow-sm">
              <h3 className="text-blue-800 font-semibold mb-2">نصيحة ختامية</h3>
              <p className="text-sm text-blue-900 leading-relaxed">
                {gradingData.generalDiscussion?.finalAdvice}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-white/40 pb-4">
              المناقشة التفصيلية (سؤال بسؤال)
            </h2>
            
            <div className="space-y-8">
              {gradingData.detailedFeedback?.map((item: any, index: number) => (
                <div key={index} className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-white/50 relative shadow-sm">
                  <div className="absolute top-4 left-4 bg-white/60 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold text-slate-800 shadow-sm border border-white/60">
                    {item.score} نقطة
                  </div>
                  
                  <h3 className="font-semibold text-slate-900 mb-4 pl-16">
                    {item.question}
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-white/60 shadow-sm">
                      <span className="block text-xs font-medium text-slate-600 mb-2">إجابتك:</span>
                      <p className="text-sm text-slate-900 whitespace-pre-wrap">{item.studentAnswer}</p>
                    </div>
                    <div className="bg-blue-100/40 backdrop-blur-sm p-4 rounded-lg border border-blue-200/50 shadow-sm">
                      <span className="block text-xs font-medium text-blue-700 mb-2">الإجابة النموذجية:</span>
                      <p className="text-sm text-slate-900 whitespace-pre-wrap">{item.modelAnswer}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-white/60 flex items-start shadow-sm">
                    {item.score > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-500 ml-3 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 ml-3 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="block text-xs font-medium text-slate-500 mb-1">ملاحظات المصحح:</span>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.feedback}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
