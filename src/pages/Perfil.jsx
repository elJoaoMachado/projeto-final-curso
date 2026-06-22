import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Avatar, Paper, Grid, Card, CardContent,
  useTheme, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Skeleton,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert
} from "@mui/material";
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, storage } from '../FirebaseConfig';
import { Work as WorkIcon, Business as BusinessIcon, CalendarToday as CalendarIcon, Edit as EditIcon, ChevronLeft, ChevronRight, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import dayjs from 'dayjs';
import 'dayjs/locale/pt';
import 'dayjs/locale/en';

const HOME_CARD_WIDTH = 520;
const HOME_CARD_HEIGHT = 640;

const Perfil = () => {
  const [userData, setUserData] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('week'));
  const [weeklyAbsences, setWeeklyAbsences] = useState({});
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const departamentos = ['HR', 'Finance', 'Technology'];

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

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('fileTooLarge'));
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setUploadError(t('invalidFileType'));
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const timestamp = Date.now();
      const filename = `perfil_${user.uid}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `profile-photos/${filename}`);

      // Tentar upload para Firebase Storage
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        setEditData({ ...editData, photoURL: downloadURL, photoStorageType: 'firebase' });
        setUploadSuccess(t('photoUploadedSuccessfully'));
      } catch (firebaseError) {
        console.error('Firebase upload error:', firebaseError);
        
        // Fallback: armazenar foto em localStorage para desenvolvimento
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataURL = e.target.result;
          // Armazenar em localStorage
          localStorage.setItem(`userPhoto_${user.uid}`, dataURL);
          // Guardar referência no Firestore
          setEditData({ ...editData, photoURL: 'local', photoStorageType: 'localStorage' });
          setUploadSuccess(t('photoUploadedSuccessfully'));
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(t('photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  // Função para obter a URL da foto
  const getPhotoURL = (userDataObj) => {
    if (!userDataObj.photoURL) return null;
    
    // Se for "local", buscar do localStorage
    if (userDataObj.photoStorageType === 'localStorage' || userDataObj.photoURL === 'local') {
      return localStorage.getItem(`userPhoto_${user.uid}`);
    }
    
    // Caso contrário, retornar a URL do Firebase
    return userDataObj.photoURL;
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

  return (
    <Box sx={{ py: 2, px: 2, minHeight: '100vh', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, px: 2, mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, fontFamily: "'Poppins', sans-serif" }}>
          {t('homePage')}
        </Typography>
      </Box>

      <Box>
        <Grid container spacing={3} alignItems="stretch" justifyContent="center" sx={{ minHeight: '60vh', height: '100%' }}>
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ height: '100%' }}>
              <Paper
                elevation={8}
                sx={{
                  p: { xs: 3, md: 5 },
                  borderRadius: 4,
                  background: theme.palette.background.paper,
                  minHeight: { xs: 520, md: `${HOME_CARD_HEIGHT}px` },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  boxShadow: theme.shadows[4],
                  height: { xs: 'auto', md: `${HOME_CARD_HEIGHT}px` },
                  width: { xs: '100%', md: `${HOME_CARD_WIDTH}px` },
                  maxWidth: { xs: '100%', md: `${HOME_CARD_WIDTH}px` },
                  mx: 'auto',
                  flex: 1,
                }}
              >
                <Box>
                  <Box sx={{ position: 'relative', width: 120, height: 120, mb: 2 }}>
                    <Avatar
                      src={getPhotoURL(userData) || ''}
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
                </Box>
                <Typography variant="subtitle1" sx={{ color: theme.palette.text.secondary, mb: 2, fontFamily: "'Poppins', sans-serif", textAlign: 'center' }}>
                  {userData.email}
                </Typography>
                <Card sx={{ background: theme.palette.action.hover, width: '100%', mb: 2 }}>
                  <CardContent sx={{ textAlign: 'left' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 2, fontFamily: "'Poppins', sans-serif", textAlign: 'center' }}>
                      {t('professionalData')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.2 }}>
                        <WorkIcon sx={{ color: theme.palette.primary.main }} />
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body2" color="text.secondary">{t('position')}</Typography>
                          <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.role || t('notDefined')}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.2 }}>
                        <BusinessIcon sx={{ color: theme.palette.primary.main }} />
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body2" color="text.secondary">{t('department')}</Typography>
                          <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>{userData.department || userData.Department || t('notDefined')}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.2 }}>
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
            </Box>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ height: '100%' }}>
              <Paper
                elevation={8}
                sx={{
                  p: { xs: 3, md: 5 },
                  borderRadius: 4,
                  background: theme.palette.background.paper,
                  minHeight: { xs: 520, md: `${HOME_CARD_HEIGHT}px` },
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: theme.shadows[4],
                  flex: 1,
                  height: { xs: 'auto', md: `${HOME_CARD_HEIGHT}px` },
                  width: { xs: '100%', md: `${HOME_CARD_WIDTH}px` },
                  maxWidth: { xs: '100%', md: `${HOME_CARD_WIDTH}px` },
                  mx: 'auto',
                }}
              >
                <Grid container spacing={0} alignItems="center" justifyContent="center" sx={{ flex: 1, height: '100%' }}>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Card sx={{ background: theme.palette.action.hover, width: '100%', maxWidth: 430, minHeight: { xs: 420, md: 500 }, display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 2, fontFamily: "'Poppins', sans-serif", textAlign: 'center' }}>
                            {t('weeklyAbsenceCalendar')}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                            <IconButton onClick={handlePrevWeek} size="small">
                              <ChevronLeft />
                            </IconButton>
                            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'center' }}>
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
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={editing} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>{t('editProfile')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('name')}
            margin="dense"
            value={editData.name || ''}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('email')}
            margin="dense"
            value={editData.email || ''}
            disabled
          />
          <TextField
            fullWidth
            label={t('admissionDate')}
            margin="dense"
            type="date"
            value={editData.date || ''}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="profile-department-label">{t('department')}</InputLabel>
            <Select
              labelId="profile-department-label"
              label={t('department')}
              value={editData.department || editData.Department || ''}
              onChange={(e) => setEditData({ ...editData, department: e.target.value, Department: e.target.value })}
            >
              {departamentos.map((dep) => (
                <MenuItem key={dep} value={dep}>{dep}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('position')}
            margin="dense"
            value={editData.role || ''}
            onChange={(e) => setEditData({ ...editData, role: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('profileNumber')}
            margin="dense"
            value={editData.profileNumber || ''}
            onChange={(e) => setEditData({ ...editData, profileNumber: e.target.value })}
          />
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{t('photo')}</Typography>
            {uploadSuccess && <Alert severity="success" sx={{ mb: 2 }}>{uploadSuccess}</Alert>}
            {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                disabled={uploading}
              >
                {uploading ? t('uploading') : t('selectPhoto')}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </Button>
              {editData.photoURL && (
                <Avatar
                  src={getPhotoURL(editData) || editData.photoURL}
                  alt="Preview"
                  sx={{ width: 48, height: 48 }}
                />
              )}
            </Box>
          </Box>
          <TextField
            fullWidth
            label={t('scales')}
            margin="dense"
            value={editData.scales || ''}
            onChange={(e) => setEditData({ ...editData, scales: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('studies')}
            margin="dense"
            value={editData.studies || ''}
            onChange={(e) => setEditData({ ...editData, studies: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('trainings')}
            margin="dense"
            value={editData.trainings || ''}
            onChange={(e) => setEditData({ ...editData, trainings: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('other')}
            margin="dense"
            value={editData.otherInfo || ''}
            onChange={(e) => setEditData({ ...editData, otherInfo: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>{t('cancel')}</Button>
          <Button onClick={handleSaveProfile} variant="contained" sx={{ fontWeight: 'bold' }}>
            {t('save')}
          </Button>
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
      if (e.code === 'auth/invalid-continue-uri' || e.code === 'auth/unauthorized-continue-uri') {
        setErro(t('passwordResetConfigError'));
      } else {
        setErro(t('passwordResetUnexpectedError'));
      }
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
