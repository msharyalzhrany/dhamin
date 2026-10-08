// خريطة الصفحات (الراوتر). لإضافة صفحة جديدة: أنشئ ملفها في pages/ ثم أضف سطر <Route> هنا.
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/AppLayout';
import { ScrollToTop, SiteLayout } from '@/components/layouts';
import { Spinner } from '@/components/ui/misc';

const Home = lazy(() => import('@/pages/Home'));
const Properties = lazy(() => import('@/pages/Properties'));
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'));
const Invest = lazy(() => import('@/pages/Invest'));
const Auctions = lazy(() => import('@/pages/Auctions'));
const Brand = lazy(() => import('@/pages/Brand'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Login = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Signup })));

const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const MyProperties = lazy(() => import('@/pages/app/MyProperties'));
const PropertyForm = lazy(() => import('@/pages/app/PropertyForm'));
const Messages = lazy(() => import('@/pages/app/Messages'));
const Deals = lazy(() => import('@/pages/app/Deals'));
const DealRoom = lazy(() => import('@/pages/app/DealRoom'));
const Favorites = lazy(() => import('@/pages/app/Favorites'));
const Profile = lazy(() => import('@/pages/app/Profile'));
const Support = lazy(() => import('@/pages/app/Support'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner className="size-8" /></div>}>
        <Routes>
          {/* صفحات عامة — متاحة بدون تسجيل دخول */}
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="properties" element={<Properties />} />
            <Route path="properties/:id" element={<PropertyDetail />} />
            <Route path="invest" element={<Invest />} />
            <Route path="auctions" element={<Auctions />} />
            <Route path="brand" element={<Brand />} />
          </Route>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />

          {/* لوحة المستخدم — تتطلب تسجيل دخول (وإلا تحويل لصفحة الدخول ثم العودة) */}
          <Route path="app" element={<RequireAuth />}>
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<MyProperties />} />
            <Route path="properties/new" element={<PropertyForm />} />
            <Route path="properties/:id/edit" element={<PropertyForm />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:id" element={<Messages />} />
            <Route path="deals" element={<Deals />} />
            <Route path="deals/:id" element={<DealRoom />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="profile" element={<Profile />} />
            <Route path="support" element={<Support />} />
          </Route>

          <Route path="*" element={<SiteLayout />}><Route path="*" element={<NotFound />} /></Route>
        </Routes>
      </Suspense>
    </>
  );
}
