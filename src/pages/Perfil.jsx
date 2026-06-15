import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Avatar, Paper, Grid, Card, CardContent,
  useTheme, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Skeleton
} from "@mui/material";
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { motion } from 'framer-motion';
import { Work as WorkIcon, Business as BusinessIcon, CalendarToday as CalendarIcon, Edit as EditIcon, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { sendPasswordResetEmail } from 'firebase/auth';
import dayjs from 'dayjs';
import 'dayjs/locale/pt';
import 'dayjs/locale/en';

const Perfil = () => {
  const [userData, setUserData] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('week'));
  const [weeklyAbsences, setWeeklyAbsences] = useState({});
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const auth = getAuth();
  const user = auth.currentUser;
  const theme = useTheme();
  const { t, i18n } = useTranslation();

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
    const locale = i18n.language === 'pt' ? 'pt' : 'en';
    dayjs.locale(locale);
    setCurrentWeek(dayjs().startOf('week'));
  }, [i18n.language]);

  const fetchWeeklyAbsences = useCallback(async () => {
    const startOfWeek = currentWeek.startOf('week');
    const ausenciasRef = collection(db, 'ausencias');
    try {
      const snapshot = await getDocs(ausenciasRef);
      const ausencias = snapshot.docs.map(docSnap => docSnap.data());
      const weekly = {};
      for (let i = 0; i < 7; i++) {
        const day = startOfWeek.add(i, 'day');
        weekly[day.format('YYYY-MM-DD')] = ausencias.filter((a) => {
          if (!a.data) return false;
          const absenceDate = dayjs(a.data);
          return absenceDate.isSame(day, 'day');
        });
      }
      setWeeklyAbsences(weekly);
    } catch (error) {
      console.error('Error fetching weekly absences:', error);
    }
  }, [currentWeek]);

  useEffect(() => {
    fetchWeeklyAbsences();
  }, [fetchWeeklyAbsences]);

  const handlePrevWeek = () => {
    setCurrentWeek(prev => prev.subtract(1, 'week'));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => prev.add(1, 'week'));
  };

  const handleEditProfile = () => {
    setEditData({ ...userData });
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const q = query(collection(db, 'users'), where('email', '==', user.email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = doc(db, 'users', snapshot.docs[0].id);
      await updateDoc(docRef, editData);
      setUserData(editData);
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  if (!userData) {
    return (
      <Box sx={{ py: 3, px: 2 }}>
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={380} /></Grid>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={380} /></Grid>
        </Grid>
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
          {t('homePage')}
        </Typography>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Grid container spacing={3} alignItems="stretch" justifyContent="center" sx={{ minHeight: '60vh', height: '100%' }}>
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <motion.div variants={itemVariants} style={{ height: '100%' }}>
              <Paper
                elevation={8}
                sx={{
                  p: 6,
                  borderRadius: 4,
                  background: theme.palette.background.paper,
                  minHeight: { xs: 400, md: 620 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: theme.shadows[4],
                  height: '100%',
                  width: '100%',
                  flex: 1,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Box sx={{ position: 'relative', width: 120, height: 120, mb: 2 }}>
                    <Avatar
                      src={userData.photoURL || ''}
                      alt="Profile photo"
                      sx={{
                        width: 120,
                        height: 120,
                        mb: 0,
                        border: `4px solid ${theme.palette.primary.main}`,
                        boxShadow: `0 4px 20px ${theme.palette.primary.main}40`,
                      }}
                    />
                    <IconButton
                      onClick={handleEditProfile}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        zIndex: 2,
                        backgroundColor: theme.palette.primary.main,
                        color: 'white',
                        border: `2px solid ${theme.palette.background.paper}`,
                        '&:hover': { backgroundColor: theme.palette.primary.dark },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>
                </motion.div>
                <Typography variant="subtitle1" sx={{ color: theme.palette.text.secondary, mb: 2, fontFamily: "'Poppins', sans-serif", textAlign: 'center' }}>
                  {userData.email}
                </Typography>
                <Card sx={{ background: theme.palette.action.hover, width: '100%', mb: 2 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 2, fontFamily: "'Poppins', sans-serif", textAlign: 'center' }}>
                      {t('professionalData')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <WorkIcon sx={{ color: theme.palette.primary.main }} />
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body2" color="text.secondary">{t('position')}</Typography>
                          <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.role || t('notDefined')}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ color: theme.palette.primary.main }} />
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body2" color="text.secondary">{t('department')}</Typography>
                          <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.department || t('notDefined')}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <CalendarIcon sx={{ color: theme.palette.primary.main }} />
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body2" color="text.secondary">{t('admissionDate')}</Typography>
                          <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.date || '---'}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <DefinirSenhaButton email={userData.email} />
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <motion.div variants={itemVariants} style={{ height: '100%' }}>
              <Paper
                elevation={8}
                sx={{
                  p: 6,
                  borderRadius: 4,
                  background: theme.palette.background.paper,
                  minHeight: { xs: 400, md: 620 },
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: theme.shadows[4],
                  flex: 1,
                  height: '100%',
                  width: '100%',
                }}
              >
                <Grid container spacing={2} alignItems="stretch" sx={{ flex: 1, height: '100%' }}>
                  <Grid item xs={12} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Card sx={{ background: theme.palette.action.hover, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 2, fontFamily: "'Poppins', sans-serif" }}>
                          {t('weeklyAbsenceCalendar')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                          <IconButton onClick={handlePrevWeek} size="small">
                            <ChevronLeft />
                          </IconButton>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {t('weekRange', {
                              start: currentWeek.startOf('week').format('DD/MM'),
                              end: currentWeek.endOf('week').format('DD/MM')
                            })}
                          </Typography>
                          <IconButton onClick={handleNextWeek} size="small">
                            <ChevronRight />
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                          {Array.from({ length: 7 }, (_, i) => {
                            const day = currentWeek.startOf('week').add(i, 'day');
                            const dayKey = day.format('YYYY-MM-DD');
                            const absences = (weeklyAbsences[dayKey] || []);
                            const dayLabel = day.locale(i18n.language === 'pt' ? 'pt' : 'en').format('ddd DD/MM');
                            const hasManyAbsences = absences.length >= 3;
                            
                            return (
                              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid', borderColor: theme.palette.divider }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main, minWidth: 80 }}>
                                  {dayLabel}
                                </Typography>
                                {hasManyAbsences ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {absences.slice(0, 4).map((absence, idx) => (
                                      <Avatar
                                        key={idx}
                                        src={absence.photoURL || ''}
                                        alt={absence.nome}
                                        sx={{ width: 28, height: 28, fontSize: '0.75rem', border: `2px solid ${theme.palette.background.paper}`, boxShadow: theme.shadows[1] }}
                                      >
                                        {absence.nome?.charAt(0) || '?'}
                                      </Avatar>
                                    ))}
                                    {absences.length > 4 && (
                                      <Avatar
                                        sx={{ width: 28, height: 28, fontSize: '0.7rem', background: theme.palette.primary.main, border: `2px solid ${theme.palette.background.paper}`, boxShadow: theme.shadows[1] }}
                                      >
                                        +{absences.length - 4}
                                      </Avatar>
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" sx={{ color: absences.length > 0 ? theme.palette.text.primary : theme.palette.text.secondary }}>
                                    {absences.length > 0 ? absences.map(a => a.nome).join(', ') : t('noOne')}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>

      <Dialog open={editing} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle>{t('editProfile')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('name')}
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('profileNumber')}
                value={editData.profileNumber || ''}
                onChange={(e) => setEditData({ ...editData, profileNumber: e.target.value })}
                margin="normal"
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label={t('scales')}
            value={editData.scales || ''}
            onChange={(e) => setEditData({ ...editData, scales: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('studies')}
            value={editData.studies || ''}
            onChange={(e) => setEditData({ ...editData, studies: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('trainings')}
            value={editData.trainings || ''}
            onChange={(e) => setEditData({ ...editData, trainings: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>{t('cancel')}</Button>
          <Button onClick={handleSaveProfile} variant="contained">{t('save')}</Button>
        </DialogActions>
      </Dialog>
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
        {enviado ? t('emailSent') : t('definePasswordForEmailLogin')}
      </Button>
      {erro && <Typography color="error">{erro}</Typography>}
      {enviado && <Typography color="success.main">{t('checkYourEmailToSetPassword')}</Typography>}
    </Box>
  );
}

export default Perfil;
