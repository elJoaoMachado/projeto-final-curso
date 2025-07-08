/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

// Notificar admins sobre nova ausência
exports.notifyAdminsOnNewAbsence = onDocumentCreated("ausencias/{docId}", async (event) => {
  const newData = event.data.data();
  const usersSnapshot = await admin.firestore().collection('users').where('isAdmin', '==', true).get();
  const adminEmails = usersSnapshot.docs.map(doc => doc.data().email);
  if (adminEmails.length === 0) return null;
  await admin.firestore().collection('mail').add({
    to: adminEmails,
    message: {
      subject: 'Nova ausência registrada',
      text: `O usuário ${newData.nome} registrou uma ausência em ${newData.data}.`,
      html: `<p>O usuário <strong>${newData.nome}</strong> registrou uma ausência em <strong>${newData.data}</strong>.</p>`
    }
  });
  return null;
});

// Notificar admins sobre nova despesa
exports.notifyAdminsOnNewExpense = onDocumentCreated("despesas/{docId}", async (event) => {
  const newData = event.data.data();
  const usersSnapshot = await admin.firestore().collection('users').where('isAdmin', '==', true).get();
  const adminEmails = usersSnapshot.docs.map(doc => doc.data().email);
  if (adminEmails.length === 0) return null;
  await admin.firestore().collection('mail').add({
    to: adminEmails,
    message: {
      subject: 'Nova despesa registrada',
      text: `O usuário ${newData.nome || newData.userName || 'Desconhecido'} registrou uma despesa de ${newData.valor}€ em ${newData.data}.`,
      html: `<p>O usuário <strong>${newData.nome || newData.userName || 'Desconhecido'}</strong> registrou uma despesa de <strong>${newData.valor}€</strong> em <strong>${newData.data}</strong>.</p>`
    }
  });
  return null;
});

// Notificar admins sobre novo relatório
exports.notifyAdminsOnNewReport = onDocumentCreated("relatorios/{docId}", async (event) => {
  const newData = event.data.data();
  const usersSnapshot = await admin.firestore().collection('users').where('isAdmin', '==', true).get();
  const adminEmails = usersSnapshot.docs.map(doc => doc.data().email);
  if (adminEmails.length === 0) return null;
  
  const uploadDate = new Date(newData.uploadedAt).toLocaleString('pt-BR');
  
  await admin.firestore().collection('mail').add({
    to: adminEmails,
    message: {
      subject: 'Novo relatório enviado',
      text: `Um novo relatório foi enviado por ${newData.nome || 'Desconhecido'}. Arquivo: ${newData.fileName || 'Sem nome'}. Data: ${uploadDate}.`,
      html: `
        <p>Um novo relatório foi enviado por <strong>${newData.nome || 'Desconhecido'}</strong>.</p>
        <p><strong>Arquivo:</strong> ${newData.fileName || 'Sem nome'}</p>
        <p><strong>Data de envio:</strong> ${uploadDate}</p>
      `
    }
  });
  return null;
});
