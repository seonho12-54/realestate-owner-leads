import { Navigate, Route, Routes } from "react-router-dom";

import { SiteLayout } from "@/components/SiteLayout";
import { AdminLeadsPage } from "@/pages/AdminLeadsPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { HomePage } from "@/pages/HomePage";
import { ListingDetailPage } from "@/pages/ListingDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { MyPagePage } from "@/pages/MyPagePage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { SellDonePage } from "@/pages/SellDonePage";
import { SellPage } from "@/pages/SellPage";
import { SignupPage } from "@/pages/SignupPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/me" element={<MyPagePage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/sell/done" element={<SellDonePage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/leads" element={<AdminLeadsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/listings/:listingId" element={<ListingDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
