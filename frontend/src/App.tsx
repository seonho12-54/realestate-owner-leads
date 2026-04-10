import { Navigate, Route, Routes } from "react-router-dom";

import { SiteLayout } from "@/components/SiteLayout";
import { AdminLeadsPage } from "@/pages/AdminLeadsPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { HomePage } from "@/pages/HomePage";
import { ListingDetailPage } from "@/pages/ListingDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { ManagePage } from "@/pages/ManagePage";
import { MyPagePage } from "@/pages/MyPagePage";
import { MyProfileEditPage } from "@/pages/MyProfileEditPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { SavedPage } from "@/pages/SavedPage";
import { SellPage } from "@/pages/SellPage";
import { SignupPage } from "@/pages/SignupPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/me" element={<MyPagePage />} />
        <Route path="/me/profile" element={<MyProfileEditPage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/sell/done" element={<Navigate to="/sell" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/leads" element={<AdminLeadsPage />} />
        <Route path="/admin/leads/:statusFilter" element={<AdminLeadsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/listings/:listingId" element={<ListingDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
