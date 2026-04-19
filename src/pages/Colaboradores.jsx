import * as React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Switch, FormControlLabel, Snackbar, Alert,
  TablePagination, Box, Typography, Chip
} from '@mui/material';
import { Edit, Delete, Search } from '@mui/icons-material';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { useTranslation } from 'react-i18next';


function Colaboradores() {
  const [rows, setRows] = React.useState([]);
  const [filteredRows, setFilteredRows] = React.useState([]);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [newEmployee, setNewEmployee] = React.useState(null);
  const [employeeToDelete, setEmployeeToDelete] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const navigate = useNavigate();
  const departamentos = ['HR', 'Finance', 'Technology'];
  const [showAdminSnackbar, setShowAdminSnackbar] = React.useState(false);
  const { t } = useTranslation();


  // Load employees from the 'users' collection
  const fetchEmployees = React.useCallback(async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const allUsers = querySnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    setRows(allUsers);
    setFilteredRows(allUsers);
  }, []);

  // Check if the user is an admin
  const checkAdminAccess = React.useCallback(async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      setIsAdmin(userData.isAdmin === true);
    } else {
      setError(t('accountNotRegisteredInDatabase'));
      navigate('/perfil');
    }
  }, [navigate, t]);

  React.useEffect(() => {
    checkAdminAccess();
    fetchEmployees();
    // Check if the admin just logged in
    if (localStorage.getItem('adminJustLoggedIn') === 'true') {
      setShowAdminSnackbar(true);
      localStorage.removeItem('adminJustLoggedIn');
    }
  }, [checkAdminAccess, fetchEmployees, navigate]);

  // Filter rows based on search term
  React.useEffect(() => {
    const filtered = rows.filter(row =>
      row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.Department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRows(filtered);
    setPage(0);
  }, [searchTerm, rows]);

  const handleAddEmployee = async () => {
    if (!newEmployee?.email || !newEmployee?.name) {
      setError(t('nameAndEmailRequired'));
      return;
    }
    
    const auth = getAuth();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newEmployee.email, newEmployee.password);
      const user = userCredential.user;

      await addDoc(collection(db, 'users'), {
        ...newEmployee,
        uid: user.uid, 
        isAdmin: false
      });

      setNewEmployee(null);
      await fetchEmployees();
      setSuccess(t('employeeAddedSuccessfully'));
    } catch (error) {
      console.error("Error creating employee:", error.code, error.message);
      setError(t('errorCreatingEmployee', { message: error.message }));
    }
  };

  const handleSave = async () => {
    try {
      const ref = doc(db, 'users', selectedEmployee.docId);
      await updateDoc(ref, { ...selectedEmployee });
      setSelectedEmployee(null);
      await fetchEmployees();
      setSuccess(t('employeeUpdatedSuccessfully'));
    } catch (error) {
      setError(t('errorUpdatingEmployee'));
    }
  };

  const handleDelete = async () => {
    try {
      const ref = doc(db, 'users', employeeToDelete.docId);
      await deleteDoc(ref);
      setEmployeeToDelete(null);
      await fetchEmployees();
      setSuccess(t('employeeDeletedSuccessfully'));
    } catch (err) {
      console.error("Error deleting employee:", err);
      setError(t('errorDeletingEmployee'));
    }
  };

  const handleToggleAdmin = async (employee) => {
    try {
      const ref = doc(db, 'users', employee.docId);
      await updateDoc(ref, { isAdmin: !employee.isAdmin });
      await fetchEmployees();
      setSuccess(employee.isAdmin ? t('adminStatusRemovedSuccessfully') : t('adminStatusGrantedSuccessfully'));
    } catch (error) {
      setError(t('errorUpdatingAdminStatus'));
    }
  };

  const handleEditChange = (field, value) => {
    setSelectedEmployee(prev => ({ ...prev, [field]: value }));
  };

  const handleNewEmployeeChange = (field, value) => {
    setNewEmployee(prev => ({ ...prev, [field]: value }));
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

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, px: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'Poppins, sans-serif', ml: 0 }}>
          {t('employees')}
        </Typography>
        {isAdmin && (
          <Button 
            variant="contained" 
            onClick={() => setNewEmployee({ name: '', email: '', date: '', Department: '', contractType: '', password: '' })}
            sx={{ fontWeight: 'bold', fontFamily: 'Poppins, sans-serif' }}
          >
            {t('addEmployee')}
          </Button>
        )}
      </Box>

      {/* Search Bar */}
      <Box mb={2}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={t('searchByNameEmailOrDepartment')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          size="small"
        />
      </Box>

      {newEmployee && (
        <Dialog open onClose={() => setNewEmployee(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('newEmployee')}</DialogTitle>
          <DialogContent>
            <TextField 
              label={t('name')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.name} 
              onChange={(e) => handleNewEmployeeChange('name', e.target.value)} 
            />
            <TextField 
              label={t('email')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.email} 
              onChange={(e) => handleNewEmployeeChange('email', e.target.value)} 
            />
            <TextField 
              label={t('admissionDate')} 
              fullWidth 
              margin="dense" 
              type="date" 
              value={newEmployee.date} 
              onChange={(e) => handleNewEmployeeChange('date', e.target.value)} 
              InputLabelProps={{ shrink: true }} 
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="departamento-label">{t('department')}</InputLabel>
              <Select 
                labelId="departamento-label" 
                value={newEmployee.Department} 
                label={t('department')} 
                onChange={(e) => handleNewEmployeeChange('Department', e.target.value)}
              >
                {departamentos.map((dep) => (
                  <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              label={t('password')} 
              fullWidth 
              margin="dense" 
              type="password" 
              value={newEmployee.password || ''} 
              onChange={(e) => handleNewEmployeeChange('password', e.target.value)} 
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewEmployee(null)}>{t('cancel')}</Button>
            <Button onClick={handleAddEmployee}>{t('add')}</Button>
          </DialogActions>
        </Dialog>
      )}

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('name')}</TableCell>
              <TableCell>{t('email')}</TableCell>
              <TableCell>{t('admissionDate')}</TableCell>
              <TableCell>{t('department')}</TableCell>
              <TableCell>{t('admin')}</TableCell>
              {isAdmin && <TableCell align="right">{t('actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow key={row.docId}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.Department || t('notAssigned')} 
                      size="small" 
                      color={row.Department ? "primary" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={row.isAdmin || false}
                            onChange={() => handleToggleAdmin(row)}
                            color="primary"
                          />
                        }
                        label={row.isAdmin ? t('yes') : t('no')}
                      />
                    ) : (
                      <Chip 
                        label={row.isAdmin ? t('yes') : t('no')} 
                        size="small" 
                        color={row.isAdmin ? "success" : "default"}
                      />
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <IconButton onClick={() => setSelectedEmployee(row)}>
                        <Edit />
                      </IconButton>
                      <IconButton 
                        sx={{ color: 'red' }} 
                        onClick={() => setEmployeeToDelete(row)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
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
      </TableContainer>

      {/* Edit Dialog */}
      {selectedEmployee && (
        <Dialog open onClose={() => setSelectedEmployee(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('editEmployee')}</DialogTitle>
          <DialogContent>
            <TextField 
              label={t('name')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.name} 
              onChange={(e) => handleEditChange('name', e.target.value)} 
            />
            <TextField 
              label={t('email')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.email} 
              onChange={(e) => handleEditChange('email', e.target.value)} 
            />
            <TextField 
              label={t('admissionDate')} 
              fullWidth 
              margin="dense" 
              type="date" 
              value={selectedEmployee.date} 
              onChange={(e) => handleEditChange('date', e.target.value)} 
              InputLabelProps={{ shrink: true }} 
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="edit-departamento-label">{t('department')}</InputLabel>
              <Select 
                labelId="edit-departamento-label" 
                value={selectedEmployee.Department} 
                label={t('department')} 
                onChange={(e) => handleEditChange('Department', e.target.value)}
              >
                {departamentos.map((dep) => (
                  <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedEmployee(null)}>{t('cancel')}</Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {employeeToDelete && (
        <Dialog open onClose={() => setEmployeeToDelete(null)}>
          <DialogTitle>{t('deleteEmployee')}</DialogTitle>
          <DialogContent>
            {t('areYouSureYouWantToDeleteThisEmployee')}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmployeeToDelete(null)}>{t('cancel')}</Button>
            <Button onClick={handleDelete} color="error">{t('yesDelete')}</Button>
          </DialogActions>
        </Dialog>
      )}

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
          {t('youAreLoggedInAsAdmin')}
        </Alert>
      </Snackbar>
    </>
  );
}

export default Colaboradores;