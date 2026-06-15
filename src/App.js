import React, { useState, useEffect, lazy, Suspense } from "react";
import {BrowserRouter as Router,Routes,Route,Navigate,useLocation,} from "react-router-dom";
import {Drawer, List, ListItem, ListItemIcon, ListItemText,CssBaseline, Toolbar, AppBar, Typography, Box, Container,IconButton, Tooltip, useTheme, useMediaQuery, ThemeProvider, createTheme, CircularProgress} from "@mui/material";
import {Menu as MenuIcon, Person as PersonIcon, EventNote as EventNoteIcon,Assessment as AssessmentIcon, AttachMoney as AttachMoneyIcon, Brightness4, Brightness7} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';

import PrivateRoute from "./PrivateRoute";
import { AuthProvider } from "./AuthContext";
import logo from "./pages/logoTechnoSoftware.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
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

const Sidebar = ({ open, toggleDrawer }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: open ? drawerWidth : collapsedWidth,
          transition: "all 0.3s ease-in-out",
          boxSizing: "border-box",
          height: "100vh",
          background: theme.palette.background.default,
          borderRight: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
        },
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Toolbar sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '60px !important',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <IconButton onClick={toggleDrawer} sx={{ color: theme.palette.primary.main }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
        <List sx={{ px: 1.5 }}>
          {[
            { text: t('homePage'), icon: <PersonIcon />, path: "/perfil" },
            { text: t('employees'), icon: <PersonIcon />, path: "/colaboradores" },
            { text: t('absences'), icon: <EventNoteIcon />, path: "/ausencias" },
            { text: t('reports'), icon: <AssessmentIcon />, path: "/relatorios" },
            { text: t('expenses'), icon: <AttachMoneyIcon />, path: "/despesas" },
          ].map(({ text, icon, path }, index) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Tooltip title={open ? "" : text} placement="right">
                <ListItem
                  button
                  component={Link}
                  to={path}
                  sx={{
                    margin: "4px 0",
                    borderRadius: "8px",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                      "& .MuiListItemIcon-root": {
                        color: theme.palette.primary.main,
                      },
                      "& .MuiListItemText-primary": {
                        color: theme.palette.primary.main,
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: theme.palette.primary.main,
                    minWidth: '36px'
                  }}>
                    {icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText 
                      primary={text} 
                      sx={{ 
                        color: theme.palette.text.primary,
                        '& .MuiTypography-root': {
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }
                      }} 
                    />
                  )}
                </ListItem>
              </Tooltip>
            </motion.div>
          ))}
        </List>
      </motion.div>
      <List sx={{ px: 1.5, mt: 'auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tooltip title={open ? "" : t('logout')} placement="right">
            <ListItem
              button
              component={Link}
              to="/"
              sx={{
                margin: "4px 0",
                borderRadius: "8px",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  "& .MuiListItemIcon-root": {
                    color: theme.palette.primary.main,
                  },
                  "& .MuiListItemText-primary": {
                    color: theme.palette.primary.main,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ 
                color: theme.palette.primary.main,
                minWidth: '36px'
              }}>
                <ExitToAppIcon />
              </ListItemIcon>
              {open && (
                <ListItemText 
                  primary={t('logout')} 
                  sx={{ 
                    color: theme.palette.text.primary,
                    '& .MuiTypography-root': {
                      fontWeight: 500,
                      fontSize: '0.85rem'
                    }
                  }} 
                />
              )}
            </ListItem>
          </Tooltip>
        </motion.div>
      </List>
    </Drawer>
  );
};

const AppContent = () => {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState('light');
  const toggleDrawer = () => setOpen(!open);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();

  const location = useLocation();
  const hideSidebar = location.pathname === "/";

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [isMobile]);

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
          display: "flex",
          minHeight: "100vh",
          background: themeConfig.palette.background.default,
        }}
      >
        <CssBaseline />

        {!hideSidebar && (
          <AppBar
            position="fixed"
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
              boxShadow: themeConfig.shadows[1],
              borderBottom: `1px solid ${themeConfig.palette.divider}`,
            }}
          >
            <Toolbar sx={{ minHeight: '60px !important' }}>
              <IconButton
                onClick={toggleDrawer}
                sx={{
                  color: themeConfig.palette.primary.main,
                  mr: 1.5,
                  "&:hover": {
                    backgroundColor: themeConfig.palette.action.hover,
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h5"
                noWrap
                component="div"
                sx={{
                  fontWeight: "600",
                  color: themeConfig.palette.primary.main,
                  fontSize: '1.25rem'
                }}
              >
                TechnoSoftware Dashboard
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', gap: 1.5 }}>
                <Tooltip title={mode === 'light' ? t('enableDarkTheme') : t('enableLightTheme')}>
                  <IconButton 
                    onClick={toggleColorMode} 
                    color="inherit"
                    sx={{
                      backgroundColor: themeConfig.palette.action.hover,
                      '&:hover': {
                        backgroundColor: themeConfig.palette.action.selected,
                      },
                    }}
                  >
                    {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                  </IconButton>
                </Tooltip>
                <motion.img
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  src={logo}
                  alt="Logo"
                  style={{
                    height: 32,
                  }}
                />
              </Box>
            </Toolbar>
          </AppBar>
        )}

        {!hideSidebar && <Sidebar open={open} toggleDrawer={toggleDrawer} />}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 2,
            marginTop: hideSidebar ? 0 : 6,
            overflowX: "hidden",
            background: themeConfig.palette.background.default,
          }}
        >
          <Container maxWidth="lg">
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
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
      <FloatingLangButton />
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
