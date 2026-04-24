import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Loader2, Upload, ArrowRight, CheckCircle2, X, Camera } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function ExamView({ role }: { role: 'teacher' | 'student' | null }) {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      try {
        const docRef = doc(db, 'exams', examId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setExam(docSnap.data());
        } else {
          setError('الموضوع غير موجود.');
        }
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء تحميل الموضوع.');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !examId) {
      setError('يرجى اختيار صورة واحدة على الأقل للحل.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const base64Promises = files.map(fileToBase64);
      const base64Datas = await Promise.all(base64Promises);
      
      const imageParts = base64Datas.map((data, index) => ({
        inlineData: {
          mimeType: files[index].type,
          data: data
        }
      }));

      // Use Gemini to grade the submission
      const prompt = `
        أنت مصحح آلي صارم وعملي لامتحانات البكالوريا الجزائرية (شعبة علوم تجريبية ورياضيات).
        مهمتك هي تصحيح إجابة التلميذ المكتوبة بخط اليد (المرفقة في عدة صور) بناءً على "الإجابة النموذجية" المرفقة حصراً.
        
        الإجابة النموذجية (المرجع الوحيد للتصحيح):
        ${exam.answersText}
        
        الخطوة 1: تحليل كامل للملف (Analyse complète du fichier)
        قم أولاً بقراءة وتحليل جميع الصور المرفقة بدقة لاستخراج إجابة التلميذ كاملة قبل البدء في التصحيح.
        
        الخطوة 2: التصحيح والتقييم
        المعايير:
        1. التصحيح العملي: قارن إجابة التلميذ مع الإجابة النموذجية بدقة.
        2. التنقيط: امنح العلامة بناءً على سلم التنقيط الملحق بكل سؤال.
        3. مناقشة أهم الأخطاء: حدد الأخطاء المفاهيمية أو المنهجية التي وقع فيها التلميذ واشرحها.
        4. تقييم التلميذ: قدم تقييماً شاملاً لمستوى التلميذ ونقاط ضعفه وقوته.
        
        أريد النتيجة بصيغة JSON تحتوي على:
        - "totalScore": العلامة الإجمالية (رقم).
        - "detailedFeedback": مصفوفة من الكائنات، كل كائن يمثل سؤالاً ويحتوي على "question", "studentAnswer" (ما فهمته من خطه بعد التحليل الكامل), "modelAnswer", "score", "feedback".
        - "keyMistakes": مصفوفة نصوص تشرح أهم الأخطاء التي وقع فيها التلميذ.
        - "studentEvaluation": نص يقيم مستوى التلميذ بشكل عام.
        - "generalDiscussion": كائن يحتوي على "strengths" (مصفوفة نصوص), "areasForImprovement" (مصفوفة نصوص), "finalAdvice" (نص).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...imageParts
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 4000
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error('Failed to grade submission.');
      
      // We don't parse it here, we just save the JSON string
      const submissionRef = doc(collection(db, 'submissions'));
      await setDoc(submissionRef, {
        id: submissionRef.id,
        examId: examId,
        studentId: auth.currentUser?.uid,
        gradingResult: resultText,
        status: 'graded',
        createdAt: new Date().toISOString()
      });

      navigate(`/submission/${submissionRef.id}`);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تصحيح الإجابة. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !exam) {
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
          <div className="p-6 sm:p-8 border-b border-white/40 bg-white/30">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{exam.title}</h1>
            <p className="text-sm text-slate-500">
              نص الأسئلة الحرفي المستخرج من الملف المرجعي
            </p>
          </div>
          <div className="p-6 sm:p-8 prose prose-slate max-w-none rtl:prose-invert">
            <pre className="whitespace-pre-wrap font-sans text-slate-800 bg-transparent p-0 m-0 text-base leading-relaxed">
              {exam.questionsText}
            </pre>
          </div>
        </div>

        {role === 'student' && (
          <div className="bg-white/40 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-white/60">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">تسليم الحل للتصحيح</h2>
              <p className="text-slate-700 mb-6 text-sm">
                قم بحل الموضوع يدوياً على ورقتك الخاصة، ثم التقط صورة واضحة للحل وارفعها هنا ليتم تصحيحها آلياً وفق الإجابة النموذجية.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-white/60 border-dashed rounded-xl hover:border-blue-400 transition-colors bg-white/30 backdrop-blur-sm">
                  <div className="space-y-4 text-center w-full">
                    <div className="flex justify-center gap-4">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white/60 backdrop-blur-sm rounded-xl font-medium text-blue-700 hover:bg-white/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-4 py-3 shadow-sm border border-white/50 flex items-center gap-2 transition-all"
                      >
                        <Upload className="w-5 h-5" />
                        <span>اختر صور الحل</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                        />
                      </label>
                      
                      <label
                        htmlFor="camera-upload"
                        className="relative cursor-pointer bg-blue-600/80 backdrop-blur-md rounded-xl font-medium text-white hover:bg-blue-600/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-4 py-3 shadow-sm flex items-center gap-2 transition-all border border-blue-500/50"
                      >
                        <Camera className="w-5 h-5" />
                        <span>التقط صورة</span>
                        <input
                          id="camera-upload"
                          name="camera-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">يمكنك اختيار أو التقاط عدة صور (PNG, JPG)</p>
                    
                    {files.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {files.map((f, index) => (
                          <div key={index} className="relative group bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-white/60 shadow-sm flex items-center justify-between">
                            <span className="text-sm text-slate-700 truncate pr-2">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 p-1 bg-white/60 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3 px-4 border border-blue-500/50 rounded-xl shadow-lg text-sm font-medium text-white bg-blue-600/80 backdrop-blur-md hover:bg-blue-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري التصحيح والمطابقة...
                    </>
                  ) : (
                    'إرسال للتصحيح'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
