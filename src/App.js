import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { Drawer, List, ListItem, ListItemIcon, ListItemText, CssBaseline, Toolbar, Box, Container, IconButton, Tooltip, useTheme, useMediaQuery, ThemeProvider, createTheme, CircularProgress } from "@mui/material";
import { Menu as MenuIcon, Home as HomeIcon, Group as GroupIcon, EventNote as EventNoteIcon, Assessment as AssessmentIcon, AttachMoney as AttachMoneyIcon, Brightness4, Brightness7, Logout as LogoutIcon } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { signOut } from "firebase/auth";

import PrivateRoute from "./PrivateRoute";
import { AuthProvider } from "./AuthContext";
import { auth } from "./FirebaseConfig";
import logo from "./pages/logoTechnoSoftware.png";
import FloatingLangButton from './FloatingLangButton';

const Perfil = lazy(() => import("./pages/Perfil"));
const Ausencias = lazy(() => import("./pages/Ausencias"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Colaboradores = lazy(() => import("./pages/Colaboradores"));
const Despesas = lazy(() => import("./pages/Despesas"));
const LoginPage = lazy(() => import("./pages/Login"));

const drawerWidth = 240;
const collapsedWidth = 70;
const classicFont = "'Poppins', sans-serif";
const primaryColor = "#1a237e";
const lightBlue = "#4f8cff";

const PageLoader = () => (
  <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress color="primary" />
  </Box>
);

const Sidebar = ({ open, toggleDrawer, onLogout, mode, onToggleColorMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();

  const menuItems = [
    { text: t('homePage'), icon: <HomeIcon />, path: '/perfil' },
    { text: t('employees'), icon: <GroupIcon />, path: '/colaboradores' },
    { text: t('absences'), icon: <EventNoteIcon />, path: '/ausencias' },
    { text: t('reports'), icon: <AssessmentIcon />, path: '/relatorios' },
    { text: t('expenses'), icon: <AttachMoneyIcon />, path: '/despesas' },
  ];

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={open}
      onClose={toggleDrawer}
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: open ? drawerWidth : collapsedWidth,
          transition: 'all 0.25s ease-in-out',
          boxSizing: 'border-box',
          height: '100vh',
          background: theme.palette.background.default,
          borderRight: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
          overflowX: 'hidden',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          minHeight: '60px !important',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {open && <Box component="img" src={logo} alt="Logo" sx={{ height: 24 }} />}
        <IconButton onClick={toggleDrawer} sx={{ color: theme.palette.primary.main }}>
          <MenuIcon />
        </IconButton>
      </Toolbar>

      <Box sx={{ px: 1.2, py: 1, display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', gap: 0.8 }}>
        <FloatingLangButton inHeader />
        <Tooltip title={mode === 'light' ? t('enableDarkTheme') : t('enableLightTheme')}>
          <IconButton
            onClick={onToggleColorMode}
            size="small"
            sx={{
              color: theme.palette.primary.main,
              backgroundColor: theme.palette.action.hover,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            {mode === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <List sx={{ px: 1.2 }}>
        {menuItems.map(({ text, icon, path }) => (
          <ListItem
            key={path}
            button
            component={Link}
            to={path}
            sx={{
              my: 0.5,
              borderRadius: 2,
              minHeight: 42,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.primary.main, minWidth: 36 }}>
              {icon}
            </ListItemIcon>
            {open && (
              <ListItemText
                primary={text}
                sx={{
                  '& .MuiTypography-root': {
                    fontWeight: 500,
                    fontSize: '0.85rem',
                  },
                }}
              />
            )}
          </ListItem>
        ))}
      </List>

      <List sx={{ px: 1.2, mt: 'auto', mb: 1 }}>
        <ListItem
          button
          onClick={onLogout}
          sx={{
            my: 0.5,
            borderRadius: 2,
            minHeight: 42,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.primary.main, minWidth: 36 }}>
            <LogoutIcon />
          </ListItemIcon>
          {open && (
            <ListItemText
              primary={t('logout')}
              sx={{
                '& .MuiTypography-root': {
                  fontWeight: 500,
                  fontSize: '0.85rem',
                },
              }}
            />
          )}
        </ListItem>
      </List>
    </Drawer>
  );
};

const AppContent = () => {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState('light');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const location = useLocation();
  const hideSidebar = location.pathname === "/" || location.pathname === "/login";

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [isMobile]);

  const toggleDrawer = () => setOpen(!open);

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const themeConfig = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? lightBlue : primaryColor,
      },
      background: {
        default: mode === 'light' ? '#f8f9fa' : '#1a1a2e',
        paper: mode === 'light' ? '#ffffff' : '#16213e',
      },
    },
    typography: {
      fontFamily: classicFont,
      fontSize: 14,
      h1: { fontSize: '2rem' },
      h2: { fontSize: '1.75rem' },
      h3: { fontSize: '1.5rem' },
      h4: { fontSize: '1.25rem' },
      h5: { fontSize: '1.1rem' },
      h6: { fontSize: '1rem' },
      body1: { fontSize: '0.875rem' },
      body2: { fontSize: '0.8rem' },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? '#ffffff' : '#16213e',
            color: mode === 'light' ? primaryColor : '#ffffff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontSize: '0.8rem',
            padding: '6px 16px',
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 700,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: mode === 'light' ? '0 8px 26px rgba(17, 24, 39, 0.08)' : undefined,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              fontWeight: 700,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-input': {
              fontSize: '0.875rem',
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.875rem',
            },
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={themeConfig}>
      <Box
        sx={{
          display: 'flex',
          minHeight: "100vh",
          background: themeConfig.palette.background.default,
        }}
      >
        <CssBaseline />

        {!hideSidebar && (
          <Sidebar
            open={open}
            toggleDrawer={toggleDrawer}
            mode={mode}
            onToggleColorMode={toggleColorMode}
            onLogout={async () => {
              await signOut(auth);
              navigate('/login');
            }}
          />
        )}

        {!hideSidebar && isMobile && !open && (
          <IconButton
            onClick={toggleDrawer}
            sx={{
              position: 'fixed',
              top: 12,
              left: 12,
              zIndex: 1300,
              color: themeConfig.palette.primary.main,
              backgroundColor: themeConfig.palette.background.paper,
              boxShadow: themeConfig.shadows[2],
              '&:hover': { backgroundColor: themeConfig.palette.action.hover },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box
          component="main"
          sx={{
            p: { xs: 1.5, md: 2.5 },
            marginTop: 0,
            overflowX: "hidden",
            background: themeConfig.palette.background.default,
            flexGrow: 1,
          }}
        >
          <Container maxWidth={false} sx={{ maxWidth: '1220px', px: { xs: 0.5, md: 1.5 } }}>
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
          </Container>
        </Box>
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
