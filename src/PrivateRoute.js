import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Exibe um carregamento enquanto verifica a autenticação
  }

  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;