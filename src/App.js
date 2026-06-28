import React, { useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { CssBaseline, Toolbar, AppBar, Box, Container, IconButton, Tooltip, Button, Stack, useMediaQuery, ThemeProvider, createTheme, CircularProgress } from "@mui/material";
import { Home as HomeIcon, Group as GroupIcon, EventNote as EventNoteIcon, Assessment as AssessmentIcon, AttachMoney as AttachMoneyIcon, Brightness4, Brightness7, Logout as LogoutIcon } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { signOut } from "firebase/auth";

import PrivateRoute from "./PrivateRoute";
import { AuthProvider } from "./AuthContext";
import { auth } from "./FirebaseConfig";
import logo from "./pages/logoTechnoSoftware.png";
import FloatingLangButton from './FloatingLangButton';

const lazyRetry = (importer) =>
  lazy(() =>
    importer().catch((error) => {
      const isChunkError = /ChunkLoadError|Loading chunk [\s\S]* failed/i.test(String(error));
      const key = 'lazy-retry-once';

      if (isChunkError && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true');
        window.location.reload();
      }

      sessionStorage.removeItem(key);
      throw error;
    })
  );

const Perfil = lazyRetry(() => import("./pages/Perfil"));
const Ausencias = lazyRetry(() => import("./pages/Ausencias"));
const Relatorios = lazyRetry(() => import("./pages/Relatorios"));
const Colaboradores = lazyRetry(() => import("./pages/Colaboradores"));
const Despesas = lazyRetry(() => import("./pages/Despesas"));
const LoginPage = lazyRetry(() => import("./pages/Login"));

const classicFont = "'Poppins', sans-serif";
const primaryColor = "#1a237e";
const lightBlue = "#4f8cff";

const PageLoader = () => (
  <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress color="primary" />
  </Box>
);

const AppContent = () => {
  const [mode, setMode] = useState('light');
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:900px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { t } = useTranslation();

  const location = useLocation();
  const hideHeader = location.pathname === "/" || location.pathname === "/login";

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const themeConfig = createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? lightBlue : primaryColor },
      background: {
        default: mode === 'light' ? '#f8f9fa' : '#1a1a2e',
        paper: mode === 'light' ? '#ffffff' : '#16213e',
      },
    },
    typography: {
      fontFamily: classicFont,
      fontSize: 14,
      h1: { fontSize: '2rem' }, h2: { fontSize: '1.75rem' },
      h3: { fontSize: '1.5rem' }, h4: { fontSize: '1.25rem' },
      h5: { fontSize: '1.1rem' }, h6: { fontSize: '1rem' },
      body1: { fontSize: '0.875rem' }, body2: { fontSize: '0.8rem' },
    },
    components: {
      MuiAppBar: { 
        styleOverrides: { 
          root: { 
            backgroundColor: 'rgba(26, 35, 126, 0.15)', 
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(79, 140, 255, 0.2)',
            boxShadow: '0 2px 8px rgba(26, 35, 126, 0.1) !important',
            color: '#ffffff'
          } 
        } 
      },
      MuiButton: { styleOverrides: { root: { fontSize: '0.8rem', padding: '6px 16px', borderRadius: 10, textTransform: 'none', fontWeight: 700 } } },
      MuiPaper: { styleOverrides: { root: { borderRadius: 14 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 14, boxShadow: mode === 'light' ? '0 8px 26px rgba(17, 24, 39, 0.08)' : undefined } } },
      MuiTableHead: { styleOverrides: { root: { '& .MuiTableCell-root': { fontWeight: 700 } } } },
      MuiTextField: { styleOverrides: { root: { '& .MuiInputBase-input': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.875rem' } } } },
    },
  });

  const navItems = [
    { text: t('homePage'), icon: <HomeIcon fontSize="small" />, path: '/perfil' },
    { text: t('employees'), icon: <GroupIcon fontSize="small" />, path: '/colaboradores' },
    { text: t('absences'), icon: <EventNoteIcon fontSize="small" />, path: '/ausencias' },
    { text: t('reports'), icon: <AssessmentIcon fontSize="small" />, path: '/relatorios' },
    { text: t('expenses'), icon: <AttachMoneyIcon fontSize="small" />, path: '/despesas' },
  ];

  const animatedRoutes = (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.992 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? {} : { opacity: 0, y: -8, scale: 0.996 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{ willChange: 'transform, opacity' }}
        >
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
            <Route path="/ausencias" element={<PrivateRoute><Ausencias /></PrivateRoute>} />
            <Route path="/relatorios" element={<PrivateRoute><Relatorios /></PrivateRoute>} />
            <Route path="/colaboradores" element={<PrivateRoute><Colaboradores /></PrivateRoute>} />
            <Route path="/despesas" element={<PrivateRoute><Despesas /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/perfil" />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );

  return (
    <ThemeProvider theme={themeConfig}>
      <Box sx={{ minHeight: '100vh', background: themeConfig.palette.background.default }}>
        <CssBaseline />

        {!hideHeader && (
          <AppBar position="fixed" sx={{ boxShadow: themeConfig.shadows[1], borderBottom: `1px solid ${themeConfig.palette.divider}` }}>
            <Toolbar sx={{ minHeight: '60px !important', gap: 1, alignItems: 'center' }}>
              <Box component="img" src={logo} alt="Logo" sx={{ height: 26, mr: 0.5, display: 'block' }} />
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1, overflowX: 'auto', flexWrap: 'nowrap', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
                {navItems.map(({ text, icon, path }) => (
                  <Button
                    key={path}
                    component={Link}
                    to={path}
                    startIcon={isMobile ? null : icon}
                    variant={location.pathname === path ? 'contained' : 'text'}
                    size="small"
                    sx={{ 
                      whiteSpace: 'nowrap', 
                      minWidth: 'auto', 
                      px: isMobile ? 1 : 1.5, 
                      color: location.pathname === path ? '#fff' : '#fff',
                      backgroundColor: location.pathname === path ? 'rgba(79, 140, 255, 0.4)' : 'transparent',
                      '&:hover': {
                        backgroundColor: location.pathname === path ? 'rgba(79, 140, 255, 0.6)' : 'rgba(79, 140, 255, 0.2)',
                      },
                      transition: 'all 0.3s ease',
                      borderRadius: 1,
                    }}
                  >
                    {isMobile ? icon : text}
                  </Button>
                ))}
              </Stack>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', gap: 1 }}>
                <FloatingLangButton inHeader />
                <Tooltip title={mode === 'light' ? t('enableDarkTheme') : t('enableLightTheme')}>
                  <IconButton onClick={toggleColorMode} size="small" sx={{ color: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.1)', '&:hover': { backgroundColor: 'rgba(79, 140, 255, 0.3)' }, transition: 'all 0.3s ease' }}>
                    {mode === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Button color="inherit" startIcon={<LogoutIcon />} size="small" onClick={async () => { await signOut(auth); navigate('/login'); }} sx={{ color: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.1)', '&:hover': { backgroundColor: 'rgba(79, 140, 255, 0.3)' }, transition: 'all 0.3s ease' }}>
                  {!isMobile && t('logout')}
                </Button>
              </Box>
            </Toolbar>
          </AppBar>
        )}

        {hideHeader ? (
          <Box
            component="main"
            sx={{
              p: 0,
              m: 0,
              width: '100%',
              minHeight: '100dvh',
              overflowX: 'hidden',
              overflowY: 'auto',
              background: 'transparent',
            }}
          >
            {animatedRoutes}
          </Box>
        ) : (
          <Box
            component="main"
            sx={{
              p: { xs: 1.5, md: 2.5 },
              marginTop: '68px',
              overflowX: 'hidden',
              overflowY: 'auto',
              background: themeConfig.palette.background.default,
              minHeight: '100vh',
            }}
          >
            <Container maxWidth={false} sx={{ maxWidth: '1600px', px: { xs: 0.5, md: 2 } }}>
              {animatedRoutes}
            </Container>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

const App = () => (
  <AuthProvider>
    <Router>
      <AppContent />
    </Router>
  </AuthProvider>
);

export default App;
