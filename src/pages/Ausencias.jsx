import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, Typography, Box, MenuItem, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, Snackbar, Alert,
  Skeleton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import { db } from '../FirebaseConfig';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Add } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import 'dayjs/locale/pt';
import ptLocale from '@fullcalendar/core/locales/pt';

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function PaginaAusencias() {
  const [nome, setNome] = useState('');
  const [data, setData] = useState(null);
  const [razao, setRazao] = useState('');
  const [ausencias, setAusencias] = useState([]);
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();
  const [showForm, setShowForm] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t, i18n } = useTranslation();

  // Update dayjs locale according to the language
  React.useEffect(() => {
    dayjs.locale(i18n.language === 'pt' ? 'pt' : 'en');
  }, [i18n.language]);

  // Check admin role
  const checkAdminRole = useCallback(async (user) => {
    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        return userData.isAdmin === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  }, []);

  // Load users for dropdown
  const loadUsers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  const carregarAusencias = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const querySnapshot = await getDocs(collection(db, 'ausencias'));
      const ausenciasFirestore = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome,
          razao: data.razao,
          data: data.data,
          userId: data.userId,
        };
      });
      setAusencias(ausenciasFirestore);
    } catch (error) {
      console.error('Error loading absences:', error);
      setError(t('errorLoadingAbsences'));
    }
  }, [auth, t]);

  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const adminStatus = await checkAdminRole(user);
      setIsAdmin(adminStatus);
      await loadUsers();
      await carregarAusencias();
      setIsLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged(initializeUser);
    return () => unsubscribe();
  }, [auth, navigate, checkAdminRole, loadUsers, carregarAusencias]);

  const handleAdicionar = async () => {
    if (nome && data && razao) {
      const dataFormatada = dayjs(data).format('YYYY-MM-DD');

      try {
        const docRef = await addDoc(collection(db, 'ausencias'), {
          nome,
          data: dataFormatada,
          razao,
          userId: auth.currentUser?.uid,
          timestamp: new Date().toISOString()
        });

        // Update calendar locally
        const novaAusencia = {
          id: docRef.id,
          nome,
          razao,
          data: dataFormatada,
          userId: auth.currentUser?.uid,
        };

        setAusencias((prev) => [...prev, novaAusencia]);
        setSuccess(t('absenceRegisteredSuccessfully'));

        // Clear form
        setNome('');
        setData(null);
        setRazao('');
        return true;
      } catch (error) {
        console.error('Error adding absence:', error);
        setError(t('errorRegisteringAbsence'));
        return false;
      }
    } else {
      setError(t('allFieldsMustBeFilled'));
      return false;
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess('');
    setError('');
  };

  const handleEventClick = (clickInfo) => {
    const user = auth.currentUser;
    if (!user) {
      setError(t('loginRequired'));
      return;
    }
    const eventUserId = clickInfo.event.extendedProps.userId;

    // Allow admin or the user themselves to delete the absence
    if (isAdmin || user.uid === eventUserId) {
      setAbsenceToDelete(clickInfo.event);
    } else {
      setError(t('onlyDeleteOwnAbsences'));
    }
  };

  const handleDeleteAbsence = async () => {
    if (!absenceToDelete) return;
    try {
      await deleteDoc(doc(db, 'ausencias', absenceToDelete.id));
      
      // Remove from local state
      setAusencias(prev => prev.filter(a => a.id !== absenceToDelete.id));
      setAbsenceToDelete(null);
      setSuccess(t('absenceDeletedSuccessfully'));
    } catch (err) {
      console.error("Error deleting absence:", err);
      setError(t('errorDeletingAbsence'));
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language === 'pt' ? 'pt' : 'en'}>
      <Box sx={{ mt: 1, py: 0, px: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, px: 1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'Poppins, sans-serif', ml: 0 }}>
            {t('absences')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowForm(true)}
            sx={{ fontWeight: 'bold' }}
          >
            {t('registerAbsence')}
          </Button>
        </Box>
        <Box mb={2}>
          {isLoading ? (
            <Skeleton variant="rounded" height={650} />
          ) : (
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={ausencias.map(a => ({
              id: a.id,
              title: a.nome + (a.razao ? ` (${a.razao})` : ''),
              start: a.data,
              allDay: true,
              userId: a.userId,
              nome: a.nome,
              razao: a.razao
            }))}
            locale={i18n.language === 'pt' ? ptLocale : undefined}
            eventClick={handleEventClick}
            height="680px"
            titleFormat={{
              year: 'numeric',
              month: 'long',
              formatter: (date) => {
                const d = date.start || date;
                const locale = i18n.language === 'pt' ? 'pt' : 'en';
                const month = capitalizeFirst(dayjs(d).locale(locale).format('MMMM'));
                const year = dayjs(d).format('YYYY');
                return `${month} ${year}`;
              }
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek'
            }}
          />
          )}
        </Box>

        <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>{t('registerAbsence')}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>{t('employee')}</InputLabel>
                <Select
                  value={nome}
                  label={t('employee')}
                  onChange={(e) => setNome(e.target.value)}
                >
                  {users
                    .filter(user => user.email === auth.currentUser.email)
                    .map(user => (
                      <MenuItem key={user.id} value={user.name}>
                        {user.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <DatePicker
                label={t('absenceDate')}
                value={data}
                onChange={(newValue) => setData(newValue)}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small"
                  }
                }}
              />
              <FormControl fullWidth>
                <InputLabel>{t('reason')}</InputLabel>
                <Select
                  value={razao}
                  label={t('reason')}
                  onChange={(e) => setRazao(e.target.value)}
                >
                  <MenuItem value="Sick">{t('sick')}</MenuItem>
                  <MenuItem value="Vacation">{t('vacation')}</MenuItem>
                  <MenuItem value="Family">{t('family')}</MenuItem>
                  <MenuItem value="Other">{t('other')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button
              variant="contained"
              onClick={async () => {
                const saved = await handleAdicionar();
                if (saved) {
                  setShowForm(false);
                }
              }}
              startIcon={<Add />}
            >
              {t('register')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        {absenceToDelete && (
          <Dialog open onClose={() => setAbsenceToDelete(null)}>
            <DialogTitle>{t('deleteAbsence')}</DialogTitle>
            <DialogContent>
              <Typography>
                {t('areYouSureYouWantToDeleteTheAbsenceFor')}
                <strong>{absenceToDelete.extendedProps.nome}</strong> {t('on')}
                <strong>{dayjs(absenceToDelete.start).format('DD/MM/YYYY')}</strong>?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAbsenceToDelete(null)}>{t('cancel')}</Button>
              <Button onClick={handleDeleteAbsence} color="error">{t('yesDelete')}</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Success/Error Messages */}
        <Snackbar 
          open={!!success} 
          autoHideDuration={4000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="success">
            {success}
          </Alert>
        </Snackbar>
        <Snackbar 
          open={!!error} 
          autoHideDuration={4000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="error">
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}