import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Typography, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, Card, CardContent, CardActions,
  TextField, MenuItem, CircularProgress, Alert, Snackbar, LinearProgress,
  Paper, IconButton, Tooltip, FormControl, InputLabel, Select, TablePagination
} from "@mui/material";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from '../FirebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Add as AddIcon, Delete as DeleteIcon, Description as DescriptionIcon, PictureAsPdf as PdfIcon, FilterList } from '@mui/icons-material';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Despesas = () => {
  const [despesas, setDespesas] = useState([]);
  const [filteredDespesas, setFilteredDespesas] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [newDespesa, setNewDespesa] = useState({ tipo: '', valor: '', data: '', arquivo: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    person: '',
    year: '',
    month: '',
    type: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const navigate = useNavigate();
  const auth = getAuth();
  const [showAdminSnackbar, setShowAdminSnackbar] = useState(false);
  const { t } = useTranslation();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const expenseTypes = ['Food', 'Transport', 'Accommodation', 'Other'];

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

  const carregarDespesas = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const querySnapshot = await getDocs(collection(db, 'despesas'));
      const despesasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get user names for all expenses
      const despesasComNomes = await Promise.all(despesasData.map(async (despesa) => {
        if (despesa.userId) {
          const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', despesa.userName)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            return {
              ...despesa,
              userName: userData.name || despesa.userName,
              expenseDate: new Date(despesa.data),
              year: new Date(despesa.data).getFullYear(),
              month: new Date(despesa.data).getMonth()
            };
          }
        }
        return {
          ...despesa,
          expenseDate: new Date(despesa.data),
          year: new Date(despesa.data).getFullYear(),
          month: new Date(despesa.data).getMonth()
        };
      }));

      if (isAdmin) {
        setDespesas(despesasComNomes);
        setFilteredDespesas(despesasComNomes);
      } else {
        // Filter expenses for non-admin users
        const userDespesas = despesasComNomes.filter(despesa => despesa.userId === user.uid);
        setDespesas(userDespesas);
        setFilteredDespesas(userDespesas);
      }
    } catch (error) {
      setError('Error loading expenses');
      console.error("Error loading expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [auth, isAdmin, navigate]);

  useEffect(() => {
    const initializeUser = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const adminStatus = await checkAdminRole(user);
      setIsAdmin(adminStatus);
      await loadUsers();
      await carregarDespesas();
    };

    const unsubscribe = auth.onAuthStateChanged(initializeUser);
    return () => unsubscribe();
  }, [auth, checkAdminRole, navigate, loadUsers, carregarDespesas]);

  // Check if the admin just logged in
  if (localStorage.getItem('adminJustLoggedIn') === 'true') {
    setShowAdminSnackbar(true);
    localStorage.removeItem('adminJustLoggedIn');
  }

  // Filter expenses based on search criteria
  useEffect(() => {
    let filtered = despesas;

    if (searchFilters.person) {
      filtered = filtered.filter(expense => 
        expense.userName?.toLowerCase().includes(searchFilters.person.toLowerCase())
      );
    }

    if (searchFilters.year) {
      filtered = filtered.filter(expense => 
        expense.year === parseInt(searchFilters.year)
      );
    }

    if (searchFilters.month !== '') {
      filtered = filtered.filter(expense => 
        expense.month === parseInt(searchFilters.month)
      );
    }

    if (searchFilters.type) {
      filtered = filtered.filter(expense => 
        expense.tipo === searchFilters.type
      );
    }

    setFilteredDespesas(filtered);
    setPage(0);
  }, [searchFilters, despesas]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError('File is too large. Maximum size allowed: 10MB');
        return;
      }
      setNewDespesa(prev => ({ ...prev, arquivo: file }));
    }
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError('You need to be logged in to add an expense');
      navigate('/login');
      return;
    }

    // Field validation
    if (!newDespesa.tipo) {
      setError('Please select the expense type');
      return;
    }
    if (!newDespesa.valor || parseFloat(newDespesa.valor) <= 0) {
      setError('Please enter a valid value greater than zero');
      return;
    }
    if (!newDespesa.data) {
      setError('Please select the expense date');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let arquivoURL = '';

      // Get user name
      const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      const userName = userDoc.empty ? user.email : userDoc.docs[0].data().name;

      if (newDespesa.arquivo) {
        const storageRef = ref(storage, `despesas/${user.uid}/${newDespesa.arquivo.name}`);
        const uploadTask = uploadBytesResumable(storageRef, newDespesa.arquivo);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Error uploading file:", error);
              reject(new Error('Error uploading file. Please try again.'));
            },
            async () => {
              try {
                arquivoURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              } catch (error) {
                console.error("Error getting file URL:", error);
                reject(new Error('Error processing file. Please try again.'));
              }
            }
          );
        });
      }

      const despesaData = {
        tipo: newDespesa.tipo,
        valor: parseFloat(newDespesa.valor),
        data: newDespesa.data,
        arquivoURL,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userName: userName
      };

      await addDoc(collection(db, 'despesas'), despesaData);

      setSuccess('Expense added successfully!');
      setOpenForm(false);
      setNewDespesa({ tipo: '', valor: '', data: '', arquivo: null });
      await carregarDespesas();
    } catch (error) {
      console.error("Error adding expense:", error);
      setError(error.message || 'Error adding expense. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id, arquivoURL) => {
    try {
      setLoading(true);
      if (arquivoURL) {
        const arquivoRef = ref(storage, arquivoURL);
        await deleteObject(arquivoRef);
      }
      await deleteDoc(doc(db, 'despesas', id));
      setSuccess('Expense deleted successfully!');
      await carregarDespesas();
    } catch (error) {
      setError('Error deleting expense');
      console.error("Error deleting expense:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSuccess('');
    setError('');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <Box sx={{ py: 2, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, px: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'Poppins, sans-serif', ml: 0 }}>
          {t('expenses')}
        </Typography>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenForm(true)}
            sx={{ fontWeight: 'bold' }}
          >
            {t('newExpense')}
          </Button>
        </motion.div>
      </Box>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Search Filters */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList /> {t('searchFilters')}
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small" sx={{ minWidth: 250 }}>
                <InputLabel>{t('person')}</InputLabel>
                <Select
                  value={searchFilters.person}
                  label={t('person')}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, person: e.target.value }))}
                  MenuProps={{ PaperProps: { sx: { minWidth: 250 } } }}
                >
                  <MenuItem value="">{t('all')}</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.name} sx={{ whiteSpace: 'normal' }}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small" sx={{ minWidth: 250 }}>
                <InputLabel>{t('year')}</InputLabel>
                <Select
                  value={searchFilters.year}
                  label={t('year')}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, year: e.target.value }))}
                  MenuProps={{ PaperProps: { sx: { minWidth: 250 } } }}
                >
                  <MenuItem value="">{t('all')}</MenuItem>
                  {years.map((year) => (
                    <MenuItem key={year} value={year} sx={{ whiteSpace: 'normal' }}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small" sx={{ minWidth: 250 }}>
                <InputLabel>{t('month')}</InputLabel>
                <Select
                  value={searchFilters.month}
                  label={t('month')}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, month: e.target.value }))}
                  MenuProps={{ PaperProps: { sx: { minWidth: 250 } } }}
                >
                  <MenuItem value="">{t('all')}</MenuItem>
                  {months.map((month, index) => (
                    <MenuItem key={index} value={index} sx={{ whiteSpace: 'normal' }}>
                      {t('month_' + month.toLowerCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small" sx={{ minWidth: 250 }}>
                <InputLabel>{t('type')}</InputLabel>
                <Select
                  value={searchFilters.type}
                  label={t('type')}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, type: e.target.value }))}
                  MenuProps={{ PaperProps: { sx: { minWidth: 250 } } }}
                >
                  <MenuItem value="">{t('all')}</MenuItem>
                  {expenseTypes.map((type) => (
                    <MenuItem key={type} value={type} sx={{ whiteSpace: 'normal' }}>
                      {t('expenseType_' + type.toLowerCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {filteredDespesas.length > 0 ? (
          <>
            <Grid container spacing={3}>
              <AnimatePresence>
                {filteredDespesas
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((despesa, index) => (
                    <Grid item xs={12} sm={6} md={4} key={despesa.id}>
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Paper
                          elevation={8}
                          sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <Card>
                            <CardContent sx={{ pb: 1 }}>
                              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                                {t('expenseType_' + (['Food','Transport','Accommodation','Other'].includes(despesa.tipo) ? despesa.tipo.toLowerCase() : 'other'))}
                              </Typography>
                              <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>{t('value')}:</strong> {despesa.valor} €
                              </Typography>
                              <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>{t('date')}:</strong> {new Date(despesa.data).toLocaleDateString()}
                              </Typography>
                              {isAdmin && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  <strong>{t('registeredBy')}:</strong> {despesa.userName}
                                </Typography>
                              )}
                              {despesa.arquivoURL && (
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PdfIcon sx={{ color: '#d32f2f' }} />
                                  <Button
                                    variant="text"
                                    color="primary"
                                    onClick={() => window.open(despesa.arquivoURL, '_blank')}
                                    sx={{
                                      textTransform: 'none',
                                      '&:hover': {
                                        backgroundColor: 'rgba(26, 35, 126, 0.04)',
                                      },
                                    }}
                                  >
                                    {t('viewReceipt')}
                                  </Button>
                                </Box>
                              )}
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                              {(isAdmin || despesa.userId === auth.currentUser?.uid) && (
                                <Tooltip title={t('delete')}>
                                  <IconButton
                                    onClick={() => handleDelete(despesa.id, despesa.arquivoURL)}
                                    sx={{
                                      color: '#d32f2f',
                                      '&:hover': {
                                        backgroundColor: 'rgba(211, 47, 47, 0.04)',
                                      },
                                    }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </CardActions>
                          </Card>
                        </Paper>
                      </motion.div>
                    </Grid>
                  ))}
              </AnimatePresence>
            </Grid>
            <TablePagination
              component="div"
              count={filteredDespesas.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[6, 12, 24]}
              labelRowsPerPage={t('rowsPerPage')}
              sx={{
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  lineHeight: '32px',
                  verticalAlign: 'middle',
                },
                '& .MuiInputBase-root': {
                  verticalAlign: 'middle',
                  marginTop: '-6px',
                  transform: 'translateY(-2px)',
                }
              }}
            />
          </>
        ) : (
          <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
            {t('noExpensesFound')}
          </Typography>
        )}

        <Dialog
          open={openForm}
          onClose={() => !loading && setOpenForm(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
            },
          }}
        >
          <DialogTitle sx={{ color: '#1a237e', fontWeight: 'bold' }}>
            {t('newExpense')}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label={t('type')}
                value={newDespesa.tipo}
                onChange={(e) => setNewDespesa(prev => ({ ...prev, tipo: e.target.value }))}
                select
                fullWidth
                required
                error={!newDespesa.tipo && openForm}
                helperText={!newDespesa.tipo && openForm ? t('typeRequired') : ""}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#1a237e',
                    },
                  },
                }}
              >
                <MenuItem value="Food">{t('expenseType_food')}</MenuItem>
                <MenuItem value="Transport">{t('expenseType_transport')}</MenuItem>
                <MenuItem value="Accommodation">{t('expenseType_accommodation')}</MenuItem>
                <MenuItem value="Other">{t('expenseType_other')}</MenuItem>
              </TextField>
              
              <TextField
                label={t('value')}
                type="number"
                value={newDespesa.valor}
                onChange={(e) => setNewDespesa(prev => ({ ...prev, valor: e.target.value }))}
                fullWidth
                required
                error={(!newDespesa.valor || parseFloat(newDespesa.valor) <= 0) && openForm}
                helperText={(!newDespesa.valor || parseFloat(newDespesa.valor) <= 0) && openForm ? t('valueRequired') : ""}
                inputProps={{ min: "0", step: "0.01" }}
                InputProps={{
                  endAdornment: <Typography>€</Typography>,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#1a237e',
                    },
                  },
                }}
              />
              
              <TextField
                label={t('date')}
                type="date"
                value={newDespesa.data}
                onChange={(e) => setNewDespesa(prev => ({ ...prev, data: e.target.value }))}
                fullWidth
                required
                error={!newDespesa.data && openForm}
                helperText={!newDespesa.data && openForm ? t('dateRequired') : ""}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#1a237e',
                    },
                  },
                }}
              />
              
              <Button
                variant="outlined"
                component="label"
                disabled={loading}
                startIcon={<DescriptionIcon />}
                sx={{
                  borderColor: '#1a237e',
                  color: '#1a237e',
                  '&:hover': {
                    borderColor: '#283593',
                    backgroundColor: 'rgba(26, 35, 126, 0.04)',
                  },
                }}
              >
                {newDespesa.arquivo ? newDespesa.arquivo.name : t('attachReceipt')}
                <input
                  type="file"
                  hidden
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </Button>

              {uploadProgress > 0 && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    {Math.round(uploadProgress)}% {t('uploaded')}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setOpenForm(false)}
              disabled={loading}
              sx={{
                color: '#666',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              sx={{
                background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'linear-gradient(45deg, #283593 30%, #1a237e 90%)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t('save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success/Error Messages */}
        <Snackbar 
          open={!!success} 
          autoHideDuration={4000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="success">
            {success}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!error} 
          autoHideDuration={4000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="error">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar open={showAdminSnackbar} autoHideDuration={4000} onClose={() => setShowAdminSnackbar(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setShowAdminSnackbar(false)} severity="info" sx={{ width: '100%' }}>
            {t('adminLoggedIn')}
          </Alert>
        </Snackbar>
      </motion.div>
    </Box>
  );
};

export default Despesas;
