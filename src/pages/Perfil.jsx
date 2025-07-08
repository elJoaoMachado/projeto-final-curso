import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Paper, Grid, Card, CardContent,
  Divider, useTheme, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button
} from "@mui/material";
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { motion } from 'framer-motion';
import { Work as WorkIcon, Business as BusinessIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { sendPasswordResetEmail } from 'firebase/auth';

const Perfil = () => {
  const [userData, setUserData] = useState(null);
  const [ausenciasHoje, setAusenciasHoje] = useState([]);
  const [users, setUsers] = useState([]);
  const auth = getAuth();
  const user = auth.currentUser;
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const q = query(collection(db, 'users'), where('email', '==', user.email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setUserData(snapshot.docs[0].data());
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => doc.data());
      setUsers(usersList);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAusenciasHoje = async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const ausenciasRef = collection(db, 'ausencias');
      const snapshot = await getDocs(ausenciasRef);
      const ausencias = snapshot.docs.map(doc => doc.data());
      const ausentesHoje = ausencias.filter(a => {
        if (!a.data) return false;
        const dataAusencia = new Date(a.data);
        dataAusencia.setHours(0, 0, 0, 0);
        return dataAusencia.getTime() === hoje.getTime();
      });
      setAusenciasHoje(ausentesHoje);
    };
    fetchAusenciasHoje();
  }, []);

  if (!userData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography variant="h6" sx={{ color: theme.palette.primary.main }}>
          {t('loading')}
        </Typography>
      </Box>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <Box sx={{ py: 2, px: 2, minHeight: '100vh', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, px: 2, mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, fontFamily: "'Poppins', sans-serif" }}>
          {t('profile')}
        </Typography>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Grid container spacing={3} alignItems="stretch" justifyContent="center" sx={{ minHeight: '60vh', height: '100%' }}>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <motion.div variants={itemVariants} style={{ height: '100%' }}>
              <Paper
                elevation={8}
                sx={{
                  p: 6,
                  borderRadius: 4,
                  background: theme.palette.background.paper,
                  minHeight: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: theme.shadows[4],
                  height: '100%',
                  flex: 1,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Avatar
                    src={userData.photoURL || ''}
                    alt="Profile photo"
                    sx={{
                      width: 120,
                      height: 120,
                      mb: 2,
                      border: `4px solid ${theme.palette.primary.main}`,
                      boxShadow: `0 4px 20px ${theme.palette.primary.main}40`,
                    }}
                  />
                </motion.div>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 1, fontFamily: "'Poppins', sans-serif" }}>
                  {userData.name || 'No name'}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: theme.palette.text.secondary, mb: 2, fontFamily: "'Poppins', sans-serif" }}>
                  {userData.email}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <DefinirSenhaButton email={userData.email} />
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <motion.div variants={itemVariants} style={{ height: '100%' }}>
              <Paper
                elevation={8}
                sx={{
                  p: 6,
                  borderRadius: 4,
                  background: theme.palette.background.paper,
                  minHeight: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: theme.shadows[4],
                  flex: 1,
                  height: '100%',
                }}
              >
                <Grid container spacing={2} alignItems="stretch" sx={{ flex: 1, height: '100%' }}>
                  <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Card sx={{ background: theme.palette.action.hover, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 2, fontFamily: "'Poppins', sans-serif" }}>
                          {t('professionalData')}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkIcon sx={{ color: theme.palette.primary.main }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">{t('position')}</Typography>
                              <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.role || t('notDefined')}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon sx={{ color: theme.palette.primary.main }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">{t('department')}</Typography>
                              <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.department || t('notDefined')}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon sx={{ color: theme.palette.primary.main }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">{t('admissionDate')}</Typography>
                              <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.date || '---'}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {userData.isAdmin === true && (
                    <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Card sx={{ background: theme.palette.action.hover, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 2, fontFamily: "'Poppins', sans-serif" }}>
                            {t('absences')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {new Date().toLocaleDateString()}
                          </Typography>
                          {ausenciasHoje.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">{t('noAbsences')}</Typography>
                          ) : (
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Nome</TableCell>
                                    <TableCell>Departamento</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {ausenciasHoje.map((a, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{a.nome}</TableCell>
                                      <TableCell>{a.departamento}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
};

function DefinirSenhaButton({ email }) {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const auth = getAuth();
  const { t } = useTranslation();

  const handleClick = async () => {
    setErro('');
    try {
      await sendPasswordResetEmail(auth, email);
      setEnviado(true);
    } catch (e) {
      setErro(e.message);
    }
  };

  return (
    <Box>
      <Button variant="outlined" onClick={handleClick} disabled={enviado}>
        {enviado ? t('emailSent') : t('Define your password for your email login')}
      </Button>
      {erro && <Typography color="error">{erro}</Typography>}
      {enviado && <Typography color="success.main">{t('Check your Email to set your password')}</Typography>}
    </Box>
  );
}

export default Perfil;
