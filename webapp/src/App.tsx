import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import AdminOverlay from "./components/admin/AdminOverlay";
import BottomNav from "./components/BottomNav";
import DynamicIsland from "./components/DynamicIsland";
import Header from "./components/Header";
import BozorlikModal from "./components/modals/BozorlikModal";
import PremiumModal from "./components/modals/PremiumModal";
import TimerModal from "./components/modals/TimerModal";
import { AppProvider, useApp } from "./context/AppContext";
import { registerBack } from "./lib/back";
import { hideBackButton } from "./lib/telegram";
import { useBackGuard } from "./lib/useBackGuard";
import HomePage from "./pages/HomePage";
import LifehacksPage from "./pages/LifehacksPage";
import ProfilePage from "./pages/ProfilePage";
import RecipesPage from "./pages/RecipesPage";

function AppContent() {
  const { activeTab, setActiveTab } = useApp();

  useBackGuard();

  useEffect(() => {
    hideBackButton();
  }, [activeTab]);

  useEffect(() => {
    return registerBack(() => {
      if (activeTab !== "home") {
        setActiveTab("home");
        return true;
      }
      return false;
    }, 10);
  }, [activeTab, setActiveTab]);

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-50">
        <Header />
        <DynamicIsland />

        <main className="flex-1 px-4 pb-32 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "home" ? <HomePage /> : null}

              {activeTab === "recipes" ? <RecipesPage /> : null}

              {activeTab === "lifehacks" ? <LifehacksPage /> : null}

              {activeTab === "profile" ? <ProfilePage /> : null}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav />

        <BozorlikModal />
        <TimerModal />
        <PremiumModal />
        <AdminOverlay />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
