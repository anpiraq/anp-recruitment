import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ClerkProvider, useAuth, useClerk, useSignIn } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { dark } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Check, CheckCircle2, Clock3, FileText, LockKeyhole, LogOut,
  ShieldCheck, UserRoundPlus, XCircle,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  getGetCurrentAdminQueryKey, getListApplicationsQueryKey, useCreateApplication, useGetCurrentAdmin,
  useListApplications, usePromoteApplicationToManager, useUpdateApplicationStatus,
} from '@workspace/api-client-react';
import type { Application, ApplicationInput, ApplicationStatus } from '@workspace/api-client-react';

const governorates = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف الأشرف', 'كربلاء المقدسة',
  'ذي قار', 'بابل', 'الأنبار', 'ديالى', 'القادسية', 'ميسان', 'واسط',
  'صلاح الدين', 'المثنى', 'كركوك', 'السليمانية', 'دهوك',
];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const ADMIN_SIGN_IN_EMAIL = 'anp.iraq@gmail.com';
const ADMIN_SIGN_IN_DENIED = 'تم حظر تسجيل الدخول. أنت غير مخوّل لاستخدام بوابة الإدارة.';
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance = {
  theme: dark,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d92525',
    colorForeground: '#f0f2f5',
    colorMutedForeground: '#9ba3af',
    colorDanger: '#f06a6a',
    colorBackground: '#181b20',
    colorInput: '#22262e',
    colorInputForeground: '#f0f2f5',
    colorNeutral: '#2e3440',
    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    borderRadius: '0.55rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#181b20] rounded-xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#f0f2f5] font-bold',
    headerSubtitle: 'text-[#9ba3af]',
    socialButtonsBlockButtonText: 'text-[#f0f2f5] font-semibold',
    formFieldLabel: 'text-[#f0f2f5] font-semibold',
    footerActionLink: 'text-[#e5a93c] font-semibold',
    footerActionText: 'text-[#9ba3af]',
    dividerText: 'text-[#9ba3af]',
    identityPreviewEditButton: 'text-[#e5a93c]',
    formFieldSuccessText: 'text-[#8bc6a0]',
    alertText: 'text-[#f18484]',
    logoBox: 'mb-3',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-[#2e3440] bg-[#22262e]',
    formButtonPrimary: 'bg-[#d92525] hover:bg-[#b91f1f] text-[#f0f2f5]',
    formFieldInput: 'border-[#2e3440] bg-[#22262e] text-[#f0f2f5]',
    footerAction: 'border-t border-[#2e3440]',
    dividerLine: 'bg-[#2e3440]',
    alert: 'bg-[#382326]',
    otpCodeFieldInput: 'border-[#2e3440] bg-[#22262e] text-[#f0f2f5]',
    formFieldRow: 'text-[#f0f2f5]',
    main: 'text-[#f0f2f5]',
  },
};

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" dir="rtl">
      <span className="brand-mini" aria-hidden="true">ANP</span>
      <span>
        <strong>حزب الهوية القومية البديل</strong>
        {!compact && <small>إدارة طلبات الانضمام</small>}
      </span>
    </div>
  );
}

function PublicForm() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const createApplication = useCreateApplication();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [managerMode, setManagerMode] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const phoneValue = String(values.get('phone') ?? '').trim();
    const application: ApplicationInput = {
      fullName: String(values.get('fullName') ?? '').trim(),
      age: Number(values.get('age')),
      governorate: String(values.get('governorate') ?? ''),
      socialContact: String(values.get('socialContact') ?? '').trim(),
      phone: phoneValue || null,
      contribution: String(values.get('contribution') ?? '').trim(),
    };
    setError('');
    createApplication.mutate({ data: application }, {
      onSuccess: () => {
        setSubmitted(true);
        form.reset();
      },
      onError: () => setError('تعذر إرسال الطلب الآن. يرجى المحاولة مرة أخرى.'),
    });
  }

  return (
    <main className="public-shell" dir="rtl" lang="ar">
      <header className="masthead">
        <div className="masthead-rule" aria-hidden="true" />
        <div className="party-mark" aria-label="ANP">ANP</div>
        <h1>حزب الهوية القومية البديل ANP</h1>
        <p className="subheading">استمارة التطوع والتجنيد التنظيمي</p>
      </header>
      <div className={`manager-entry${managerMode ? ' is-open' : ''}`} dir="rtl">
        <label className="manager-toggle">
          <input type="checkbox" checked={managerMode} onChange={(event) => setManagerMode(event.target.checked)} data-testid="toggle-manager-sign-in" />
          <span className="toggle-track" aria-hidden="true"><span /></span>
          <span>هل أنت مدير؟</span>
        </label>
        {managerMode && (
          <Link
            className="manager-link"
            href={authLoaded && isSignedIn ? '/admin' : '/sign-in'}
            data-testid="link-manager-sign-in"
          >
            {authLoaded && isSignedIn ? 'فتح لوحة الإدارة' : 'تسجيل الدخول للإدارة'} <ArrowLeft size={15} />
          </Link>
        )}
      </div>
      <section className="form-card" aria-labelledby="form-heading">
        {!submitted ? (
          <>
            <div className="section-heading">
              <h2 id="form-heading">معلومات المتقدم</h2>
              <span>الحقول المطلوبة مميزة بعلامة *</span>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field span-2">
                  <label htmlFor="applicant-name">الاسم الثلاثي <span className="required-mark" aria-hidden="true">*</span></label>
                  <input id="applicant-name" name="fullName" autoComplete="name" required minLength={2} maxLength={120} placeholder="أدخل اسمك الكامل" data-testid="input-applicant-name" />
                </div>
                <div className="field">
                  <label htmlFor="applicant-age">العمر <span className="required-mark" aria-hidden="true">*</span></label>
                  <input id="applicant-age" name="age" type="number" min={14} max={70} step={1} required inputMode="numeric" placeholder="مثال: 20" aria-describedby="age-hint" data-testid="input-applicant-age" />
                  <p className="hint" id="age-hint">يشترط أن يكون العمر بين 14 و70 سنة.</p>
                </div>
                <div className="field">
                  <label htmlFor="applicant-governorate">المحافظة <span className="required-mark" aria-hidden="true">*</span></label>
                  <select id="applicant-governorate" name="governorate" required defaultValue="" data-testid="select-applicant-governorate">
                    <option value="" disabled>اختر المحافظة</option>
                    {governorates.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
                  </select>
                </div>
                <div className="field span-2">
                  <label htmlFor="applicant-social-contact">معرّف تليجرام أو حساب التواصل <span className="required-mark" aria-hidden="true">*</span></label>
                  <input id="applicant-social-contact" name="socialContact" required minLength={2} maxLength={160} placeholder="@username أو رابط حسابك" data-testid="input-social-contact" />
                </div>
                <div className="field">
                  <label htmlFor="applicant-phone">رقم الهاتف <span className="optional">اختياري</span></label>
                  <input id="applicant-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} placeholder="07XXXXXXXXX" data-testid="input-applicant-phone" />
                </div>
                <div className="field span-2">
                  <label htmlFor="applicant-contribution">كيف يمكنك دعم الحراك والمشروع؟ <span className="required-mark" aria-hidden="true">*</span></label>
                  <textarea id="applicant-contribution" name="contribution" required minLength={2} maxLength={1200} placeholder="نشر وإعلام، تنظيم ميداني، تصميم، إلخ..." data-testid="input-applicant-contribution" />
                </div>
              </div>
              <aside className="privacy-note" role="note" data-testid="notice-privacy">
                <span className="privacy-symbol" aria-hidden="true" />
                <div>معلوماتكم سرية، ويطّلع عليها فقط أعضاء الإدارة المخوّلون.</div>
              </aside>
              {error && <p className="dialog-error" role="alert" data-testid="status-submit-error">{error}</p>}
              <div className="submit-row">
                <button className="submit-button" type="submit" disabled={createApplication.isPending} data-testid="button-submit-application">
                  {createApplication.isPending ? 'جارٍ إرسال الطلب…' : 'إرسال الطلب'}
                </button>
                <span className="form-footnote">تُراجع الطلبات من قبل أعضاء الإدارة المخوّلين.</span>
              </div>
            </form>
          </>
        ) : (
          <div className="success-panel" role="status" aria-live="polite" data-testid="status-submission-success">
            <div className="success-mark"><Check size={25} aria-hidden="true" /></div>
            <h2>وصلنا طلبك</h2>
            <p>شكراً لاهتمامك بالمساهمة. سيتولى أعضاء الإدارة المخوّلون مراجعة معلوماتك.</p>
            <button className="secondary-button" type="button" onClick={() => { setSubmitted(false); setError(''); }} data-testid="button-new-application">إرسال طلب آخر</button>
          </div>
        )}
      </section>
      <footer className="page-end">حزب الهوية القومية البديل · ANP</footer>
    </main>
  );
}

function SignInPage() {
  const { signIn } = useSignIn();
  const { isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== ADMIN_SIGN_IN_EMAIL) {
      setError(ADMIN_SIGN_IN_DENIED);
      setPassword('');
      return;
    }
    if (!isLoaded) {
      setError('بوابة الإدارة غير متاحة الآن. حاول مرة أخرى.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: signInError } = await signIn.password({
        emailAddress: normalizedEmail,
        password,
      });
      if (signInError || signIn.status !== 'complete') {
        setError(ADMIN_SIGN_IN_DENIED);
        setPassword('');
        return;
      }

      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl(`${basePath}/admin`);
          if (url.startsWith('http')) {
            window.location.assign(url);
            return;
          }
          setLocation(stripBase(url));
        },
      });
    } catch {
      setError(ADMIN_SIGN_IN_DENIED);
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="sign-page" dir="rtl" lang="ar">
      <aside className="sign-aside">
        <Brand />
        <div>
          <h1>مساحة الإدارة،<br />بمسؤولية مشتركة.</h1>
          <p>تسجيل الدخول مخصص لحساب الإدارة المخوّل لمراجعة طلبات الانضمام.</p>
        </div>
        <span className="page-end" style={{ color: '#e3cfc4', textAlign: 'right' }}>ANP · إدارة طلبات الانضمام</span>
      </aside>
      <main className="sign-main">
        <div className="sign-main-inner">
          <p className="auth-overline">بوابة الإدارة</p>
          <form className="admin-auth-form" onSubmit={submitSignIn} noValidate={false}>
            <div className="field">
              <label htmlFor="admin-email">البريد الإلكتروني</label>
              <input id="admin-email" name="email" type="email" dir="ltr" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="أدخل بريدك الإلكتروني" data-testid="input-admin-email" />
            </div>
            <div className="field">
              <label htmlFor="admin-password">كلمة المرور</label>
              <input id="admin-password" name="password" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="أدخل كلمة المرور" data-testid="input-admin-password" />
            </div>
            {error && <p className="admin-auth-error" role="alert" data-testid="status-admin-sign-in-error">{error}</p>}
            <button className="submit-button" type="submit" disabled={!isLoaded || isSubmitting} data-testid="button-admin-sign-in">
              {isSubmitting ? 'جارٍ التحقق…' : 'تسجيل الدخول'}
            </button>
          </form>
          <Link className="sign-back" href="/"><ArrowLeft size={15} /> العودة إلى استمارة الانضمام</Link>
        </div>
      </main>
    </div>
  );
}

function statusLabel(status: ApplicationStatus) {
  if (status === 'accepted') return 'مقبول';
  if (status === 'rejected') return 'مرفوض';
  return 'قيد المراجعة';
}

function formattedDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium' }).format(parsed);
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: number; response?: { status?: number }; statusCode?: number };
  return candidate.status ?? candidate.response?.status ?? candidate.statusCode;
}

function LoadingDashboard() {
  return (
    <div className="dashboard-grid" aria-label="جارٍ تحميل الطلبات" data-testid="status-admin-loading">
      <section className="queue-panel"><div className="panel-heading"><h2>طلبات الانضمام</h2></div><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></section>
      <section className="detail-panel"><div className="panel-heading"><h2>تفاصيل الطلب</h2></div><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></section>
    </div>
  );
}

function AdminDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const adminQuery = useGetCurrentAdmin({
    query: {
      enabled: isLoaded && Boolean(isSignedIn),
      queryKey: getGetCurrentAdminQueryKey(),
    },
  });
  const admin = adminQuery.data;
  const allowed = Boolean(admin && (admin.role === 'primary' || admin.role === 'manager'));
  const pendingQuery = useListApplications({ status: 'pending' }, {
    query: { enabled: allowed, queryKey: getListApplicationsQueryKey({ status: 'pending' }) },
  });
  const acceptedQuery = useListApplications({ status: 'accepted' }, {
    query: { enabled: allowed, queryKey: getListApplicationsQueryKey({ status: 'accepted' }) },
  });
  const rejectedQuery = useListApplications({ status: 'rejected' }, {
    query: { enabled: allowed, queryKey: getListApplicationsQueryKey({ status: 'rejected' }) },
  });
  const [activeQueue, setActiveQueue] = useState<ApplicationStatus>('pending');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [managerEmail, setManagerEmail] = useState('');
  const [mutationError, setMutationError] = useState('');
  const queryClient = useQueryClient();
  const updateStatus = useUpdateApplicationStatus();
  const promoteManager = usePromoteApplicationToManager();
  const currentList = activeQueue === 'pending'
    ? pendingQuery.data?.applications ?? []
    : activeQueue === 'accepted'
      ? acceptedQuery.data?.applications ?? []
      : rejectedQuery.data?.applications ?? [];
  const allApplications = [
    ...(pendingQuery.data?.applications ?? []),
    ...(acceptedQuery.data?.applications ?? []),
    ...(rejectedQuery.data?.applications ?? []),
  ];
  const selected = allApplications.find((application) => application.id === selectedId) ?? null;
  const listIsLoading = allowed && (
    pendingQuery.isLoading || acceptedQuery.isLoading || rejectedQuery.isLoading
  );
  const listError = [pendingQuery.error, acceptedQuery.error, rejectedQuery.error].find(Boolean);
  const adminErrorCode = errorStatus(adminQuery.error);

  useEffect(() => {
    if (currentList.length > 0 && !currentList.some((application) => application.id === selectedId)) {
      setSelectedId(currentList[0].id);
    }
    if (currentList.length === 0 && activeQueue !== 'pending') setSelectedId(null);
  }, [activeQueue, currentList, selectedId]);

  function refreshQueues() {
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === '/api/applications',
    });
  }

  function changeStatus(application: Application, status: ApplicationStatus) {
    setMutationError('');
    updateStatus.mutate({ id: application.id, data: { status } }, {
      onSuccess: () => {
        refreshQueues();
        setActiveQueue(status);
      },
      onError: (error) => setMutationError(errorStatus(error) === 403 ? 'ليس لديك صلاحية تنفيذ هذا الإجراء.' : 'تعذر تحديث حالة الطلب. يرجى المحاولة مجدداً.'),
    });
  }

  function submitPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !managerEmail.trim()) return;
    setMutationError('');
    promoteManager.mutate({ id: selected.id, data: { email: managerEmail.trim() } }, {
      onSuccess: () => {
        setPromoteOpen(false);
        setManagerEmail('');
        refreshQueues();
      },
      onError: (error) => setMutationError(errorStatus(error) === 403 ? 'ليس لديك صلاحية تعيين مدير.' : 'تعذر تعيين المدير. يرجى التحقق من البريد الإلكتروني والمحاولة مجدداً.'),
    });
  }

  if (!isLoaded || (isSignedIn && adminQuery.isLoading)) {
    return <main className="admin-layout" dir="rtl"><LoadingDashboard /></main>;
  }
  if (!isSignedIn) {
    return (
      <main className="state-card" dir="rtl" data-testid="state-admin-sign-in">
        <div className="detail-empty-mark"><LockKeyhole size={21} /></div>
        <h2>تسجيل الدخول مطلوب</h2>
        <p>سجّل الدخول بحساب الإدارة المخوّل للمتابعة.</p>
        <Link className="primary-button" href="/sign-in">الانتقال إلى تسجيل الدخول</Link>
      </main>
    );
  }
  if (adminErrorCode === 401 || adminErrorCode ===  unauthenticatedCode) {
    return (
      <main className="state-card" dir="rtl" data-testid="state-admin-sign-in">
        <div className="detail-empty-mark"><LockKeyhole size={21} /></div>
        <h2>تسجيل الدخول مطلوب</h2>
        <p>سجّل الدخول بحساب الإدارة المخوّل للمتابعة.</p>
        <Link className="primary-button" href="/sign-in">الانتقال إلى تسجيل الدخول</Link>
      </main>
    );
  }
  if (adminErrorCode === 403) {
    return (
      <main className="state-card" dir="rtl" data-testid="state-admin-denied">
        <div className="detail-empty-mark"><ShieldCheck size={22} /></div>
        <h2>الوصول غير متاح</h2>
        <p>{ADMIN_SIGN_IN_DENIED}</p>
        <Link className="secondary-button" href="/">العودة إلى الاستمارة</Link>
      </main>
    );
  }
  if (adminQuery.isError || !admin) {
    return (
      <main className="state-card" dir="rtl" data-testid="state-admin-error">
        <h2>تعذر تحميل صلاحية الحساب</h2>
        <p>لم نتمكن من التحقق من صلاحية الوصول حالياً.</p>
        <button className="primary-button" type="button" onClick={() => void adminQuery.refetch()}>إعادة المحاولة</button>
      </main>
    );
  }

  const counts = {
    pending: pendingQuery.data?.applications.length ?? 0,
    accepted: acceptedQuery.data?.applications.length ?? 0,
    rejected: rejectedQuery.data?.applications.length ?? 0,
  };
  const displayedErrorCode = errorStatus(listError);

  return (
    <div className="admin-page" dir="rtl" lang="ar">
      <header className="admin-topbar">
        <Link href="/" className="brand-lockup"><span className="brand-mini" aria-hidden="true">ANP</span><span><strong>حزب الهوية القومية البديل</strong><small>إدارة طلبات الانضمام</small></span></Link>
        <div className="topbar-right">
          <span className="role-pill"><span className="role-dot" />{admin.role === 'primary' ? 'الإدارة الرئيسية' : 'مدير مراجعة'}</span>
          <span>{admin.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="admin-layout">
        <div className="admin-title-row">
          <div><span className="admin-kicker">لوحة الإدارة</span><h1>طلبات الانضمام</h1><p>مراجعة الطلبات ومتابعة حالتها.</p></div>
          <div className="summary-count" data-testid="text-application-count"><strong>{counts.pending + counts.accepted + counts.rejected}</strong>إجمالي الطلبات</div>
        </div>
        {displayedErrorCode === 403 ? (
          <div className="state-card" role="alert" data-testid="state-list-denied"><h2>الوصول غير متاح</h2><p>ليس لهذا الحساب صلاحية عرض الطلبات.</p></div>
        ) : displayedErrorCode === 401 ? (
          <div className="state-card" role="alert" data-testid="state-list-sign-in"><h2>انتهت جلسة الدخول</h2><p>يرجى تسجيل الدخول مجدداً للوصول إلى الطلبات.</p><Link className="primary-button" href="/sign-in">تسجيل الدخول</Link></div>
        ) : listError ? (
          <div className="state-card" role="alert"><h2>تعذر تحميل الطلبات</h2><p>تحقق من الاتصال ثم حاول مجدداً.</p><button className="primary-button" type="button" onClick={() => refreshQueues()}>إعادة المحاولة</button></div>
        ) : listIsLoading ? <LoadingDashboard /> : (
          <>
            <nav className="queue-tabs" aria-label="قوائم الطلبات">
              {(['pending', 'accepted', 'rejected'] as const).map((status) => (
                <button key={status} type="button" className={`queue-tab${activeQueue === status ? ' active' : ''}`} onClick={() => setActiveQueue(status)} aria-pressed={activeQueue === status} data-testid={`tab-queue-${status}`}>
                  {status === 'pending' ? 'قيد المراجعة' : status === 'accepted' ? 'مقبولة' : 'مرفوضة'}<span className="count-badge">{counts[status]}</span>
                </button>
              ))}
            </nav>
            <div className="dashboard-grid">
              <section className="queue-panel" aria-label="قائمة الطلبات">
                <div className="panel-heading"><h2>{activeQueue === 'pending' ? 'طلبات قيد المراجعة' : activeQueue === 'accepted' ? 'الطلبات المقبولة' : 'الطلبات المرفوضة'}</h2><span>{currentList.length} طلب</span></div>
                {currentList.length === 0 ? (
                  <div className="detail-empty" data-testid={`empty-queue-${activeQueue}`}>
                    <div className="detail-empty-mark"><FileText size={20} /></div><h3>لا توجد طلبات هنا</h3><p>ستظهر الطلبات في هذه القائمة عند ورودها أو تحديث حالتها.</p>
                  </div>
                ) : (
                  <div className="application-list">
                    {currentList.map((application) => (
                      <button type="button" key={application.id} className={`application-row${selectedId === application.id ? ' selected' : ''}`} onClick={() => setSelectedId(application.id)} data-testid={`row-application-${application.id}`}>
                        <span><span className="applicant-name">{application.fullName}</span><span className="applicant-meta">{application.governorate} · {application.age} سنة</span></span>
                        <span className="application-date">{formattedDate(application.createdAt)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <section className="detail-panel" aria-label="تفاصيل الطلب">
                <div className="panel-heading"><h2>تفاصيل الطلب</h2>{selected && <span className={`status-chip status-${selected.status}`}>{statusLabel(selected.status)}</span>}</div>
                {!selected ? (
                  <div className="detail-empty"><div className="detail-empty-mark"><FileText size={20} /></div><h3>اختر طلباً لمراجعته</h3><p>تفاصيل الطلب ومهام المراجعة ستظهر هنا.</p></div>
                ) : (
                  <div className="detail-content">
                    <div className="detail-title"><div><h2>{selected.fullName}</h2><p>طلب رقم {selected.id} · {formattedDate(selected.createdAt)}</p></div></div>
                    <dl className="details-grid">
                      <div className="detail-item"><dt>العمر</dt><dd>{selected.age} سنة</dd></div>
                      <div className="detail-item"><dt>المحافظة</dt><dd>{selected.governorate}</dd></div>
                      <div className="detail-item"><dt>معرّف تليجرام أو حساب التواصل</dt><dd dir="auto">{selected.socialContact}</dd></div>
                      <div className="detail-item"><dt>رقم الهاتف</dt><dd dir="auto">{selected.phone || 'لم يذكر'}</dd></div>
                      <div className="detail-item wide"><dt>مجالات المساهمة</dt><dd>{selected.contribution}</dd></div>
                    </dl>
                    {mutationError && <p className="dialog-error" role="alert" data-testid="status-review-error">{mutationError}</p>}
                    <div className="detail-actions">
                      {selected.status !== 'accepted' && <button className="action-button accept" type="button" disabled={updateStatus.isPending} onClick={() => changeStatus(selected, 'accepted')} data-testid="button-accept-application"><CheckCircle2 size={16} /> قبول الطلب</button>}
                      {selected.status !== 'rejected' && <button className="action-button reject" type="button" disabled={updateStatus.isPending} onClick={() => changeStatus(selected, 'rejected')} data-testid="button-reject-application"><XCircle size={16} /> رفض الطلب</button>}
                      {selected.status !== 'pending' && <button className="action-button" type="button" disabled={updateStatus.isPending} onClick={() => changeStatus(selected, 'pending')} data-testid="button-return-pending"><Clock3 size={16} /> إعادة للمراجعة</button>}
                      {selected.status === 'accepted' && admin.role === 'primary' && !selected.managerEmail && (
                        <button className="action-button manager" type="button" onClick={() => { setManagerEmail(''); setPromoteOpen(true); }} data-testid="button-promote-manager"><UserRoundPlus size={16} /> تعيين مدير</button>
                      )}
                    </div>
                    {selected.managerEmail && <div className="manager-note"><strong>تم تعيين مدير لهذا الطلب</strong><br /><span dir="ltr">{selected.managerEmail}</span></div>}
                    {selected.reviewedAt && <p className="review-info">آخر مراجعة: {formattedDate(selected.reviewedAt)}{selected.reviewedBy ? ` · بواسطة ${selected.reviewedBy}` : ''}</p>}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      {promoteOpen && selected && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPromoteOpen(false); }}>
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="promote-heading" dir="rtl">
            <h2 id="promote-heading">تعيين مدير لهذا الطلب</h2>
            <p>سيُمنح البريد الإلكتروني المدخل صلاحية مدير لمراجعة الطلبات. لا يمكن إلا للإدارة الرئيسية تنفيذ هذا الإجراء.</p>
            <form onSubmit={submitPromotion}>
              <label htmlFor="manager-email">البريد الإلكتروني للمدير</label>
              <input id="manager-email" type="email" autoComplete="email" required value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} placeholder="name@example.com" data-testid="input-manager-email" />
              <div className="dialog-actions">
                <button className="primary-button" type="submit" disabled={promoteManager.isPending} data-testid="button-confirm-promote">{promoteManager.isPending ? 'جارٍ التعيين…' : 'تأكيد التعيين'}</button>
                <button className="secondary-button" type="button" onClick={() => setPromoteOpen(false)} data-testid="button-cancel-promote">إلغاء</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

const unauthenticatedCode = 401;

function LogoutButton() {
  const { signOut } = useClerk();
  return <button className="text-button" type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-admin-logout"><LogOut size={15} /> خروج</button>;
}

function NotFound() {
  return <main className="not-found" dir="rtl"><div><h1>404</h1><p>هذه الصفحة غير موجودة.</p><Link className="secondary-button" href="/">العودة إلى الاستمارة</Link></div></main>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={PublicForm} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      localization={arSA}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Routes />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  if (!clerkPubKey) return <div className="state-card" dir="rtl"><h2>بوابة الإدارة غير مهيأة</h2><p>تعذر تحميل واجهة تسجيل الدخول.</p></div>;
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
