import {useState} from "react";
import {createContext} from "react";

const initialState = {
  token: "",
  isError: false,
  errorMessage: "",
  userId: "",
  userName: "",
  email: "",
  isAuthenticated: false,
}

export const VisibilityContext = createContext({});

const Provider = props => {

  return (
    <VisibilityContext.Provider value={value}>
      {props.children}
    </VisibilityContext.Provider>
  );
};

export default Provider
